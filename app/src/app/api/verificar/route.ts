import { NextResponse, type NextRequest } from 'next/server';
import { verificarTudo } from '@/lib/verificacao';

// Chamado de hora em hora pelo agendador do Supabase (pg_cron + pg_net).
// Protegido pelo segredo CRON_SECRET no cabeçalho Authorization.
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

async function rodar(request: NextRequest) {
  const segredo = process.env.CRON_SECRET?.trim();
  if (!segredo || request.headers.get('authorization') !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: 'não autorizado' }, { status: 401 });
  }
  try {
    return NextResponse.json(await verificarTudo());
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 500 });
  }
}

export const GET = rodar;
export const POST = rodar;
