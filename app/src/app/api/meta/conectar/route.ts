import { randomBytes } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { exigirPapel } from '@/lib/sessao';
import { urlAutorizacao } from '@/lib/meta';

// Só o administrador conecta o Facebook da agência. O "state" protege contra pedidos forjados.
export async function GET(request: NextRequest) {
  await exigirPapel('administrador');
  const state = randomBytes(16).toString('hex');
  const res = NextResponse.redirect(urlAutorizacao(`${request.nextUrl.origin}/api/meta/retorno`, state));
  res.cookies.set('meta_state', state, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600, path: '/api/meta' });
  return res;
}
