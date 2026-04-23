import React from 'react';

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-vortyx-text-primary sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-3xl text-sm text-vortyx-text-secondary sm:text-base">{subtitle}</p>}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
