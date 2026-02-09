import fs from 'fs';
import { exec } from 'child_process';
import { Dropbox } from 'dropbox';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { logger } from './logger.js';
import cron from 'node-cron';
import path from 'path';
import axios from 'axios';

dotenv.config();

const DB_URL = process.env.DATABASE_URL;
const pgDumpPath = process.env.PG_DUMP_PATH;
const DROPBOX_REFRESH_TOKEN = process.env.DROPBOX_REFRESH_TOKEN;
const DROPBOX_CLIENT_ID = process.env.DROPBOX_CLIENT_ID;
const DROPBOX_CLIENT_SECRET = process.env.DROPBOX_CLIENT_SECRET;

let cachedToken = null;

const validVariables = () => {
  let valid = true;

  if (!DB_URL) {
    logger.error('[VALIDATION] DATABASE_URL não está definido.');
    valid = false;
  }
  if (!pgDumpPath) {
    logger.error('[VALIDATION] PG_DUMP_PATH não está definido.');
    valid = false;
  }
  if (!DROPBOX_REFRESH_TOKEN) {
    logger.error('[VALIDATION] DROPBOX_REFRESH_TOKEN não está definido.');
    valid = false;
  }
  if (!DROPBOX_CLIENT_ID || !DROPBOX_CLIENT_SECRET) {
    logger.error('[VALIDATION] DROPBOX_CLIENT_ID ou DROPBOX_CLIENT_SECRET não estão definidos.');
    valid = false;
  }

  return valid;
};

const getDropboxAccessToken = async () => {
  const res = await axios.post("https://api.dropbox.com/oauth2/token", null, {
    params: {
      grant_type: "refresh_token",
      refresh_token: DROPBOX_REFRESH_TOKEN,
      client_id: DROPBOX_CLIENT_ID,
      client_secret: DROPBOX_CLIENT_SECRET
    }
  });

  return res.data.access_token;
};

const getDropboxClient = async (forceRefresh = false) => {
  if (!cachedToken || forceRefresh) {
    cachedToken = await getDropboxAccessToken();
  }

  return new Dropbox({ accessToken: cachedToken, fetch });
};

const generateBackup = async () => {
  if (!validVariables()) return null;

  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const hour = now.toTimeString().slice(0, 5).replace(':', '-');
  const filename = `backup-${day}_${hour}.backup`;
  const localPath = path.join('./backups', filename);

  logger.info(`[BACKUP] Iniciando backup: ${filename}`);

  try {
    await new Promise((resolve, reject) => {
      const command = `"${pgDumpPath}" -Fc -f "${localPath}" "${DB_URL}"`;
      exec(command, (err, stdout, stderr) => {
        if (stderr) logger.warn('[PG_DUMP WARNING]', stderr);
        if (err) {
          logger.error('[PG_DUMP ERROR]', err);
          return reject(err);
        }
        logger.info('[PG_DUMP] Backup gerado com sucesso!');
        resolve();
      });
    });

    return { filename, localPath };
  } catch (err) {
    logger.error('[BACKUP GENERATE] Falha ao gerar dump do Postgres:', err);
    return null;
  }
};

const uploadToDropbox = async (filename, localPath) => {
  try {
    let dbx = await getDropboxClient();

    const fileContent = await fs.promises.readFile(localPath);

    try {
      await dbx.filesUpload({
        path: `/backups/${filename}`,
        contents: fileContent,
        mode: 'overwrite'
      });
    } catch (err) {
      if (err?.status === 401) {
        logger.warn('[DROPBOX] Token expirado, renovando...');
        dbx = await getDropboxClient(true);

        await dbx.filesUpload({
          path: `/backups/${filename}`,
          contents: fileContent,
          mode: 'overwrite'
        });
      } else {
        throw err;
      }
    }

    logger.info(`[DROPBOX] Backup ${filename} enviado com sucesso!`);
  } catch (err) {
    logger.error('[DROPBOX UPLOAD] Falha ao enviar arquivo para Dropbox:', err);
    throw err;
  }
};

const backup = async () => {
  try {
    const backupData = await generateBackup();
    if (!backupData) {
      logger.error('[BACKUP] Backup não gerado, abortando upload.');
      return;
    }

    const { filename, localPath } = backupData;
    await uploadToDropbox(filename, localPath);
  } catch (err) {
    logger.error('[BACKUP] Erro geral no processo de backup:', err);
  }
};

backup();

cron.schedule(
  '0 0 * * *',
  () => {
    logger.info('[CRON] Iniciando tarefa agendada de backup...');
    backup();
  },
  {
    timezone: 'America/Sao_Paulo'
  }
);
