import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Alertas de Tráfego',
  description: 'Alertas das contas de anúncio do Meta para a equipe de tráfego.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
