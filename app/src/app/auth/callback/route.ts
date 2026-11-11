import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServidor } from '@/lib/supabase/server';
import { garantirPessoa } from '@/lib/sessao';

// Volta do Google: cria a sessão e registra a pessoa (nova pessoa fica aguardando acesso).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const falha = (msg: string) => NextResponse.redirect(new URL(`/login?erro=${encodeURIComponent(msg.slice(0, 200))}`, origin));
  if (!code) return falha(searchParams.get('error_description') || 'o Google não devolveu a autorização');

  const supabase = await supabaseServidor();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return falha(error?.message || 'sessão não criada');
  try {
    await garantirPessoa(data.user);
  } catch (e) {
    return falha((e as Error).message);
  }
  return NextResponse.redirect(new URL('/', origin));
}
