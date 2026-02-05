// backup.js
import fs from 'fs';
import { exec } from 'child_process';
import { Dropbox } from 'dropbox';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { logger } from './logger.js';
import cron from 'node-cron';

dotenv.config();

const DROPBOX_TOKEN = process.env.DROPBOX_TOKEN;
const DB_URL = process.env.DATABASE_URL;

const dbx = new Dropbox({ accessToken: DROPBOX_TOKEN, fetch });
const pgDumpPath = `"${process.env.PG_DUMP_PATH}"`;

const generateBackup = async () => {
    try {
        const time = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        const hour = time.split(" ")[1].split(":");
        const day = time.split(" ")[0].replace(/\//g, '-').replace(',', '');

        const hours = `${hour[0]}-${hour[1]}`;
        console.log(`Iniciando backup em: ${time}`);
        const timestamp = `day${day}_hour${hours}`;
        const filename = `backup-${timestamp}.backup`;
        const localPath = `./backups/${filename}`;

        // 1️⃣ Gerar dump do Postgres
        await new Promise((resolve, reject) => {
            exec(`${pgDumpPath} -Fc -f ${localPath} ${DB_URL}`, (err, stdout, stderr) => {
                if (err) return reject(err);
                logger.info('Backup gerado com sucesso!');
                resolve();
            });
        });

        return { filename, localPath };
    } catch (error) {
        logger.error('Erro ao gerar backup:', error);
    }
};

const validVariables = () => {
    if (!DROPBOX_TOKEN) {
        logger.error('Variável de ambiente DROPBOX_TOKEN não está definida.');
        return false;
    }
    if (!DB_URL) {
        logger.error('Variável de ambiente DATABASE_URL não está definida.');
        return false;
    }
    return true;
};

async function backup() {
    try {

        if (!validVariables()) return;

        const backupData = await generateBackup();

        if (!backupData) return;

        const { filename, localPath } = backupData;

        if (!filename || !localPath) {
            logger.error('Nome do arquivo ou caminho local inválido.');
            return;
        }

        const fileContent = await fs.promises.readFile(localPath);
        await dbx.filesUpload({
            path: `/backups/${filename}`,
            contents: fileContent,
            mode: 'overwrite'
        });

        logger.info(`Backup ${filename} enviado para o Dropbox com sucesso!`);

    } catch (err) {
        logger.error('Erro no processo de backup:', err);
    }
};

backup();

cron.schedule(
    '0 0 * * *',
    () => {
        logger.info('Iniciando tarefa agendada de backup...');
        backup();
    },
    {
        timezone: 'America/Sao_Paulo'
    }
);


