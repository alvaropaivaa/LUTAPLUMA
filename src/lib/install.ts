/*
 * Instalar o app do aluno na tela inicial (PWA).
 * O Chrome/Android dispara "beforeinstallprompt" logo no carregamento, então o evento é
 * guardado aqui assim que o módulo é importado (main.tsx). No iPhone não existe esse
 * evento: o app mostra o passo a passo do Safari.
 */
import { useEffect, useState } from 'react';
import { isInsecure, isIOS, isStandalone } from './notify';

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

let deferred: PromptEvent | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as PromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    emit();
  });
}

export function useInstall() {
  const [, rerender] = useState(0);
  useEffect(() => {
    const fn = () => rerender((n) => n + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);

  const installed = isStandalone();
  const insecure = isInsecure();
  return {
    installed,
    /** sem HTTPS (celular pelo IP do computador): o navegador não deixa instalar */
    insecure,
    /** dentro da prévia do painel (iframe) não dá para instalar */
    inFrame: typeof window !== 'undefined' && window.self !== window.top,
    /** Android/Chrome: dá para abrir o pedido de instalação do sistema */
    canPrompt: !installed && deferred !== null,
    /** iPhone no Safari: precisa do passo a passo "Adicionar à Tela de Início" */
    iosSteps: !installed && !insecure && isIOS(),
    async prompt() {
      if (!deferred) return false;
      const ev = deferred;
      await ev.prompt();
      const { outcome } = await ev.userChoice;
      deferred = null;
      emit();
      return outcome === 'accepted';
    },
  };
}
