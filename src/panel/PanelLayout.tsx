import { Fragment, Suspense, useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { ArrowRight, ChevronsUpDown, Clock, Database, LogOut, Menu, RotateCcw, X } from 'lucide-react';
import { useNow, useStore } from '../lib/store';
import { classesOn, enrolled, nextClassFor, sessionInfo, studentStatus } from '../lib/selectors';
import { timeToMin, weekday, WEEKDAYS } from '../lib/dates';
import { Avatar, Logo } from '../components/bits';
import { BandCtx, ConfirmDialog, usePopover, useToast } from '../components/ui';
import {
  AttendanceIcon,
  GridIcon,
  LogoutIcon,
  NoticesIcon,
  PhoneIcon,
  ScheduleIcon,
  StudentsIcon,
  TrophyIcon,
  WalletIcon,
  type NavIconProps,
} from '../components/navIcons';

type NavIcon = ComponentType<NavIconProps>;

// Ícones com partes animadas ao passar o mouse (ver navIcons.tsx)
const GROUPS = ['Dia a dia', 'Academia', 'Gestão'] as const;
const NAV: { to: string; label: string; icon: NavIcon; group: (typeof GROUPS)[number]; end?: boolean; key?: string }[] = [
  { to: '/painel', label: 'Visão geral', icon: GridIcon, group: 'Dia a dia', end: true },
  { to: '/painel/chamada', label: 'Chamada do dia', icon: AttendanceIcon, group: 'Dia a dia', key: 'chamada' },
  { to: '/painel/alunos', label: 'Alunos', icon: StudentsIcon, group: 'Academia', key: 'alunos' },
  { to: '/painel/grade', label: 'Grade de aulas', icon: ScheduleIcon, group: 'Academia' },
  { to: '/painel/graduacao', label: 'Graduação e ranking', icon: TrophyIcon, group: 'Academia' },
  { to: '/painel/financeiro', label: 'Financeiro', icon: WalletIcon, group: 'Gestão' },
  { to: '/painel/avisos', label: 'Mural de avisos', icon: NoticesIcon, group: 'Gestão' },
];

const OPEN_KEY = 'easy-wrestling:sidebar';
const RAIL = 72; // barra fina (só ícones)
const FULL = 248; // menu aberto

const fmtMins = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, '0') : ''}`);

/** Cartão do menu: aula em chamada agora ou contagem para a próxima */
function NowCard() {
  const { db } = useStore();
  const { today, nowMin } = useNow();
  const live = classesOn(db, today).find((c) => sessionInfo(db, c, today, today, nowMin).status === 'aberta');
  const next = live ? null : nextClassFor(db, today, nowMin);
  const present = live ? db.checkins.filter((k) => k.classId === live.id && k.date === today).length : 0;

  let label = 'Agenda';
  let title = 'Sem aulas na semana';
  let sub = 'Cadastre aulas na grade.';
  if (live) {
    label = 'Em chamada agora';
    title = live.name;
    sub = `${live.time} · ${present}/${live.capacity} presentes`;
  } else if (next) {
    const mins = timeToMin(next.cls.time) - nowMin;
    label = 'Próxima aula';
    title = next.cls.name;
    sub = next.date === today ? `Hoje, ${next.cls.time} · ${mins > 0 ? `começa em ${fmtMins(mins)}` : 'começando'}` : `${WEEKDAYS[weekday(next.date)]}, ${next.cls.time}`;
  }

  return (
    <Link
      to="/painel/chamada"
      className="group/now relative mx-3 mb-3 block overflow-hidden rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10 transition hover:bg-white/[0.09] [@media(max-height:760px)]:hidden"
    >
      <Logo size={128} className="pointer-events-none absolute -right-9 -bottom-9 -rotate-12 opacity-[0.12]" />
      <p className="relative flex items-center gap-1.5 text-[11px] text-white/55">
        {live ? (
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
          </span>
        ) : (
          <Clock className="size-3.5 text-brand-300" />
        )}
        {label}
      </p>
      <p className="relative mt-1.5 truncate text-sm font-semibold">{title}</p>
      <p className="relative text-xs text-white/60">{sub}</p>
      {live && (
        <div className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.min(1, present / live.capacity) * 100}%` }} />
        </div>
      )}
      <span className="relative mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-300 transition group-hover/now:text-brand-200">
        Abrir chamada <ArrowRight className="size-3.5 transition group-hover/now:translate-x-0.5" />
      </span>
    </Link>
  );
}

