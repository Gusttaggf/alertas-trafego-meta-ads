'use client';

import { useState } from 'react';

const OPCOES = [['light', 'Claro'], ['dark', 'Escuro'], ['auto', 'Auto']] as const;

export default function TemaToggle({ inicial }: { inicial: string }) {
  const [tema, setTema] = useState(inicial);
  function escolher(v: string) {
    setTema(v);
    document.cookie = `tema=${v}; path=/; max-age=31536000; samesite=lax`;
    if (v === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', v);
  }
  return (
    <div className="tema">
      <span>Tema</span>
      <div className="seg" role="group" aria-label="Tema">
        {OPCOES.map(([v, t]) => (
          <button key={v} type="button" aria-pressed={tema === v} onClick={() => escolher(v)}>{t}</button>
        ))}
      </div>
    </div>
  );
}
