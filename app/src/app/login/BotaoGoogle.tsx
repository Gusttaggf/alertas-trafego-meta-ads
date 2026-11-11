'use client';

import { useState } from 'react';
import { supabaseNavegador } from '@/lib/supabase/client';

export default function BotaoGoogle() {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  async function entrar() {
    setCarregando(true);
    setErro('');
    const { error } = await supabaseNavegador().auth.signInWithOAuth({
      provider: 'google',
      // Só nome e e-mail. O acesso ao Google Ads é pedido à parte, numa etapa seguinte.
      options: { redirectTo: `${window.location.origin}/auth/callback`, queryParams: { prompt: 'select_account' } },
    });
    if (error) { setErro(error.message); setCarregando(false); }
  }

  return (
    <>
      <button className="btn primary grande" onClick={entrar} disabled={carregando}>
        {carregando ? 'Abrindo o Google…' : 'Entrar com o Google'}
      </button>
      {erro && <p className="aviso erro">{erro}</p>}
    </>
  );
}
