import { useEffect, useState } from 'react';
import { MODULES } from '../lib/document.js';

// Hash routes keep the phone's Back button working inside the installed app:
// #/  ·  #/configuracoes  ·  #/<produto>  ·  #/<produto>/<cliente>
export function parseRoute(hash) {
  const [first, second] = hash.replace(/^#\/?/, '').split('/').map(part => { try { return decodeURIComponent(part); } catch { return ''; } });
  if (first === 'configuracoes') return { screen: 'settings' };
  if (MODULES.includes(first)) return second ? { screen: 'client', module: first, client: second } : { screen: 'clients', module: first };
  return { screen: 'home' };
}
export function routeHash({ module, client, screen } = {}) {
  if (screen === 'settings') return '#/configuracoes';
  if (!module) return '#/';
  return client ? `#/${module}/${encodeURIComponent(client)}` : `#/${module}`;
}
export function useRoute() {
  const [route, setRoute] = useState(() => parseRoute(location.hash));
  useEffect(() => {
    const update = () => { setRoute(parseRoute(location.hash)); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  // Switching product inside a client replaces history, so Back leaves the client.
  const go = (target, { replace = false } = {}) => {
    const hash = routeHash(target);
    if (hash === location.hash) return;
    if (replace) { history.replaceState(null, '', hash); setRoute(parseRoute(hash)); }
    else location.hash = hash;
  };
  return [route, go];
}
