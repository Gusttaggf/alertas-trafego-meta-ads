import TabelaContas from '@/components/TabelaContas';
import { exigirPapel } from '@/lib/sessao';
import { listarContas } from '@/lib/dados';

export default async function MinhasContas() {
  const eu = await exigirPapel('gestor');
  const contas = (await listarContas()).filter((c) => c.gestor_id === eu.id);
  return (
    <>
      <div className="head"><div><h1>Minhas contas</h1><span className="muted">Contas pelas quais você é responsável. A agenda de avisos chega na próxima etapa.</span></div></div>
      <TabelaContas contas={contas} vazio="Seu head ainda não passou contas para você." />
    </>
  );
}
