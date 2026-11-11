import { redirect } from 'next/navigation';
import { pessoaAtual } from '@/lib/sessao';
import { paginaInicial } from '@/lib/permissoes';

export const dynamic = 'force-dynamic';

export default async function Inicio() {
  const eu = await pessoaAtual();
  redirect(paginaInicial(eu.papel));
}
