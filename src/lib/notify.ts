/*
 * Notificações do app do aluno (PWA).
 * Mostra a notificação do sistema pelo service worker (necessário no Android) com
 * fallback para a API Notification. Sem servidor, o aviso chega aos apps abertos ou
 * instalados neste navegador; o sw.js já trata eventos "push" para quando houver backend.
 */

export type NotifyState = NotificationPermission | 'unsupported';

export const notifySupported = () => typeof window !== 'undefined' && 'Notification' in window;

export const notifyPermission = (): NotifyState => (notifySupported() ? Notification.permission : 'unsupported');

export const isStandalone = () =>
  typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);

export const isIOS = () => typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);

export async function askNotifyPermission(): Promise<NotifyState> {
  if (!notifySupported()) return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/** `url`: tela do app que abre ao tocar na notificação */
export async function showNotification(title: string, body: string, tag?: string, url = '/app'): Promise<boolean> {
  if (notifyPermission() !== 'granted') return false;
  const options: NotificationOptions = { body, tag, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', data: { url } };
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (reg) {
      await reg.showNotification(title, options);
      return true;
    }
  } catch {
    /* cai para a API direta */
  }
  try {
    new Notification(title, options);
    return true;
  } catch {
    return false;
  }
}
