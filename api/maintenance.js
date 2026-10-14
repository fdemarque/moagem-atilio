import { equalSecret, json, safeFailure } from '../server/http.js';
import { getRuntime } from '../server/runtime.js';
async function handler(request) {
  if(request.method!=='GET')return json({error:'Método inválido.'},405);
  if(!process.env.CRON_SECRET || !equalSecret(request.headers.get('authorization'),`Bearer ${process.env.CRON_SECRET}`)) return json({error:'Acesso negado.'},401);
  try {return json(await getRuntime().store.maintain());}catch(error){return safeFailure(error);}
}
export default {fetch:handler};
