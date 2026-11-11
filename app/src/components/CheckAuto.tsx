'use client';

/** Caixinha que envia o formulário ao marcar/desmarcar (manda "1" ou "0" no campo). */
export default function CheckAuto({ nome, marcado, rotulo }: { nome: string; marcado: boolean; rotulo: string }) {
  return (
    <label className="check">
      <input type="hidden" name={nome} value={marcado ? '0' : '1'} />
      <input type="checkbox" defaultChecked={marcado} onChange={(e) => e.currentTarget.form?.requestSubmit()} />
      {rotulo}
    </label>
  );
}
