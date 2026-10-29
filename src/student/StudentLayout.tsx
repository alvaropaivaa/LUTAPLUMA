import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, NavLink, Outlet, useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import clsx from 'clsx';
import { CalendarDays, CircleUserRound, Fingerprint, History, House, type LucideIcon } from 'lucide-react';
import { useStore } from '../lib/store';
import { useToast } from '../components/ui';
import { CheckinSheet } from './parts';
import { useAlerts } from './alerts';
import { showNotification } from '../lib/notify';
import type { ClassItem, Student } from '../lib/types';
import '@fontsource-variable/google-sans-flex';
import './app.css';

type Ctx = { student: Student; openCheckin: (cls?: ClassItem) => void; signOut: () => void };
export const useStudentCtx = () => useOutletContext<Ctx>();

/** `also`: telas internas que mantêm a aba acesa (carteirinha, graduação e financeiro abrem pelo perfil) */
const TABS: { to: string; label: string; icon: LucideIcon; end?: boolean; also?: string[] }[] = [
  { to: '/app', label: 'Início', icon: House, end: true },
  { to: '/app/aulas', label: 'Aulas', icon: CalendarDays },
  { to: '/app/historico', label: 'Histórico', icon: History },
  { to: '/app/perfil', label: 'Perfil', icon: CircleUserRound, also: ['/app/carteirinha', '/app/graduacao', '/app/financeiro'] },
];

export default function StudentLayout() {
  const { db, viewer, isPreview, logout } = useStore();
  const navigate = useNavigate();
  const loc = useLocation();
  const toast = useToast();
  const [sheet, setSheet] = useState<{ open: boolean; cls: ClassItem | null }>({ open: false, cls: null });
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    scroller.current?.scrollTo({ top: 0 });
  }, [loc.pathname]);

  // Rolou a tela: a faixa atrás do relógio do iPhone fica azul para o texto branco continuar legível
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [loc.pathname]);
  // a carteirinha tem topo claro, então a faixa fica sempre visível nela
  const statusBarSolid = scrolled || loc.pathname.startsWith('/app/carteirinha');

  // Safari do iPhone pinta a barra do relógio com a cor de fundo da página (não usa o theme-color):
  // no app do aluno o fundo do documento fica azul (o conteúdo continua claro por cima)
  useEffect(() => {
    const els = [document.documentElement, document.body];
    const prev = els.map((e) => e.style.backgroundColor);
    els.forEach((e) => (e.style.backgroundColor = '#041335'));
    return () => els.forEach((e, i) => (e.style.backgroundColor = prev[i]));
  }, []);

  // Novidade (aviso, check-in aberto, mensalidade, pagamento, graduação) -> notificação do sistema, se o aluno ativou.
  // A store sincroniza entre abas, então o que o professor faz no painel chega aqui na hora.
  const alerts = useAlerts(viewer);
  useEffect(() => {
    if (!viewer) return;
    const key = `easy-wrestling:notified-ids:${viewer.id}`;
    const raw = localStorage.getItem(key);
    if (raw === null) {
      // primeira vez neste aparelho: guarda o que já existe sem notificar
      localStorage.setItem(key, JSON.stringify(alerts.map((a) => a.id)));
      return;
    }
    const known = new Set<string>(JSON.parse(raw));
    const fresh = alerts.filter((a) => !known.has(a.id));
    if (!fresh.length) return;
    localStorage.setItem(key, JSON.stringify([...known, ...fresh.map((a) => a.id)].slice(-400)));
    if (!db.pushOptIn.includes(viewer.id)) return;
    fresh
      .filter((a) => a.push)
      .slice(0, 3)
      .forEach((a) => showNotification(a.title, a.body, a.id, a.url + (isPreview ? window.location.search : '')));
  }, [alerts, db.pushOptIn, viewer, isPreview]);

  // Dentro da prévia do painel (iframe) a barra de rolagem fica escondida
  useEffect(() => {
    if (window.self !== window.top) document.documentElement.classList.add('in-frame');
  }, []);

  const openCheckin = useCallback((cls?: ClassItem) => setSheet({ open: true, cls: cls ?? null }), []);
  const closeSheet = useCallback(() => setSheet((s) => ({ ...s, open: false })), []);
  const signOut = () => {
    if (isPreview) return toast('Na prévia do painel não é possível sair.', 'info');
    logout();
    navigate('/entrar');
  };

  if (!viewer) return null;
  // App instalado abre em /app: o professor vai para o painel (que no celular já fica no modo app)
  if (viewer.role === 'professor' && !isPreview) return <Navigate to="/painel" replace />;

  const tab = (t: (typeof TABS)[number]) => {
    const inside = t.also?.some((p) => loc.pathname.startsWith(p)) ?? false;
    return (
      <NavLink
        key={t.to}
        to={t.to + (isPreview ? window.location.search : '')}
        end={t.end}
        className={({ isActive }) => clsx('flex flex-1 flex-col items-center gap-1 pt-2.5 pb-2 text-[11px] font-medium transition', isActive || inside ? 'text-brand-600' : 'text-faint hover:text-ink')}
      >
        {({ isActive }) => (
          <>
            <span className="grid h-6 w-12 place-items-center">
              <t.icon className="size-5" strokeWidth={isActive || inside ? 2.2 : 1.8} />
            </span>
            {t.label}
          </>
        )}
      </NavLink>
    );
  };

  return (
    <div className="app-lv relative min-h-dvh bg-paper sm:bg-paper-2">
      {/* Faixa azul atrás do relógio/bateria do iPhone (app instalado). No topo das telas o próprio cabeçalho azul fica ali. */}
      <div
        className={clsx(
          'pointer-events-none fixed inset-x-0 top-0 z-40 h-[env(safe-area-inset-top)] bg-navy-900/90 backdrop-blur-md transition-opacity duration-200',
          statusBarSolid ? 'opacity-100' : 'opacity-0',
        )}
      />
      {/* Sem moldura: no computador o app é uma coluna centralizada, como no celular */}
      <div ref={scroller} className="relative mx-auto min-h-dvh w-full max-w-[480px] bg-paper sm:shadow-[0_0_0_1px_var(--color-line)]">
        <div className="pb-28">
          <Suspense fallback={<div className="min-h-[60vh]" />}>
            <Outlet context={{ student: viewer, openCheckin, signOut } satisfies Ctx} />
          </Suspense>
        </div>

        <nav className="pb-safe fixed bottom-0 left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 border-t border-line bg-white">
          <div className="flex items-end px-2">
            {tab(TABS[0])}
            {tab(TABS[1])}
            <div className="flex flex-1 justify-center">
              <button
                onClick={() => openCheckin()}
                className="-mt-6 mb-1.5 flex flex-col items-center gap-1 text-[11px] font-medium text-brand-600"
                aria-label="Fazer check-in"
              >
                <span className="grid size-14 place-items-center rounded-full bg-brand-500 text-white ring-4 ring-white transition active:scale-95">
                  <Fingerprint className="size-6" strokeWidth={2} />
                </span>
                Check-in
              </button>
            </div>
            {tab(TABS[2])}
            {tab(TABS[3])}
          </div>
        </nav>
      </div>

      <CheckinSheet open={sheet.open} onClose={closeSheet} student={viewer} preselect={sheet.cls} />
    </div>
  );
}
