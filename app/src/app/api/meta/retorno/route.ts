import { NextResponse, type NextRequest } from 'next/server';
import { exigirPapel } from '@/lib/sessao';
import { salvarConexao, trocarCodigo } from '@/lib/meta';

// Volta do Facebook: troca o código por um token de ~60 dias e guarda como conexão da agência.
export async function GET(request: NextRequest) {
  const eu = await exigirPapel('administrador');
  const { searchParams, origin } = request.nextUrl;
  const voltar = (tipo: 'ok' | 'erro', msg: string) => {
    const res = NextResponse.redirect(new URL(`/contas?${tipo}=${encodeURIComponent(msg.slice(0, 200))}`, origin));
    res.cookies.delete({ name: 'meta_state', path: '/api/meta' });
    return res;
  };
  const code = searchParams.get('code');
  if (!code) return voltar('erro', searchParams.get('error_description') || 'O Facebook não autorizou o acesso.');
  if (!searchParams.get('state') || searchParams.get('state') !== request.cookies.get('meta_state')?.value) {
    return voltar('erro', 'A conexão expirou ou veio de outro lugar. Tente de novo.');
  }
  try {
    const tokenCurto = await trocarCodigo(code, `${origin}/api/meta/retorno`);
    await salvarConexao(eu.id, tokenCurto);
  } catch (e) {
    return voltar('erro', 'Não consegui conectar o Meta: ' + (e as Error).message);
  }
  return voltar('ok', 'Meta conectado. Agora clique em "Importar contas do Meta".');
}
