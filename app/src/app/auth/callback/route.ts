import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServidor } from '@/lib/supabase/server';
import { salvarConexao } from '@/lib/meta';

// Volta do Facebook: cria a sessão e guarda o token do Meta (trocado por um de 60 dias).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const falha = (erro: string, detalhe?: string) => {
    const url = new URL('/login', origin);
    url.searchParams.set('erro', erro);
    if (detalhe) url.searchParams.set('detalhe', detalhe.slice(0, 200));
    return NextResponse.redirect(url);
  };
  if (!code) return falha('falhou', searchParams.get('error_description') || undefined);

  const supabase = await supabaseServidor();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session) return falha('falhou', error?.message);

  // O token do Facebook só vem agora; o Supabase não guarda para depois.
  const tokenFacebook = data.session.provider_token;
  if (!tokenFacebook) return falha('sem_token');
  try {
    await salvarConexao(data.session.user.id, tokenFacebook);
  } catch (e) {
    return falha('falhou', (e as Error).message);
  }
  return NextResponse.redirect(new URL('/contas', origin));
}
