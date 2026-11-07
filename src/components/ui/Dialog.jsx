import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

const FOCUSABLE = 'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]';

export default function Dialog({ title, children, onClose, busy = false, error = '' }) {
  const ref = useRef(null);
  const titleId = useId();
  const callbacks = useRef({ onClose, busy });
  callbacks.current = { onClose, busy };
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // First field when there is one; otherwise the first action (never the close icon).
    (dialog.querySelector('[data-autofocus]') || dialog.querySelector('input:not([type=file]),select,textarea') || dialog.querySelector(`.dialog-body ${FOCUSABLE}`) || dialog.querySelector(FOCUSABLE))?.focus();
    const handle = event => {
      if (event.key === 'Escape' && !callbacks.current.busy) callbacks.current.onClose();
      if (event.key !== 'Tab') return;
      const nodes = [...dialog.querySelectorAll(FOCUSABLE)].filter(n => n.getClientRects().length);
      const first = nodes[0], last = nodes.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    dialog.addEventListener('keydown', handle);
    return () => { dialog.removeEventListener('keydown', handle); document.body.style.overflow = originalOverflow; previous?.focus?.(); };
  }, []);
  return <div className="dialog-backdrop">
    <section className="dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref}>
      <div className="dialog-title"><h2 id={titleId}>{title}</h2><button type="button" className="icon-button" aria-label="Fechar" onClick={onClose} disabled={busy}><X aria-hidden="true" /></button></div>
      <div className="dialog-body stack">
        {children}
        {error && <p role="alert" className="banner error">{error}</p>}
      </div>
    </section>
  </div>;
}
