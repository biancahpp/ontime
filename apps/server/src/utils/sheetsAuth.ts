import { sheets, sheets_v4 } from '@googleapis/sheets';
import { writeFile } from 'fs/promises';
import { readFileSync } from 'fs';
import { OAuth2Client } from 'google-auth-library';
import http from 'http';
import { DatabaseModel, SheetState, LogOrigin } from 'ontime-types';
import { join } from 'path';
import { URL } from 'url';
import { logger } from '../classes/Logger.js';
import { DataProvider } from '../classes/data-provider/DataProvider.js';
import { getAppDataPath } from '../setup.js';
import { ensureDirectory } from './fileManagement.js';
import { cellRequenstFromEvent, cellRequenstFromProjectData, getA1Notation } from './sheetUtils.js';
import { parseExcel } from './parser.js';
import { parseProject, parseRundown, parseUserFields } from './parserFunctions.js';

type ResponseOK = {
  data: Partial<DatabaseModel>;
};

class sheet {
  private static client: null | OAuth2Client = null;
  private readonly scope = 'https://www.googleapis.com/auth/spreadsheets';
  private readonly sheetsFolder: string;
  private readonly clientSecretFile: string;
  private static clientSecret = null;
  private static authUrl: null | string = null;

  constructor() {
    const appDataPath = getAppDataPath();
    if (appDataPath === '') {
      throw new Error('Sheet: Could not resolve sheet folser');
    }
    this.sheetsFolder = join(appDataPath, 'sheets');
    this.clientSecretFile = join(this.sheetsFolder, 'client_secret.json');
    ensureDirectory(this.sheetsFolder);
    try {
      sheet.clientSecret = JSON.parse(readFileSync(this.clientSecretFile, 'utf-8'));
    } catch (_) {
      /* empty - it is ok thet there is no clientSecret */
    }
  }

  public async getSheetState(id: string, worksheet: string): Promise<SheetState> {
    const state: SheetState = {
      secret: false,
      auth: false,
      id: false,
      worksheet: false,
      worksheetOptions: [],
    };

    state.secret = sheet.clientSecret !== null;
    state.auth = sheet.client !== null;

    if (id != '' && state.auth) {
      const spreadsheets = await sheets({ version: 'v4', auth: sheet.client })
        .spreadsheets.get({
          spreadsheetId: id,
          includeGridData: false,
        })
        .catch((err) => {
          logger.error(LogOrigin.Server, `Sheet: faild to load sheet ${err}`);
        });
      if (!spreadsheets || spreadsheets.status != 200) {
        return state;
      }
      state.id = true;
      state.worksheetOptions = spreadsheets.data.sheets.map((i) => i.properties.title);
      state.worksheet = state.worksheetOptions.indexOf(worksheet) >= 0;
    }
    return state;
  }

  /**
   * test existence of sheet and worksheet
   * @param {string} sheetId - https://docs.google.com/spreadsheets/d/[[spreadsheetId]]/edit#gid=0
   * @param {string} worksheet - the name of the worksheet containing ontime data
   * @returns {Promise<{worksheetId: number, range: string}>} - id of worksheet and rage of worksheet
   * @throws
   */
  private async exist(sheetId: string, worksheet: string): Promise<{ worksheetId: number; range: string }> {
    const spreadsheets = await sheets({ version: 'v4', auth: sheet.client }).spreadsheets.get({
      spreadsheetId: sheetId,
    });

    if (spreadsheets.status === 200) {
      const ourWorksheetData = spreadsheets.data.sheets.find((n) => n.properties.title == worksheet);
      if (ourWorksheetData !== undefined) {
        const endCell = getA1Notation(
          ourWorksheetData.properties.gridProperties.rowCount,
          ourWorksheetData.properties.gridProperties.columnCount,
        );
        return { worksheetId: ourWorksheetData.properties.sheetId, range: `${worksheet}!A1:${endCell}` };
      }
    } else {
      throw new Error('Uable to open spreadsheets');
    }
  }

