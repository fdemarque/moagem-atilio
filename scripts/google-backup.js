import fs from 'node:fs/promises';
import {googleAccessTokenProvider} from '../server/google-auth.js';
import {createGoogleBackup} from '../server/google-backup.js';

const file=process.argv[2];
if(!file) throw new Error('Informe o caminho do JSON a conferir e salvar.');
const getAccessToken=googleAccessTokenProvider({clientId:process.env.GOOGLE_CLIENT_ID,clientSecret:process.env.GOOGLE_CLIENT_SECRET,refreshToken:process.env.GOOGLE_REFRESH_TOKEN});
const backup=createGoogleBackup({getAccessToken,expectedAccount:process.env.GOOGLE_BACKUP_ACCOUNT});
const document=JSON.parse(await fs.readFile(file,'utf8'));
const result=await backup.saveSnapshot(document);
console.log(JSON.stringify({verified:result.verified,clients:document.payload.clientes.length,movements:document.payload.movimentacoes.length,folder:`https://drive.google.com/drive/folders/${result.folders.root}`,spreadsheet:`https://docs.google.com/spreadsheets/d/${result.spreadsheetId}`,json:`https://drive.google.com/file/d/${result.jsonId}/view`},null,2));
