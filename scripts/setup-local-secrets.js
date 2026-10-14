import fs from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
let env='';try{env=await fs.readFile('.env.local','utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
for(const key of ['MOAGEM_PASSWORD','SESSION_SECRET','CRON_SECRET']) {
  if(!new RegExp(`^${key}=.+$`,'m').test(env)) env+=`\n${key}=${JSON.stringify(randomBytes(32).toString('base64url'))}\n`;
}
await fs.writeFile('.env.local',env,{mode:0o600});
const password=JSON.parse(env.match(/^MOAGEM_PASSWORD=(.+)$/m)[1]);
await fs.mkdir('backups',{recursive:true});
await fs.writeFile('backups/acesso-aparelhos.txt',`Código do responsável para conectar novos aparelhos:\n${password}\n\nNão publicar nem enviar ao GitHub. O aparelho lembra a conexão por um ano.\n`,{mode:0o600});
console.log('Segredos criados somente no arquivo local ignorado. Código do responsável em backups/acesso-aparelhos.txt.');
