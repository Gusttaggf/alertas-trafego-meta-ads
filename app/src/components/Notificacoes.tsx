'use client';

import { useEffect, useState } from 'react';
import { removerAparelho, salvarAparelho, testarNotificacao } from '@/app/acoes/notificacoes';

type Estado = 'carregando' | 'sem-suporte' | 'ios-instalar' | 'pronto' | 'ativo' | 'bloqueado';
type PedidoInstalacao = Event & { prompt: () => Promise<void> };

function chaveParaBytes(base64: string) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const bin = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

/** Ativa as notificações no aparelho. No iPhone, só funciona com o app instalado na tela de início. */
export default function Notificacoes({ chavePublica }: { chavePublica: string }) {
  const [estado, setEstado] = useState<Estado>('carregando');
  const [msg, setMsg] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [instalar, setInstalar] = useState<PedidoInstalacao | null>(null);

  useEffect(() => {
    const aoPedir = (e: Event) => { e.preventDefault(); setInstalar(e as PedidoInstalacao); };
    window.addEventListener('beforeinstallprompt', aoPedir);
    (async () => {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const instalado = window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
      if (!('serviceWorker' in navigator)) return setEstado('sem-suporte');
      const reg = await navigator.serviceWorker.register('/sw.js');
      if (!('PushManager' in window) || !('Notification' in window)) return setEstado(ios && !instalado ? 'ios-instalar' : 'sem-suporte');
      if (Notification.permission === 'denied') return setEstado('bloqueado');
      const sub = await reg.pushManager.getSubscription();
      if (sub && Notification.permission === 'granted') {
        await salvarAparelho(JSON.parse(JSON.stringify(sub)), navigator.userAgent); // garante que está salvo
        return setEstado('ativo');
      }
      setEstado('pronto');
    })().catch(() => setEstado('sem-suporte'));
    return () => window.removeEventListener('beforeinstallprompt', aoPedir);
  }, []);

  async function ativar() {
    setOcupado(true); setMsg('');
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setEstado(perm === 'denied' ? 'bloqueado' : 'pronto'); return; }
      const reg = await navigator.serviceWorker.ready;
      const antiga = await reg.pushManager.getSubscription();
      if (antiga) await antiga.unsubscribe();
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveParaBytes(chavePublica) });
      const r = await salvarAparelho(JSON.parse(JSON.stringify(sub)), navigator.userAgent);
      if (!r.ok) { setMsg(r.erro || 'Não consegui ativar.'); return; }
      setEstado('ativo');
      await testarNotificacao();
      setMsg('Ativado. Mandamos uma notificação de teste.');
    } catch (e) {
      setMsg('Não consegui ativar: ' + (e as Error).message);
    } finally { setOcupado(false); }
  }

  async function testar() {
    setOcupado(true);
    const r = await testarNotificacao();
    setMsg(r.ok ? 'Notificação de teste enviada.' : r.erro || 'Falhou.');
    setOcupado(false);
  }

  async function desligar() {
    setOcupado(true);
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) { await removerAparelho(sub.endpoint); await sub.unsubscribe(); }
    setEstado('pronto'); setMsg('Notificações desligadas neste aparelho.'); setOcupado(false);
  }

  if (estado === 'carregando') return null;
  return (
    <div className="notif">
      <span className="rotulo">Celular</span>
      {instalar && (
        <button className="btn" type="button" onClick={async () => { await instalar.prompt(); setInstalar(null); }}>Instalar o app</button>
      )}
      {estado === 'pronto' && <button className="btn primary" type="button" onClick={ativar} disabled={ocupado}>{ocupado ? 'Ativando…' : 'Ativar notificações'}</button>}
      {estado === 'ativo' && (
        <>
          <span className="ok pequeno">✓ Notificações ligadas neste aparelho</span>
          <span className="acoes-notif">
            <button className="link" type="button" onClick={testar} disabled={ocupado}>Testar</button>
            <button className="link" type="button" onClick={desligar} disabled={ocupado}>Desligar</button>
          </span>
        </>
      )}
      {estado === 'ios-instalar' && <span className="muted pequeno">No iPhone: abra no Safari, toque em <b>Compartilhar</b> → <b>Adicionar à Tela de Início</b>, abra o app pelo ícone e ative aqui.</span>}
      {estado === 'bloqueado' && <span className="muted pequeno">As notificações estão bloqueadas. Libere nas configurações do navegador (cadeado ao lado do endereço → Notificações → Permitir) e recarregue.</span>}
      {estado === 'sem-suporte' && <span className="muted pequeno">Este navegador não recebe notificações. No celular, use o Chrome (Android) ou o app instalado na tela de início (iPhone).</span>}
      {msg && <span className="muted pequeno" role="status">{msg}</span>}
    </div>
  );
}
