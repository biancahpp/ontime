import { RequestHandler } from 'express';

import { CustomFieldDefinitions, ProjectData } from 'ontime-types';

import { removeUndefined } from '../utils/parserUtils.js';
import { failEmptyObjects } from '../utils/routerUtils.js';
import { DataProvider } from '../classes/data-provider/DataProvider.js';
import { generateId } from 'ontime-utils';

// Create controller for GET request to 'project'
export const getProject: RequestHandler = async (req, res) => {
  res.json(DataProvider.getProjectData());
};

// Create controller for POST request to 'project'
export const postProject: RequestHandler = async (req, res) => {
  if (failEmptyObjects(req.body, res)) {
    return;
  }

  try {
    const newEvent: Partial<ProjectData> = removeUndefined({
      title: req.body?.title,
      description: req.body?.description,
      publicUrl: req.body?.publicUrl,
      publicInfo: req.body?.publicInfo,
      backstageUrl: req.body?.backstageUrl,
      backstageInfo: req.body?.backstageInfo,
      endMessage: req.body?.endMessage,
      customFields: req.body?.customFields,
    });
    const newData = await DataProvider.setProjectData(newEvent);
    res.status(200).send(newData);
  } catch (error) {
    res.status(400).send({ message: error.toString() });
  }
};

export const getCustomFields: RequestHandler = async (req, res) => {
  res.json(DataProvider.getCustomField());
};

//Expects {lable:'name for the Field', type: 'string | ..'}
export const postCustomFields: RequestHandler = async (req, res) => {
  if (failEmptyObjects(req.body, res)) {
    return;
  }
  //TODO: validate
  //TODO: disallow duplicates
  try {
    const fieldId = generateId();
    const newField: CustomFieldDefinitions = {};
    Object.assign(newField, { [fieldId]: req.body });
    const newFields = await DataProvider.setCustomField(newField);
    res.json(newFields);
  } catch (error) {
    res.status(400).send({ message: error.toString() });
  }
};
