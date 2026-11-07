import React from 'react';

// variant: primary | secondary | danger | back. Icons are decorative; the text names the action.
export default function Button({ variant = 'secondary', icon: Icon, children, className = '', type = 'button', ...props }) {
  return <button type={type} className={`${variant} ${className}`.trim()} {...props}>
    {Icon && <Icon aria-hidden="true" size={24} />}{children}
  </button>;
}
