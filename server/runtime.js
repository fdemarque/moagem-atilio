import { blobFiles } from './blob-files.js';
import { createGoogleBackup } from './google-backup.js';
import { googleAccessTokenProvider } from './google-auth.js';
import { createDocumentStore } from './document-store.js';

let runtime;
export function getRuntime() {
  if(runtime) return runtime;
  if(!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) throw new Error('Armazenamento privado ainda não configurado.');
  const googleBackup=createGoogleBackup({expectedAccount:process.env.GOOGLE_BACKUP_ACCOUNT,getAccessToken:googleAccessTokenProvider({clientId:process.env.GOOGLE_CLIENT_ID,clientSecret:process.env.GOOGLE_CLIENT_SECRET,refreshToken:process.env.GOOGLE_REFRESH_TOKEN})});
  const files=blobFiles(); runtime={files,store:createDocumentStore({files,googleBackup})}; return runtime;
}
