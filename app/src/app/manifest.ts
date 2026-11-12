import type { MetadataRoute } from 'next';

// O que o celular usa para instalar o app na tela inicial.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Gestor Estrategista',
    short_name: 'Gestor',
    description: 'Agenda de avisos das contas de anúncio da Agência Estrategista.',
    lang: 'pt-BR',
    start_url: '/agenda',
    scope: '/',
    display: 'standalone',
    background_color: '#0c0a09',
    theme_color: '#570a0b',
    icons: [
      { src: '/icones/icone-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icones/icone-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icones/icone-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
