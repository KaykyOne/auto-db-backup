// backup.js
import fs from 'fs';
import { exec } from 'child_process';
import { Dropbox } from 'dropbox';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const DROPBOX_TOKEN = process.env.DROPBOX_TOKEN;
const DB_URL = process.env.DATABASE_URL; // Ex: postgres://user:pass@host:5432/db

const dbx = new Dropbox({ accessToken: DROPBOX_TOKEN, fetch });

async function backup() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.sql`;
    const localPath = `/tmp/${filename}`;

    // 1️⃣ Gerar dump do Postgres
    await new Promise((resolve, reject) => {
      exec(`pg_dump ${DB_URL} > ${localPath}`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // 2️⃣ Listar arquivos no Dropbox
    const list = await dbx.filesListFolder({ path: '/backups' });
    const files = list.result.entries.sort((a, b) => a.server_modified.localeCompare(b.server_modified));

    // 3️⃣ Se tiver 10 ou mais, apagar o mais velho
    if (files.length >= 10) {
      await dbx.filesDeleteV2({ path: files[0].path_lower });
    }

    // 4️⃣ Upload do novo backup
    const fileContent = fs.readFileSync(localPath);
    await dbx.filesUpload({
      path: `/backups/${filename}`,
      contents: fileContent
    });

    console.log('Backup enviado com sucesso!');

    // 5️⃣ Limpeza local
    fs.unlinkSync(localPath);

  } catch (err) {
    console.error('Erro no backup:', err);
  }
}

// Rodar backup
backup();