  /**
   * push rundown and project data to sheet
   * @param {string} id - id of the sheet https://docs.google.com/spreadsheets/d/[[spreadsheetId]]/edit#gid=0
   * @param {string} worksheet - the name of the worksheet containing ontime data
   * @throws
   */
  public async push(id: string, worksheet: string) {
    const { worksheetId, range } = await this.exist(id, worksheet);

    const rq = await sheets({ version: 'v4', auth: sheet.client }).spreadsheets.values.get({
      spreadsheetId: id,
      valueRenderOption: 'FORMATTED_VALUE',
      majorDimension: 'ROWS',
      range: range,
    });
    if (rq.status === 200) {
      const { rundownMetadata, projectMetadata } = parseExcel(rq.data.values);
      const rundown = DataProvider.getRundown();
      const projectData = DataProvider.getProjectData();
      const titleRow = Object.values(rundownMetadata)[0]['row'];

      const updateRundown = Array<sheets_v4.Schema$Request>();

      // we can't delete the last unflozzen row so we create an empty one
      updateRundown.push({
        insertDimension: {
          inheritFromBefore: false,
          range: {
            dimension: 'ROWS',
            startIndex: titleRow + 1,
            endIndex: titleRow + 2,
            sheetId: worksheetId,
          },
        },
      });
      //and delete the rest
      updateRundown.push({
        deleteDimension: { range: { dimension: 'ROWS', startIndex: titleRow + 2, sheetId: worksheetId } },
      });
      // insert the lenght of the rundown
      updateRundown.push({
        insertDimension: {
          inheritFromBefore: false,
          range: {
            dimension: 'ROWS',
            startIndex: titleRow + 1,
            endIndex: titleRow + rundown.length,
            sheetId: worksheetId,
          },
        },
      });

      //update the corresponding row with event data
      rundown.forEach((entry, index) =>
        updateRundown.push(cellRequenstFromEvent(entry, index, worksheetId, rundownMetadata)),
      );

      //update project data
      updateRundown.push(cellRequenstFromProjectData(projectData, worksheetId, projectMetadata));

      const writeResponds = await sheets({ version: 'v4', auth: sheet.client }).spreadsheets.batchUpdate({
        spreadsheetId: id,
        requestBody: {
          includeSpreadsheetInResponse: false,
          responseRanges: [range],
          requests: updateRundown,
        },
      });

      if (writeResponds.status == 200) {
        logger.info(LogOrigin.Server, `Sheet: write: ${writeResponds.statusText}`);
      } else {
        throw new Error(`Sheet: write faild: ${writeResponds.statusText}`);
      }
    } else {
      throw new Error(`Sheet: read faild: ${rq.statusText}`);
    }
  }

  /**
   * pull rundown and project data to sheet
   * @param {string} id - id of the sheet https://docs.google.com/spreadsheets/d/[[spreadsheetId]]/edit#gid=0
   * @param {string} worksheet - the name of the worksheet containing ontime data
   * @returns {Promise<Partial<ResponseOK>>}
   * @throws
   */
  public async pull(id: string, worksheet: string): Promise<Partial<ResponseOK>> {
    const { range } = await this.exist(id, worksheet);

    const res: Partial<ResponseOK> = {};

    const rq = await sheets({ version: 'v4', auth: sheet.client }).spreadsheets.values.get({
      spreadsheetId: id,
      valueRenderOption: 'FORMATTED_VALUE',
      majorDimension: 'ROWS',
      range,
    });

    if (rq.status === 200) {
      res.data = {};
      const dataFromSheet = parseExcel(rq.data.values);
      res.data.rundown = parseRundown(dataFromSheet);
      if (res.data.rundown.length < 1) {
        throw new Error(`Sheet: Could not find data to import in the worksheet`);
      }
      res.data.project = parseProject(dataFromSheet);
      res.data.userFields = parseUserFields(dataFromSheet);
      return res;
    } else {
      throw new Error(`Sheet: read faild: ${rq.statusText}`);
    }
  }

