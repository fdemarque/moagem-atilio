import React from 'react';
import Button from './Button.jsx';

// kind: notice (status) | error (alert) | note (static help).
export default function Banner({ kind = 'note', children, onDismiss, action }) {
  const role = kind === 'error' ? 'alert' : kind === 'notice' ? 'status' : undefined;
  return <div className={`banner ${kind}`} role={role}>
    <p>{children}</p>
    {(action || onDismiss) && <div className="banner-actions">
      {action}
      {onDismiss && <Button onClick={onDismiss}>Entendi</Button>}
    </div>}
  </div>;
}
