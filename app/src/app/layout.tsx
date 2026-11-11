import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gestor Estrategista',
  description: 'Agenda de avisos das contas de anúncio do Meta e do Google Ads para a equipe.',
};

export default async function Layout({ children }: { children: React.ReactNode }) {
  const tema = (await cookies()).get('tema')?.value;
  return (
    <html lang="pt-BR" data-theme={tema === 'light' || tema === 'dark' ? tema : undefined}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
