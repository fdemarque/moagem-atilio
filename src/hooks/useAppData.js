import { useEffect, useRef, useState } from 'react';
import { initializeStorage, readDocument } from '../lib/storage.js';
import { startSync } from '../lib/sync.js';

// Local document, sync status and PWA lifecycle events in one place.
export function useAppData({ onNotice, onError }) {
  const [state, setState] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [syncStatus, setSyncStatus] = useState({ kind: 'setup', text: 'Salvo neste aparelho.' });
  const [install, setInstall] = useState(null);
  const [updateWorker, setUpdateWorker] = useState(null);
  const [offlineReady, setOfflineReady] = useState(false);
  const sync = useRef(null);
  const callbacks = useRef({ onNotice, onError });
  callbacks.current = { onNotice, onError };

  const load = () => initializeStorage().then(doc => { setState(doc); setLoadError(''); return doc; })
    .catch(err => { setLoadError(`Não foi possível abrir os dados: ${err.message}`); throw err; });

  useEffect(() => {
    let disposed = false;
    load().then(() => {
      if (disposed) return;
      sync.current = startSync(setSyncStatus);
      // Connection link sent by the person responsible: #conectar=<código>.
      const match = location.hash.match(/^#conectar=(.+)$/);
      if (match) {
        history.replaceState(null, '', '#/');
        sync.current.connect(match[1])
          .then(() => callbacks.current.onNotice('Aparelho conectado à planilha.'))
          .catch(err => callbacks.current.onError(err.message));
      }
    }).catch(() => {});
    const refresh = () => readDocument().then(doc => { if (doc && !disposed) setState(doc); }).catch(err => callbacks.current.onError(err.message));
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('moagem-atilio') : null;
    if (channel) channel.onmessage = refresh;
    const changed = () => { refresh(); channel?.postMessage('changed'); };
    const installHandler = event => { event.preventDefault(); setInstall(event); };
    const readyHandler = () => setOfflineReady(true);
    const updateHandler = event => setUpdateWorker(event.detail);
    const listeners = [['moagem-change', changed], ['focus', refresh], ['beforeinstallprompt', installHandler], ['moagem-offline-ready', readyHandler], ['moagem-update-ready', updateHandler]];
    listeners.forEach(([name, fn]) => window.addEventListener(name, fn));
    if (import.meta.env.PROD) navigator.serviceWorker?.ready.then(readyHandler).catch(() => {});
    return () => { disposed = true; sync.current?.stop(); channel?.close(); listeners.forEach(([name, fn]) => window.removeEventListener(name, fn)); };
  }, []);

  return { state, loadError, reload: load, syncStatus, sync, install, clearInstall: () => setInstall(null), updateWorker, offlineReady };
}
