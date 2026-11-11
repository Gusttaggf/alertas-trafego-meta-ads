'use client';

/** Select que envia o formulário assim que a pessoa escolhe uma opção. */
export default function SelectAuto(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} onChange={(e) => e.currentTarget.form?.requestSubmit()} />;
}
