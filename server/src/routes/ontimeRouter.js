import express from 'express';
import uploadJson from '../utils/upload.js';
export const router = express.Router();

import {
  dbDownload,
  dbUpload,
  dbPathToUpload,
} from '../controllers/ontimeController.js';

// create route between controller and '/ontime/db' endpoint
router.get('/db', dbDownload);

// create route between controller and '/ontime/db' endpoint
router.post('/db', uploadJson, dbUpload);

// create route between controller and '/ontime/dbpath' endpoint
router.post('/dbpath', dbPathToUpload);