  /**
   * saves secrets object to appdata path as client_secret.json
   * @param {object} secrets
   * @throws
   */
  public async saveClientSecrets(secrets: object) {
    sheet.client = null;
    sheet.authUrl = null;
    sheet.clientSecret = null;
    if (
      !('client_id' in secrets['installed']) ||
      !('project_id' in secrets['installed']) ||
      !('auth_uri' in secrets['installed']) ||
      !('token_uri' in secrets['installed']) ||
      !('auth_provider_x509_cert_url' in secrets['installed']) ||
      !('client_secret' in secrets['installed']) ||
      !('redirect_uris' in secrets['installed'])
    ) {
      throw new Error('Sheet: Client secret is missing some keys');
    }
    await writeFile(this.clientSecretFile, JSON.stringify(secrets), 'utf-8').catch((err) =>
      logger.error(LogOrigin.Server, `${err}`),
    );
    sheet.clientSecret = secrets;
  }

  private authServerTimeout;
  /**
   * create local Auth Server
   * @returns {Promise<string | null>} - returns url path serve on success
   * @throws
   */
  public async openAuthServer(): Promise<string | null> {
    //TODO: this only works on local networks

    // if the server is allready running retun it
    if (sheet.authUrl) {
      clearTimeout(this.authServerTimeout);
      this.authServerTimeout = setTimeout(
        () => {
          sheet.authUrl = null;
          server.unref;
        },
        2 * 60 * 1000,
      );
      return sheet.authUrl;
    }

    // Check that Secret is valid
    const keyFile = sheet.clientSecret;
    const keys = keyFile.installed || keyFile.web;
    if (!keys.redirect_uris || keys.redirect_uris.length === 0) {
      throw new Error('Sheet: Missing redirect URI');
    }
    const redirectUri = new URL(keys.redirect_uris[0]);
    if (redirectUri.hostname !== 'localhost') {
      throw new Error('Sheet: Invalid redirect URI');
    }

    // create an oAuth client to authorize the API call
    const client = new OAuth2Client({
      clientId: keys.client_id,
      clientSecret: keys.client_secret,
    });

    // start the server that will recive the codes
    const server = http.createServer(async (req, res) => {
      try {
        const serverUrl = new URL(req.url, 'http://localhost:3000');
        if (serverUrl.pathname !== redirectUri.pathname) {
          res.end('Invalid callback URL');
          return;
        }
        const searchParams = serverUrl.searchParams;
        if (searchParams.has('error')) {
          res.end('Authorization rejected.');
          logger.info(LogOrigin.Server, `Sheet: ${searchParams.get('error')}`);
          return;
        }
        if (!searchParams.has('code')) {
          res.end('No authentication code provided.');
          logger.info(LogOrigin.Server, `Sheet: Cannot read authentication code`);
          return;
        }
        const code = searchParams.get('code');
        const { tokens } = await client.getToken({
          code,
          redirect_uri: redirectUri.toString(),
        });
        client.credentials = tokens;
        sheet.client = client;
        res.end('Authentication successful! Please close this tab and return to OnTime.');
        logger.info(LogOrigin.Server, `Sheet: Authentication successful`);
      } catch (e) {
        logger.error(LogOrigin.Server, `Sheet: ${e}`);
      } finally {
        server.close();
      }
    });
    let listenPort = 3000;
    if (keyFile.installed) {
      // Use emphemeral port if not a web client
      listenPort = 0;
    } else if (redirectUri.port !== '') {
      listenPort = Number(redirectUri.port);
    }
    //TODO: the server might not start correctly
    server.listen(listenPort);
    const address = server.address();
    if (typeof address !== 'string') {
      redirectUri.port = String(address.port);
    }
    // open the browser to the authorize url to start the workflow
    const authorizeUrl = client.generateAuthUrl({
      redirect_uri: redirectUri.toString(),
      access_type: 'offline',
      scope: this.scope,
    });
    sheet.authUrl = authorizeUrl;
    this.authServerTimeout = setTimeout(
      () => {
        sheet.authUrl = null;
        server.unref();
      },
      2 * 60 * 1000,
    );
    return authorizeUrl;
  }
}

export const Sheet = new sheet();