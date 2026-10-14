import fs from 'node:fs/promises';
const style='body{font:20px/1.65 system-ui,sans-serif;color:#18332a;background:#f6f8f5;max-width:850px;margin:40px auto;padding:0 24px}h1{font-size:32px;line-height:1.25}h2{font-size:25px;margin-top:36px}a{color:#176234;text-underline-offset:3px}nav{margin-bottom:30px}';
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const inline=s=>escape(s).replace(/\[([^\]]+)\]\(([^)]+)\)/g,(_,label,url)=>`<a href="${url==='PRIVACIDADE.md'?'privacidade.html':url}">${label}</a>`).replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/`([^`]+)`/g,'<code>$1</code>');
function page(title,content){return `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} — Moagem Atílio</title><style>${style}</style><body><nav><a href="index.html">Moagem Atílio</a> · <a href="privacidade.html">Privacidade</a> · <a href="termos.html">Termos</a></nav><main>${content}</main></body></html>`;}
await fs.mkdir('docs',{recursive:true});await fs.writeFile('docs/.nojekyll','');
for(const [source,name,title] of [['PRIVACIDADE.md','privacidade','Privacidade'],['TERMOS.md','termos','Termos de uso']]) {
  const text=await fs.readFile(source,'utf8');
  const content=text.trim().split(/\r?\n\r?\n/).map(block=>block.startsWith('## ')?`<h2>${inline(block.slice(3))}</h2>`:block.startsWith('# ')?`<h1>${inline(block.slice(2))}</h1>`:`<p>${inline(block)}</p>`).join('\n');
  await fs.writeFile(`docs/${name}.html`,page(title,content));
}
await fs.writeFile('docs/index.html',page('Aplicativo do moinho','<h1>Moagem Atílio</h1><p>Aplicativo do moinho para registrar entradas, saídas e créditos de milho, sacarias vazias e soja, consultar balanços mensais e gerar relatórios.</p><p>Funciona com registros locais no aparelho. A versão com sincronização configurada guarda cópias privadas na Vercel e backups JSON e planilhas na conta Google exclusiva do moinho. A conexão Google pede acesso somente aos arquivos usados com o aplicativo.</p><p><a href="https://moagem-atilio.vercel.app">Abrir aplicativo</a></p><p>Responsável e suporte: <a href="mailto:atiliomoinho@gmail.com">atiliomoinho@gmail.com</a>.</p>'));
console.log('Páginas públicas de privacidade e termos geradas em docs/.');
