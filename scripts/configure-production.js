import {spawn} from 'node:child_process';
const keys=['BLOB_READ_WRITE_TOKEN','MOAGEM_PASSWORD','SESSION_SECRET','CRON_SECRET','GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET','GOOGLE_REFRESH_TOKEN','GOOGLE_BACKUP_ACCOUNT'];
for(const project of ['moagem-atilio','fdemarque-moagem-atilio']) {
  for(const key of keys) {
    if(!process.env[key])throw new Error(`Configuração local ausente: ${key}`);
    const command=`npx.cmd --yes vercel@64.0.2 env add ${key} production --type ${key==='GOOGLE_BACKUP_ACCOUNT'?'config':'secret'} --force --yes --project ${project} --scope fsdemarque-1851s-projects`;
    await new Promise((resolve,reject)=>{
      const child=spawn(command,{shell:true,stdio:['pipe','pipe','pipe']});
      child.stdout.resume();child.stderr.resume();
      child.on('error',()=>reject(new Error(`Não foi possível configurar ${project}: ${key}`)));
      child.on('exit',code=>code===0?resolve():reject(new Error(`Configuração recusada em ${project}: ${key}`)));
      child.stdin.end(process.env[key]);
    });
    console.log(`${project}: ${key} configurada sem expor valor.`);
  }
}
