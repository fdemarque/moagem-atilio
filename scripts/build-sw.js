import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry => entry.isDirectory()?walk(path.join(dir,entry.name)):[path.join(dir,entry.name)]);}
const files=walk('dist').filter(f => !f.endsWith('sw.js')).sort();
const hash=createHash('sha256');for(const f of files) hash.update(fs.readFileSync(f));
const assets=files.map(f => '/'+path.relative('dist',f).replaceAll('\\','/'));
const source=fs.readFileSync('public/sw.js','utf8').replace("'__CACHE_NAME__'",JSON.stringify('moagem-assets-'+hash.digest('hex').slice(0,16))).replace('__STATIC_ASSETS__',JSON.stringify(assets));
fs.writeFileSync('dist/sw.js',source);
console.log(`Service worker: ${assets.length} arquivos pré-carregados, incluindo PDFs offline.`);