function useMedia(query: string) {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return match;
}

export default function PanelLayout() {
  const { db, me, logout, resetDemo, startEmpty } = useStore();
  const { today, nowMin } = useNow();
  const navigate = useNavigate();
  const loc = useLocation();
  const toast = useToast();
  // Celular: menu vira gaveta. Tablet: barra fina, abre por cima. Desktop: abre empurrando o conteúdo.
  const isMobile = useMedia('(max-width: 767px)');
  const isWide = useMedia('(min-width: 1180px)');
  const [pinned, setPinned] = useState(() => localStorage.getItem(OPEN_KEY) !== '0');
  const [overlay, setOverlay] = useState(false);
  const [band, setBand] = useState(208);
  const menu = usePopover();
  const [confirm, setConfirm] = useState<null | 'reset' | 'empty'>(null);

  const open = isWide ? pinned : overlay;
  const toggle = () => (isWide ? setPinned((p) => !p) : setOverlay((o) => !o));
  const contentLeft = isMobile ? 0 : isWide && pinned ? FULL : RAIL;

  useEffect(() => {
    localStorage.setItem(OPEN_KEY, pinned ? '1' : '0');
  }, [pinned]);
  useEffect(() => {
    window.scrollTo({ top: 0 });
    setOverlay(false);
  }, [loc.pathname]);

  const overdue = enrolled(db).filter((s) => studentStatus(s, today) === 'atrasado').length;
  const liveNow = classesOn(db, today).some((c) => sessionInfo(db, c, today, today, nowMin).status === 'aberta');
  const badges: Record<string, ReactNode> = {
    alunos: overdue ? <span className="tnum rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] leading-none font-semibold text-white/80">{overdue}</span> : null,
    chamada: liveNow ? (
      <span className="relative flex size-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
      </span>
    ) : null,
  };

  const item = (to: string, label: string, Icon: NavIcon, opts: { end?: boolean; badge?: ReactNode; onClick?: () => void } = {}) => {
    const inner = (active: boolean) => (
      <>
        <span
          className={clsx(
            'grid size-8 shrink-0 place-items-center rounded-[10px] transition-colors duration-200',
            active ? 'bg-brand-500 text-white shadow-[0_6px_16px_-6px_rgb(242_112_28/0.9)]' : 'bg-white/[0.06] text-white/70 group-hover:bg-white/[0.12] group-hover:text-brand-300',
          )}
        >
          <Icon className="size-[17px]" strokeWidth={active ? 2 : 1.8} />
        </span>
        {open && <span className="flex-1 truncate text-left">{label}</span>}
        {opts.badge && <span className={clsx(open ? 'static pr-1' : 'absolute top-1 right-2.5')}>{opts.badge}</span>}
        {!open && (
          <span className="pointer-events-none absolute left-full z-50 ml-3 -translate-x-1 rounded-lg bg-ink px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-white opacity-0 shadow-lg transition duration-200 ease-out group-hover:translate-x-0 group-hover:opacity-100">
            {label}
          </span>
        )}
      </>
    );
    const base = 'group relative flex h-11 items-center gap-3 rounded-xl text-[13.5px] font-medium transition-colors duration-200';
    const layout = open ? 'px-1.5' : 'justify-center px-0';
    if (opts.onClick)
      return (
        <button key={label} onClick={opts.onClick} className={clsx(base, layout, 'w-full text-white/65 hover:bg-white/[0.05] hover:text-white')}>
          {inner(false)}
        </button>
      );
    return (
      <NavLink key={to} to={to} end={opts.end} className={({ isActive }) => clsx(base, layout, isActive ? 'bg-white/[0.08] text-white' : 'text-white/65 hover:bg-white/[0.05] hover:text-white')}>
        {({ isActive }) => inner(isActive)}
      </NavLink>
    );
  };

  if (!me) return null;

  const signOut = () => {
    logout();
    navigate('/entrar');
  };

  return (
    <div className="min-h-dvh bg-paper">
      {/* Fundo escuro quando o menu abre por cima (celular/tablet) */}
      {!isWide && overlay && <div className="fixed inset-0 z-40 bg-ink/40 animate-fade-in" onClick={() => setOverlay(false)} />}

      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-navy-900 text-white transition-[width,transform] duration-300 ease-out',
          open ? 'w-[248px]' : 'w-[72px]',
          isMobile && !open && 'invisible -translate-x-full',
          !isWide && open && 'shadow-2xl',
        )}
      >
        <div className={clsx('flex items-center gap-3 pt-5 pb-5', open ? 'px-4' : 'justify-center')}>
          <button onClick={toggle} aria-label={open ? 'Fechar menu' : 'Abrir menu'} title={open ? 'Fechar menu' : 'Abrir menu'} className="shrink-0 rounded-full">
            <Logo size={40} className="opacity-70 transition hover:opacity-100" />
          </button>
          {open && (
            <span className="min-w-0 flex-1">
              <span className="block truncate font-display text-[15px] font-semibold">Easy Wrestling</span>
              <span className="block text-[11px] text-white/50">Wrestling · Painel</span>
            </span>
          )}
          {open && !isWide && (
            <button onClick={() => setOverlay(false)} className="grid size-8 place-items-center rounded-full text-white/60 hover:bg-white/10 hover:text-white" aria-label="Fechar menu">
              <X className="size-4" />
            </button>
          )}
        </div>

        <nav className="scrollbar-none flex flex-1 flex-col gap-1 overflow-y-auto px-3">
          {GROUPS.map((g, gi) => (
            <Fragment key={g}>
              {open ? (
                <p className={clsx('px-2 pb-1 text-[10px] font-semibold tracking-[0.14em] text-white/35 uppercase', gi === 0 ? 'pt-1' : 'pt-4')}>{g}</p>
              ) : (
                gi > 0 && <div className="mx-3 my-2 h-px bg-white/10" />
              )}
              {NAV.filter((n) => n.group === g).map((n) =>
                item(n.to, n.label, n.icon, {
                  end: n.end,
                  badge: n.key ? (open || n.key !== 'alunos' ? badges[n.key] : overdue ? <span className="block size-2 rounded-full bg-brand-400 ring-2 ring-navy-900" /> : null) : null,
                }),
              )}
            </Fragment>
          ))}
          {open ? <p className="px-2 pt-4 pb-1 text-[10px] font-semibold tracking-[0.14em] text-white/35 uppercase">Atalhos</p> : <div className="mx-3 my-2 h-px bg-white/10" />}
          {item('/painel/app', 'App do aluno', PhoneIcon)}
          {item('', 'Sair', LogoutIcon, { onClick: signOut })}
        </nav>

        {open && <NowCard />}

        <div ref={menu.ref} className="relative px-3 pb-4">
          {menu.open && (
            <div className="absolute bottom-full left-3 mb-2 w-64 overflow-hidden rounded-xl bg-white p-1.5 text-ink shadow-(--shadow-lift) ring-1 ring-line animate-pop">
              <p className="px-3 pt-2 pb-1 text-xs text-muted">Demonstração</p>
              <button onClick={() => (menu.setOpen(false), setConfirm('reset'))} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-paper">
                <RotateCcw className="size-4 text-muted" /> Restaurar dados de exemplo
              </button>
              <button onClick={() => (menu.setOpen(false), setConfirm('empty'))} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-paper">
                <Database className="size-4 text-muted" /> Começar do zero
              </button>
              <div className="my-1 h-px bg-line" />
              <button onClick={signOut} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-rose-600 hover:bg-rose-50">
                <LogOut className="size-4" /> Sair da conta
              </button>
            </div>
          )}
          <button
            onClick={() => menu.setOpen(!menu.open)}
            className={clsx('group flex w-full items-center gap-3 transition-colors duration-200', open ? 'rounded-2xl bg-white/[0.04] p-2 ring-1 ring-white/10 hover:bg-white/[0.08]' : 'justify-center rounded-full p-1 hover:bg-white/5')}
          >
            <Avatar name={me.name} src={me.photo} size={36} className="bg-brand-500! text-white! ring-2 ring-white/15 transition duration-300 group-hover:ring-brand-400/70" />
            {open && (
              <>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-[13px] font-semibold">{me.name}</span>
                  <span className="block truncate text-[11px] text-white/50">{me.email}</span>
                </span>
                <ChevronsUpDown className="size-4 text-white/40" />
              </>
            )}
          </button>
        </div>
      </aside>

      <main className="relative min-h-dvh overflow-x-clip bg-navy-900 transition-[padding] duration-300 ease-out" style={{ paddingLeft: contentLeft }}>
        {/* textura da faixa: pontinhos que somem para baixo e luz suave no canto direito */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 bg-[radial-gradient(circle,rgb(255_255_255/0.09)_1px,transparent_1.6px)] bg-size-[22px_22px] [mask-image:linear-gradient(to_bottom,black,transparent)]"
          style={{ height: band, left: contentLeft }}
        />
        <div className="pointer-events-none absolute top-0 right-0 h-[420px] w-[760px] bg-[radial-gradient(closest-side,rgb(120_150_220/0.16),transparent)] blur-2xl" />
        {/* folha clara arredondada (altura medida pelo cabeçalho da página) */}
        <div
          className={clsx('absolute right-0 bottom-0 bg-paper transition-[left,top] duration-300 ease-out', isMobile ? 'rounded-t-[28px]' : 'rounded-tl-[44px]')}
          style={{ left: contentLeft, top: band }}
        />

        {isMobile && (
          <div className="relative flex items-center gap-3 px-5 pt-[calc(env(safe-area-inset-top)+0.75rem)] text-white">
            <button onClick={toggle} className="-ml-2 grid size-10 place-items-center rounded-full hover:bg-white/10" aria-label="Abrir menu">
              <Menu className="size-5" />
            </button>
            <Logo size={30} />
            <span className="text-sm font-semibold">Easy Wrestling</span>
          </div>
        )}

        <BandCtx.Provider value={setBand}>
          <div className="@container relative mx-auto max-w-[1280px] px-4 pt-6 pb-10 sm:px-8 sm:pt-8 lg:px-12">
            <Suspense fallback={<div className="min-h-[60vh]" />}>
              <Outlet />
            </Suspense>
          </div>
        </BandCtx.Provider>
      </main>

      <ConfirmDialog
        open={confirm === 'reset'}
        onClose={() => setConfirm(null)}
        title="Restaurar dados de exemplo?"
        text="Todos os alunos, aulas, check-ins e pagamentos voltam para os dados de demonstração. As alterações feitas serão perdidas."
        confirmLabel="Restaurar"
        onConfirm={() => {
          resetDemo();
          toast('Dados de exemplo restaurados.');
        }}
      />
      <ConfirmDialog
        open={confirm === 'empty'}
        onClose={() => setConfirm(null)}
        danger
        title="Começar do zero?"
        text={
          <>
            Apaga todos os dados de demonstração e encerra a sessão. A <b>primeira pessoa que criar conta</b> vira professor; as próximas viram alunos com plano mensal.
          </>
        }
        confirmLabel="Apagar tudo"
        onConfirm={() => {
          startEmpty();
          navigate('/entrar');
        }}
      />
    </div>
  );
}
