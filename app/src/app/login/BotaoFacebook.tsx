'use client';

import { useState } from 'react';
import { supabaseNavegador } from '@/lib/supabase/client';

export default function BotaoFacebook() {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  async function entrar() {
    setCarregando(true);
    setErro('');
    const { error } = await supabaseNavegador().auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        // ads_read: ler contas, saldo e resultados. Mesma permissão do token atual da planilha.
        scopes: 'email,ads_read',
        redirectTo: `${window.location.origin}/auth/callback`,
        // Só para app do tipo Empresa ("Login do Facebook para Empresas"): ID da configuração de login.
        queryParams: process.env.NEXT_PUBLIC_META_CONFIG_ID
          ? { config_id: process.env.NEXT_PUBLIC_META_CONFIG_ID }
          : undefined,
      },
    });
    if (error) { setErro(error.message); setCarregando(false); }
  }

  return (
    <>
      <button className="botao facebook" onClick={entrar} disabled={carregando}>
        {carregando ? 'Abrindo o Facebook…' : 'Entrar com o Facebook'}
      </button>
      {erro && <p className="erro">{erro}</p>}
    </>
  );
}
