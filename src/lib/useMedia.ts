import { useEffect, useState } from 'react';

/** Acompanha uma media query (ex.: largura da tela) e atualiza ao girar/redimensionar */
export function useMedia(query: string) {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return match;
}

/** Celular: o painel do professor troca para o modo app (abas embaixo, início próprio) */
export const PHONE_QUERY = '(max-width: 767px)';
export const usePhone = () => useMedia(PHONE_QUERY);
