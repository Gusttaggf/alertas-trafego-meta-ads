import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gestor Estrategista',
  description: 'Agenda de avisos das contas de anúncio do Meta e do Google Ads para a equipe.',
  applicationName: 'Gestor Estrategista',
  appleWebApp: { capable: true, title: 'Gestor', statusBarStyle: 'black-translucent' },
  icons: { icon: '/icones/favicon-48.png', apple: '/icones/apple-touch-icon.png' },
};

export const viewport: Viewport = {
  themeColor: '#570a0b',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
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
