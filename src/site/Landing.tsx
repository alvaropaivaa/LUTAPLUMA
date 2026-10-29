import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import '@fontsource-variable/google-sans-flex';
import { ArrowUp, ArrowUpRight, LogIn, X } from 'lucide-react';
import { useStore } from '../lib/store';
import { brl, modality } from '../lib/belts';
import { todayISO, weekday, WEEK_ORDER, WEEKDAYS, WEEKDAYS_SHORT } from '../lib/dates';
import { activeStudents } from '../lib/selectors';
import { Logo } from '../components/bits';
import type { ClassItem } from '../lib/types';

gsap.registerPlugin(ScrollTrigger);

/* three.js só carrega quando o site abre */
const Medal3D = lazy(() => import('./Medal3D'));
const LogoTile3D = lazy(() => import('./LogoTile3D'));

/* Informações reais do Instagram da academia */
const IG_HANDLE = '@easywrestling_';
const IG_URL = 'https://instagram.com/easywrestling_';
const FOUNDER = '@marcoswrestler';

/* Fotos reais da academia em public/fotos (ver LEIA-ME.txt) */
const FOTO = {
  hero: '/fotos/hero.jpg',
  adulto: '/fotos/adulto.jpg',
  kids: '/fotos/kids.jpg',
  competicao: '/fotos/competicao.jpg',
  medalha: '/fotos/medalha.png',
  final: '/fotos/final.jpg',
};

const NAV = [
  { label: 'Início', href: '#top' },
  { label: 'Turmas', href: '#turmas' },
  { label: 'Como começar', href: '#passos' },
  { label: 'Diferenciais', href: '#diferenciais' },
  { label: 'Horários', href: '#horarios' },
];
const MENU = [...NAV, { label: 'Planos', href: '#planos' }, { label: 'Dúvidas', href: '#faq' }];

/* ---------------- rolagem suave (Lenis) ---------------- */

let lenis: Lenis | null = null;

/** Trava a página enquanto o menu ou a janela da turma estão abertos */
function lockScroll(on: boolean) {
  if (on) lenis?.stop();
  else lenis?.start();
  document.documentElement.style.overflow = on ? 'hidden' : '';
}

function goTo(hash: string) {
  const el = document.querySelector<HTMLElement>(hash);
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { force: true, duration: 1.4 });
  else el.scrollIntoView({ behavior: 'smooth' });
}

/* ---------------- pecinhas ---------------- */

/** Resumo "Seg a Sex · 07:00, 12:00" de um conjunto de aulas */
function summary(list: ClassItem[]) {
  if (!list.length) return 'Horários em breve';
  const days = WEEK_ORDER.filter((d) => list.some((c) => c.days.includes(d)));
  const times = [...new Set(list.map((c) => c.time))].sort();
  const span = days.slice(0, 5).join() === '1,2,3,4,5' ? `Seg a Sex${days.includes(6) ? ' + Sáb' : ''}` : days.map((d) => WEEKDAYS_SHORT[d]).join(' · ');
  return `${span} · ${times.slice(0, 4).join(', ')}`;
}

const daysOf = (c: ClassItem) => WEEK_ORDER.filter((d) => c.days.includes(d)).map((d) => WEEKDAYS_SHORT[d]).join(' · ');

/** Número que conta até o valor quando aparece */
function Count({ to, format = (n: number) => String(n) }: { to: number; format?: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [v, setV] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const step = (t: number) => {
        const k = Math.min(1, (t - t0) / 1600);
        setV(Math.round(to * (1 - Math.pow(1 - k, 3))));
        if (k < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to]);
  return <span ref={ref}>{format(v)}</span>;
}

/** Botão pílula da referência: dois preenchimentos correm da direita e a seta gira */
function Cta({
  children,
  href = IG_URL,
  tone = 'light',
  size = 'md',
  shine,
  className,
}: {
  children: ReactNode;
  href?: string;
  tone?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  shine?: boolean;
  className?: string;
}) {
  const external = href.startsWith('http');
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noreferrer' : undefined}
      style={{ '--cta-base': tone === 'dark' ? 'var(--ink)' : '#fff' } as CSSProperties}
      className={clsx(
        'cta inline-flex shrink-0 items-center rounded-full whitespace-nowrap transition-transform duration-300 hover:-translate-y-0.5',
        tone === 'dark' ? 'bg-[var(--ink)] text-white' : 'bg-white text-[var(--ink)] shadow-[0_10px_30px_rgb(0_0_0/0.28)]',
        size === 'lg' ? 'h-14 gap-4 pr-2 pl-7 text-[15px]' : size === 'sm' ? 'h-10 gap-2.5 pr-1 pl-4 text-[13px]' : 'h-12 gap-3 pr-1.5 pl-6 text-sm',
        shine && 'cta-shine',
        className,
      )}
    >
      <span aria-hidden className="cta-fill cta-fill--a" />
      <span aria-hidden className="cta-fill cta-fill--b" />
      <span>{children}</span>
      <span className={clsx('cta-chip grid place-items-center rounded-full bg-[var(--primary)] text-white', size === 'lg' ? 'h-10 w-10' : size === 'sm' ? 'h-8 w-8' : 'h-9 w-9')}>
        <ArrowUpRight className="h-4 w-4" />
      </span>
    </a>
  );
}

function IgIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect width={20} height={20} x={2} y={2} rx={5} />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1={17.5} x2={17.51} y1={6.5} y2={6.5} />
    </svg>
  );
}

/* ================================================================== */

type Turma = { title: string; src: string; pos: string; desc: string; list: ClassItem[] };

export default function Landing() {
  const root = useRef<HTMLElement>(null);
  const [menu, setMenu] = useState(false);
  const [turma, setTurma] = useState<Turma | null>(null);

  const toggleMenu = (v: boolean) => {
    lockScroll(v);
    setMenu(v);
  };
  const openTurma = (t: Turma | null) => {
    lockScroll(!!t);
    setTurma(t);
  };

  // rolagem suave ligada ao relógio do GSAP
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add('site-no-bar');
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      lenis = new Lenis({ lerp: 0.09, anchors: { duration: 1.4 } });
      lenis.on('scroll', ScrollTrigger.update);
    }
    const tick = (t: number) => lenis?.raf(t * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener('load', refresh);
    document.fonts?.ready.then(refresh);
    return () => {
      gsap.ticker.remove(tick);
      lenis?.destroy();
      lenis = null;
      window.removeEventListener('load', refresh);
      html.classList.remove('site-no-bar');
      html.style.overflow = '';
    };
  }, []);

  // animações presas à rolagem
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    const ctx = gsap.context(() => scrollFx(el, mm), el);
    return () => {
      mm.revert();
      ctx.revert();
    };
  }, []);

  return (
    <main ref={root} className="site-lv overflow-x-clip bg-white text-[var(--ink)] antialiased">
      <Banner onMenu={() => toggleMenu(true)} />
      <Value />
      <Spotlight />
      <Stats />
      <Sky />
      <Classes onOpen={openTurma} />
      <Steps />
      <Why />
      <Schedule />
      <Goal />
      <Faq />
      <SiteFooter />
      <FloatingBar />
      <MenuOverlay open={menu} onClose={() => toggleMenu(false)} />
      <TurmaModal turma={turma} onClose={() => openTurma(null)} />
    </main>
  );
}

/* ---------------- efeitos de rolagem (GSAP) ---------------- */

const STEP_AT = [0, 0.157, 0.313, 0.687, 0.843, 0.99];

function scrollFx(root: HTMLElement, mm: gsap.MatchMedia) {
  const $ = <T extends Element = HTMLElement>(s: string) => root.querySelector<T>(s);
  const $$ = <T extends Element = HTMLElement>(s: string, from: ParentNode = root) => Array.from(from.querySelectorAll<T>(s));

  // 1) passos: fixa a seção e desenha a linha (criado primeiro porque mexe no tamanho da página)
  const process = $('[data-process]');
  if (process) {
    mm.add('(min-width: 768px)', () => {
      const tl = gsap.timeline({ scrollTrigger: { trigger: process, start: 'top top', end: '+=1700', pin: true, scrub: 0.6, anticipatePin: 1 } });
      tl.fromTo($('[data-line]'), { strokeDashoffset: 1 }, { strokeDashoffset: 0, ease: 'none', duration: 1 }, 0);
      $$('[data-step]', process).forEach((s, i) => {
        if (i) tl.fromTo(s, { opacity: 0.14, y: 16 }, { opacity: 1, y: 0, duration: 0.08, ease: 'power1.out' }, STEP_AT[i] - 0.06);
      });
    });
    mm.add('(max-width: 767px)', () => {
      const list = $('[data-steps-m]');
      gsap.fromTo($('[data-line-m]'), { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: list, start: 'top 70%', end: 'bottom 60%', scrub: true } });
    });
  }

  // 2) entradas: sobe e aparece
  $$('[data-r]').forEach((el) =>
    gsap.from(el, { y: 50, opacity: 0, duration: 1.1, ease: 'power3.out', delay: Number(el.dataset.r) || 0, scrollTrigger: { trigger: el, start: 'top 88%' } }),
  );
  $$('[data-rg]').forEach((g) =>
    gsap.from(g.children, { y: 70, opacity: 0, duration: 1.1, ease: 'power3.out', stagger: 0.12, scrollTrigger: { trigger: g, start: 'top 85%' } }),
  );

  // 3) destaque: palavras acendem, medalha sobe, textos entram pelos lados
  const spot = $('[data-spot]');
  if (spot) {
    const st = { trigger: spot, start: 'top 75%', end: 'center center', scrub: 1 };
    gsap.fromTo($$('[data-word]', spot), { opacity: 0.1 }, { opacity: 1, stagger: 0.1, ease: 'none', scrollTrigger: st });
    gsap.fromTo($('[data-spot-art]'), { yPercent: 28, scale: 0.75, opacity: 0.2 }, { yPercent: 0, scale: 1, opacity: 1, ease: 'none', scrollTrigger: st });
    const side = { trigger: spot, start: 'top 35%', end: 'center 25%', scrub: 1 };
    gsap.fromTo($('[data-spot-left]'), { x: -90, opacity: 0 }, { x: 0, opacity: 1, ease: 'none', scrollTrigger: side });
    gsap.fromTo($('[data-spot-right]'), { x: 90, opacity: 0 }, { x: 0, opacity: 1, ease: 'none', scrollTrigger: side });
  }

  // 4) nuvens em três camadas (parallax)
  const sky = $('[data-sky]');
  if (sky) {
    (
      [
        ['back', 35],
        ['mid', 20],
        ['front', -30],
      ] as const
    ).forEach(([k, y]) =>
      gsap.fromTo($(`[data-layer="${k}"]`), { yPercent: 0 }, { yPercent: y, ease: 'none', scrollTrigger: { trigger: sky, start: 'top bottom', end: 'bottom top', scrub: true } }),
    );
  }

  // 5) bloco 3D da logo entra girando
  const goal = $('[data-goal]');
  if (goal) {
    gsap.fromTo($('[data-goal-art]'), { scale: 0.7, opacity: 0, rotate: -14 }, { scale: 1, opacity: 1, rotate: 0, ease: 'none', scrollTrigger: { trigger: goal, start: 'top 85%', end: 'center center', scrub: 1 } });
  }
}

/* ---------------- Banner (mantido) ---------------- */

function Burger({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label="Abrir menu" className="group flex h-11 w-11 flex-col justify-center gap-[7px] p-2.5">
      <span className="block h-0.5 w-full rounded bg-white transition-transform duration-300 group-hover:translate-x-1" />
      <span className="block h-0.5 w-full rounded bg-white transition-transform duration-300 group-hover:-translate-x-1" />
    </button>
  );
}

/** Leva ao login ou, se já entrou, direto ao painel do professor / app do aluno */
function useEnter() {
  const { me } = useStore();
  if (!me) return { to: '/entrar', label: 'Entrar' };
  return me.role === 'professor' ? { to: '/painel', label: 'Painel' } : { to: '/app', label: 'Meu app' };
}

function Banner({ onMenu }: { onMenu: () => void }) {
  const enter = useEnter();
  return (
    <section id="top" className="relative z-10 flex min-h-svh items-center overflow-hidden rounded-b-[22px] bg-[var(--navy-deep)] text-white max-sm:h-[92svh] max-sm:min-h-[580px] max-sm:items-end max-sm:rounded-b-[18px]">
      <img
        src={FOTO.hero}
        alt="Atleta na Easy Wrestling"
        className="absolute inset-y-0 right-0 h-full w-full animate-hero-zoom object-cover object-[62%_30%] sm:object-[70%_35%] md:w-[75%]"
      />
      <div aria-hidden className="lv-hero-overlay absolute inset-0 max-sm:hidden" />
      <div aria-hidden className="lv-hero-overlay-m absolute inset-0 sm:hidden" />

      <header className="absolute inset-x-0 top-0 z-50 px-[4%] py-2.5 sm:py-4 md:px-[3.3%]">
        <div className="flex items-center justify-between gap-3">
          <a href="#top" className="flex items-center gap-2.5">
            <Logo size={44} />
            <span className="hidden text-white min-[420px]:inline">Easy Wrestling</span>
          </a>
          <nav aria-label="Navegação principal" className="hidden items-center gap-0.5 rounded-full border border-white/15 bg-[var(--navy-deep)]/55 p-1 text-[13px] backdrop-blur-xl lg:flex">
            {NAV.map((n, i) => (
              <a key={n.href} href={n.href} className={clsx('rounded-full px-[17px] py-2 transition-colors duration-300', i === 0 ? 'bg-white text-[var(--ink)]' : 'text-white/80 hover:text-white')}>
                {n.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              to={enter.to}
              aria-label={enter.label}
              className="flex h-10 items-center gap-2 rounded-full border border-white/35 bg-[var(--navy-deep)]/35 px-3 text-[13px] text-white backdrop-blur-md transition-colors duration-300 hover:border-white/75 hover:bg-white/12 sm:px-4"
            >
              <LogIn className="h-4 w-4" />
              <span className="max-[374px]:hidden">{enter.label}</span>
            </Link>
            <Cta size="sm" className="max-sm:hidden">
              Aula grátis
            </Cta>
            <Burger onClick={onMenu} />
          </div>
        </div>
      </header>

      <div className="relative w-full px-6 pt-24 md:px-8 max-sm:px-[5%] max-sm:pt-0 max-sm:pb-[11%] max-sm:text-center">
        <span className="inline-flex animate-fade-in items-center gap-2 rounded-full border max-sm:hidden border-[var(--primary)]/50 bg-[var(--navy-deep)]/40 px-4 py-2 text-xs font-medium tracking-[0.15em] text-white uppercase">
          <span className="text-[var(--primary)]">●</span> Academia de wrestling · Fortaleza-CE
        </span>
        <h1 className="mt-5 text-[clamp(23px,6.6vw,35px)] leading-[1.02] font-normal tracking-tight text-white uppercase max-sm:mt-0 sm:text-6xl md:text-7xl">
          <span className="block animate-fade-in [animation-delay:100ms]">Wrestling de verdade</span>
          <span className="block animate-fade-in [animation-delay:220ms]">para todas as</span>
          <span className="block animate-fade-in text-[var(--primary)] [animation-delay:340ms]">idades</span>
        </h1>
        <p className="mt-6 max-w-md animate-fade-in text-lg text-white/80 [animation-delay:460ms] max-sm:mx-auto max-sm:mt-3.5 max-sm:max-w-[300px] max-sm:text-[12px] max-sm:leading-[1.45] max-sm:text-balance max-sm:text-white/78">
          Time profissional, turmas para adultos e crianças com o <strong className="font-medium text-white">{FOUNDER}</strong>. A primeira aula é grátis.
        </p>
        <div className="mt-8 flex animate-fade-in flex-wrap items-center gap-3 [animation-delay:580ms] max-sm:mt-[18px] max-sm:justify-center max-sm:gap-2.5">
          <Cta size="lg" className="max-sm:h-[47px] max-sm:gap-2.5 max-sm:pr-[5px] max-sm:pl-[18px] max-sm:text-[12px]">
            Quero começar
          </Cta>
          <a href="#horarios" className="flex h-14 items-center rounded-full border border-white/40 px-7 text-white transition-colors duration-300 hover:border-white/75 hover:bg-white/12 max-sm:h-[47px] max-sm:px-[22px] max-sm:text-[12px]">
            Horários
          </a>
        </div>
      </div>
      <div className="pointer-events-none absolute right-[3.3%] bottom-[8.5%] hidden animate-fade-in text-right [animation-delay:700ms] lg:block">
        <div className="text-[clamp(56px,min(5vw,9.5vh),78px)] leading-[0.86] font-normal text-white uppercase">
          +3,4 mil
          <br />
          seguidores
        </div>
        <p className="mt-5 text-sm text-white/80">
          Comunidade {IG_HANDLE} no Instagram,
          <br />
          treinando duro em Fortaleza.
        </p>
      </div>
    </section>
  );
}

function MenuOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const enter = useEnter();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  const go = (e: MouseEvent, href: string) => {
    e.preventDefault();
    onClose();
    goTo(href);
  };
  return (
    <div
      aria-hidden={!open}
      className={clsx(
        'fixed inset-0 z-[60] flex flex-col bg-[var(--navy-deep)] px-[6%] py-4 text-white transition-[opacity,visibility] duration-500',
        open ? 'visible opacity-100' : 'invisible opacity-0',
      )}
    >
      <div aria-hidden className="lv-glow-orb pointer-events-none absolute -right-1/4 -bottom-1/4 h-[70%] w-[80%] opacity-40" />
      <div className="relative flex items-center justify-between">
        <Logo size={44} />
        <button onClick={onClose} aria-label="Fechar menu" className="grid h-11 w-11 place-items-center rounded-full border border-white/20 transition-colors hover:bg-white/10">
          <X className="h-5 w-5" />
        </button>
      </div>
      <nav className="relative my-auto flex flex-col gap-1">
        {MENU.map((n, i) => (
          <a
            key={n.href}
            href={n.href}
            onClick={(e) => go(e, n.href)}
            style={{ transitionDelay: open ? `${120 + i * 60}ms` : '0ms' }}
            className={clsx(
              'w-fit text-[clamp(34px,7vw,64px)] leading-[1.12] transition-all duration-700 ease-[cubic-bezier(0.22,0.61,0.36,1)] hover:text-[var(--primary)]',
              open ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0',
            )}
          >
            {n.label}
          </a>
        ))}
      </nav>
      <div className="relative flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5 text-sm text-white/65">
        <Link to={enter.to} className="flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[var(--ink)] transition-colors hover:bg-[var(--primary)] hover:text-white">
          <LogIn className="h-4 w-4" /> {enter.label === 'Entrar' ? 'Entrar no sistema' : enter.label}
        </Link>
        <a href={IG_URL} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-white">
          <IgIcon className="h-4 w-4" /> {IG_HANDLE}
        </a>
      </div>
    </div>
  );
}

/* ---------------- Pense nisso (branca) ---------------- */

function Value() {
  return (
    <section id="sobre" className="relative bg-white px-[6%] pt-16 pb-[72px] md:px-[clamp(25px,5.2vw,100px)] md:pt-[clamp(64px,6.5vw,108px)] md:pb-[clamp(72px,7.5vw,124px)]">
      <div className="mx-auto grid max-w-[1440px] items-start gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] md:gap-[clamp(54px,10vw,190px)]">
        <div data-r>
          <span className="mb-5 inline-block rounded-full border border-[var(--ink)]/25 px-4 py-1.5 text-[11px] tracking-[0.14em] uppercase md:mb-6">Pense nisso</span>
          <h2 className="text-[clamp(35px,9vw,48px)] leading-[1.05] font-normal text-balance md:text-[clamp(38px,3.55vw,63px)]">
            Força, disciplina
            <br />e confiança se
            <br />
            <span className="lv-ink-grad">constroem no tatame.</span>
          </h2>
          <div className="mt-7 flex flex-wrap items-center gap-x-3.5 gap-y-2.5">
            <div className="flex">
              {[FOTO.adulto, FOTO.kids, FOTO.competicao, FOTO.hero].map((src, i) => (
                <img key={src} src={src} alt="" className={clsx('h-[38px] w-[38px] rounded-full object-cover ring-2 ring-white', i > 0 && '-ml-3')} />
              ))}
            </div>
            <p className="text-[13px]">+3,4 mil seguidores no Instagram</p>
          </div>
        </div>
        <div data-r="0.12" className="max-w-[560px] text-base leading-[1.45] md:pt-1.5 md:text-[clamp(16px,1.2vw,20px)]">
          <p className="mb-5">
            Você pode querer entrar em forma, aprender a se defender ou competir de verdade. Mas sem um bom professor, um método claro e uma equipe que puxa você pra cima, a motivação acaba ficando pelo caminho... e você sabe disso!
          </p>
          <p className="mb-2 text-[0.82em] text-[var(--ink)]/75">
            Nossa missão é fazer cada aluno evoluir no seu ritmo, do primeiro treino ao pódio, com turmas para adultos, mulheres, crianças e atletas.
          </p>
          <Cta tone="dark" className="mt-3">
            Agendar aula grátis
          </Cta>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Destaque com a medalha 3D (escura) ---------------- */

const SPOT_LINES = [['Do', 'primeiro', 'treino'], ['ao', 'lugar', 'mais', 'alto'], ['do', 'pódio']];

function Spotlight() {
  return (
    <div className="-mt-[22px] bg-white pt-[22px]">
      <section data-spot className="lv-spot lv-spot2 relative isolate h-svh min-h-[680px] overflow-hidden rounded-t-[22px] text-[oklch(97%_0.01_250)]">
        <h2 className="lv-drop absolute top-[7%] left-1/2 z-[3] w-[92%] -translate-x-1/2 text-center text-[clamp(27px,6.8vw,40px)] leading-[1.1] font-normal uppercase md:top-[14.5%] md:w-[55%] md:text-[clamp(32px,2.85vw,53px)] md:leading-[1.05] lg:top-[16.5%] lg:w-[42%]">
          {SPOT_LINES.map((line, li) => (
            <span key={li} className="block">
              {line.map((w) => (
                <span key={w} data-word className="lv-light-grad inline-block">
                  {w}&nbsp;
                </span>
              ))}
            </span>
          ))}
        </h2>

        <div data-spot-art className="absolute top-[21%] left-1/2 z-[2] aspect-[1/1.08] w-[min(90%,380px)] lg:top-auto lg:bottom-[1%] lg:w-[min(38%,540px)]" style={{ translate: '-50% 0' }}>
          <Suspense fallback={<img src={FOTO.medalha} alt="" className="h-full w-full object-contain" />}>
            <Medal3D className="h-full w-full" />
          </Suspense>
        </div>

        <div data-spot-left className="absolute inset-x-[6%] top-[73%] z-[3] text-center lg:inset-x-auto lg:left-[5.8%] lg:max-w-[24%] lg:text-left">
          <p className="text-[15px] leading-[1.38] text-balance md:text-lg lg:text-[clamp(16px,1.32vw,25px)]">Seu corpo ganha força, fôlego e confiança desde a primeira aula.</p>
        </div>
        <div data-spot-right className="absolute inset-x-[6%] top-[81%] z-[3] text-center lg:inset-x-auto lg:top-[49%] lg:right-[5.5%] lg:w-[17%] lg:text-left">
          <p className="hidden text-[clamp(13px,1.03vw,20px)] leading-[1.43] text-white/80 lg:mb-[18px] lg:block">
            Técnica de competição.
            <br />
            Treino para todas as idades.
          </p>
          <Cta size="sm">Agende sua aula</Cta>
        </div>
      </section>
    </div>
  );
}

/* ---------------- Números ---------------- */

function Stats() {
  const { db } = useStore();
  const alunos = activeStudents(db).length;
  const aulas = db.classes.filter((c) => c.active).reduce((n, c) => n + c.days.length, 0);
  const items = [
    { value: <Count to={34} format={(v) => `+${(v / 10).toFixed(1).replace('.', ',')} mil`} />, label: 'Pessoas acompanham no Instagram' },
    { value: <Count to={alunos} format={(v) => `+${v}`} />, label: 'Alunos treinando com a gente' },
    { value: <Count to={aulas} />, label: 'Aulas por semana' },
    { value: 'R$ 0', label: 'Na sua primeira aula' },
  ];
  return (
    <section id="resultados" aria-label="Easy Wrestling em números" className="relative bg-[var(--navy-deep)] px-5 pt-[clamp(65px,8vw,130px)] text-white md:px-[clamp(20px,5vw,90px)]">
      <div data-r className="mx-auto w-full max-w-[1540px] border-y border-[var(--rule)] px-[clamp(18px,3vw,54px)] py-8 md:py-[clamp(18px,1.6vw,26px)]">
        <dl className="grid grid-cols-2 gap-x-[clamp(18px,3vw,54px)] gap-y-9 lg:grid-cols-4">
          {items.map((it) => (
            <div key={it.label} className="min-w-0 text-center lg:text-left">
              <dt className="lv-light-grad lv-drop text-[clamp(32px,9vw,56px)] leading-none font-normal whitespace-nowrap tabular-nums md:text-6xl lg:text-[clamp(40px,4.2vw,76px)]">{it.value}</dt>
              <dd className="mt-2.5 text-[clamp(13px,1vw,17px)] leading-[1.3] text-white/75 md:mt-[18px]">{it.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/* ---------------- Céu com nuvens (transição para o branco) ---------------- */

const CLOUDS = {
  back: [
    ['fc-b1', 1],
    ['fc-b2', 2],
    ['fc-b3', 2],
    ['fc-b4', 1],
    ['fc-b5', 1],
    ['fc-b6', 2],
  ],
  mid: [
    ['fc-center', 2],
    ['fc-left', 1],
    ['fc-right', 1],
    ['fc-m1', 2],
    ['fc-m2', 2],
    ['fc-m3', 1],
    ['fc-m4', 2],
  ],
  front: [
    ['fc-f1', 1],
    ['fc-f2', 2],
    ['fc-f3', 1],
    ['fc-f4', 2],
  ],
} as const;

function Sky() {
  return (
    <section data-sky aria-hidden className="lv-sky">
      {(['back', 'mid', 'front'] as const).map((k) => (
        <div key={k} data-layer={k} className={clsx('lv-cloud-layer', k === 'back' && 'lv-layer-back', k === 'front' && 'lv-layer-front')}>
          {CLOUDS[k].map(([c, n]) => (
            <img key={c} src={`/site/nuvem-${n}.webp`} alt="" decoding="async" draggable={false} className={`lv-cloud ${c}`} />
          ))}
        </div>
      ))}
    </section>
  );
}

/* ---------------- Turmas (cards + janela) ---------------- */

function Classes({ onOpen }: { onOpen: (t: Turma) => void }) {
  const { db } = useStore();
  const active = db.classes.filter((c) => c.active);
  const by = (f: (c: ClassItem) => boolean) => active.filter(f).sort((a, b) => a.time.localeCompare(b.time));
  const cards: Turma[] = [
    { title: 'Wrestling adulto', src: FOTO.adulto, pos: 'object-[50%_40%]', desc: 'Do zero ao avançado: quedas, controle, defesa e condicionamento. Turmas de manhã, no almoço e à noite.', list: by((c) => c.modality === 'gi' || c.modality === 'nogi') },
    { title: 'Kids', src: FOTO.kids, pos: 'object-[50%_30%]', desc: 'Coordenação, disciplina e confiança, com aulas adaptadas para cada idade.', list: by((c) => c.modality === 'kids') },
    { title: 'Time Pro', src: FOTO.competicao, pos: 'object-[50%_35%]', desc: `Treino de alto nível para quem compete, com o ${FOUNDER} e equipe.`, list: by((c) => c.modality === 'wrestling') },
    { title: 'Open Mat', src: FOTO.final, pos: 'object-center', desc: 'Treino livre aos sábados para revisar técnicas e treinar com a equipe toda.', list: by((c) => c.modality === 'openmat') },
  ];
  return (
    <section id="turmas" className="relative flex flex-col items-center overflow-hidden bg-white px-5 pt-[72px] pb-20 md:px-[clamp(20px,4vw,60px)] md:pt-[clamp(90px,10vw,170px)] md:pb-[clamp(90px,9.5vw,150px)]">
      <h2 data-r className="max-w-[1320px] text-center text-[clamp(30px,2.9vw,52px)] leading-[1.16] font-normal tracking-[-0.01em] text-[#0a0f1e]">
        Veja na prática como são as nossas <span className="lv-ink-grad lv-drop">turmas de verdade</span> <br className="hidden md:block" />
        treinando toda semana:
      </h2>
      <p data-r="0.1" className="mx-auto mt-6 max-w-[1200px] text-center text-[clamp(15px,1.1vw,19px)] leading-[1.55] text-balance text-[#343b45]/75">
        Cada turma nasce de um objetivo: <strong className="font-medium text-[#343b45]">aprender do zero, evoluir com segurança ou competir de verdade.</strong>
      </p>
      <div data-rg className="mt-[clamp(38px,4.2vw,64px)] grid w-[min(100%,1104px)] gap-[clamp(18px,2vw,30px)] md:grid-cols-2">
        {cards.map((c) => (
          <article
            key={c.title}
            className="group flex flex-col rounded-2xl border border-[oklch(86%_0.01_260)] bg-[#f7f9fb] p-3 pb-3.5 transition-[transform,border-color,box-shadow] duration-[450ms] ease-[cubic-bezier(0.22,0.61,0.36,1)] hover:-translate-y-[5px] hover:border-[var(--primary)]/45 hover:shadow-[0_22px_48px_rgb(94_115_143/0.22)]"
          >
            <button onClick={() => onOpen(c)} className="block aspect-[1536/700] overflow-hidden rounded-[10px]" aria-label={`Ver turma ${c.title}`}>
              <img src={c.src} alt={`Turma ${c.title}`} loading="lazy" className={clsx('h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,0.61,0.36,1)] group-hover:scale-[1.035]', c.pos)} />
            </button>
            <div className="flex items-center justify-between gap-3 px-1.5 pt-3.5">
              <div className="min-w-0">
                <h3 className="text-[clamp(14px,1.05vw,17px)] tracking-[0.01em] text-[#0a0f1e] uppercase">{c.title}</h3>
                <span className="mt-0.5 block text-[clamp(11px,0.82vw,13px)] text-[#4e5661]/70">{summary(c.list)}</span>
              </div>
              <div className="flex shrink-0 items-center gap-2.5">
                <button onClick={() => onOpen(c)} aria-label={`Ver turma ${c.title}`} className="group/v grid h-9 w-9 place-items-center rounded-full bg-[#0a0f1e] text-white transition-colors hover:bg-[var(--primary)] md:h-[30px] md:w-[30px]">
                  <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-[450ms] group-hover/v:rotate-45" />
                </button>
                <button onClick={() => onOpen(c)} className="h-11 rounded-full px-5 text-[clamp(11px,0.85vw,13.5px)] text-[#0a0f1e] transition-[background,color,transform] duration-300 hover:-translate-y-0.5 hover:bg-[#0a0f1e] hover:text-white md:h-[38px]">
                  Ver turma
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function TurmaModal({ turma, onClose }: { turma: Turma | null; onClose: () => void }) {
  useEffect(() => {
    if (!turma) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [turma, onClose]);
  if (!turma) return null;
  return (
    <div role="dialog" aria-modal aria-label={`Turma ${turma.title}`} onClick={onClose} className="pvm-fade fixed inset-0 z-[70] grid place-items-center bg-[oklch(12%_0.04_262/0.72)] p-4 backdrop-blur-md">
      <div data-lenis-prevent onClick={(e) => e.stopPropagation()} className="pvm-pop relative max-h-[90svh] w-full max-w-[880px] overflow-y-auto rounded-[22px] bg-white text-[var(--ink)] shadow-2xl">
        <button onClick={onClose} aria-label="Fechar" className="absolute top-3 right-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/90 shadow-md transition-colors hover:bg-[var(--primary)] hover:text-white">
          <X className="h-5 w-5" />
        </button>
        <img src={turma.src} alt={`Turma ${turma.title}`} className={clsx('aspect-[16/8] w-full object-cover', turma.pos)} />
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_1.15fr] md:p-8">
          <div>
            <h3 className="text-2xl uppercase">{turma.title}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-[var(--ink)]/65">{turma.desc}</p>
            <Cta tone="dark" className="mt-5">
              Agendar aula grátis
            </Cta>
          </div>
          <ul className="divide-y divide-[oklch(92%_0.01_260)] self-start rounded-2xl border border-[oklch(92%_0.01_260)]">
            {turma.list.length ? (
              turma.list.map((c) => (
                <li key={c.id} className="flex items-center gap-4 px-4 py-3.5">
                  <span className="w-16 text-xl tracking-tight">{c.time}</span>
                  <div className="min-w-0">
                    <div>{c.name}</div>
                    <div className="text-sm text-[var(--ink)]/55">
                      {daysOf(c)} · {c.duration} min · {c.professor}
                    </div>
                  </div>
                </li>
              ))
            ) : (
              <li className="px-4 py-6 text-center text-sm text-[var(--ink)]/55">Horários em breve.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Seis passos (seção fixa, linha que se desenha) ---------------- */

const STEPS = [
  { t: 'Mensagem', d: 'Chame a gente no Instagram e conte seu objetivo: começar do zero, voltar a treinar ou competir.' },
  { t: 'Aula experimental', d: 'Agendamos sua primeira aula, grátis, no horário que cabe na sua rotina.' },
  { t: 'Primeiro treino', d: 'Você treina com a turma, conhece o professor e sente na prática como é o wrestling.' },
  { t: 'Matrícula', d: 'Escolha o plano ideal e receba o acesso ao app do aluno com a sua carteirinha digital.' },
  { t: 'Check-in no app', d: 'Confirme presença pelo celular e acompanhe sua frequência e evolução a cada semana.' },
  { t: 'Evolução', d: 'Graduações, campeonatos e o Time Pro para quem quer ir além.' },
];
const STEP_POS = [
  [4.4, 16.5],
  [37, 16.5],
  [69.6, 16.5],
  [69.6, 75],
  [37, 75],
  [4.4, 75],
];
const PATH = 'M 44 66 H 950 Q 980 66 980 96 V 270 Q 980 300 950 300 H 44';

/* "EW" em pixels, no fundo da seção (como o "J" da referência) */
const PIXELS = ['11111 10001', '10000 10001', '10000 10001', '11110 10101', '10000 10101', '10000 11011', '11111 10001'];

function PixelMark({ className }: { className?: string }) {
  const cells: { x: number; y: number; k: number }[] = [];
  PIXELS.forEach((row, y) => [...row].forEach((ch, x) => ch === '1' && cells.push({ x, y, k: (x * 7 + y * 3) % 5 })));
  return (
    <svg viewBox="0 0 11 7" aria-hidden className={className}>
      {cells.map((c) => (
        <rect key={`${c.x}-${c.y}`} x={c.x} y={c.y} width={0.94} height={0.94} fill={c.k === 0 ? 'oklch(93% 0.035 60)' : 'oklch(96.5% 0.018 60)'} />
      ))}
    </svg>
  );
}

const numCls = 'grid place-items-center rounded-full bg-[linear-gradient(145deg,var(--navy-deep),oklch(52%_0.16_42)_64%,var(--primary-light))] text-white';

function Steps() {
  return (
    <div>
      <section id="passos" data-process className="relative flex min-h-svh items-center overflow-hidden bg-white px-6 py-16 md:px-[clamp(24px,6vw,112px)] md:py-16">
        <PixelMark className="pointer-events-none absolute top-[12%] right-[2.5%] hidden h-[34%] xl:block" />
        <div className="relative z-[1] mx-auto w-full max-w-[1260px]">
          <h2 data-r className="mb-10 text-[clamp(22px,6.6vw,28px)] leading-[1.08] font-normal whitespace-nowrap md:mb-[clamp(40px,6vh,75px)] md:text-[clamp(25px,2.9vw,46px)] md:whitespace-normal">
            Do primeiro contato ao tatame:
            <br />
            <span className="lv-ink-grad">Seis passos.</span>
          </h2>

          {/* desktop: caminho em S */}
          <div className="relative hidden h-[clamp(380px,46vh,490px)] w-full md:block">
            <svg viewBox="0 0 1000 400" preserveAspectRatio="none" aria-hidden className="absolute inset-0 h-full w-full overflow-visible">
              <path d={PATH} fill="none" stroke="oklch(72% 0.01 260)" strokeWidth={1.3} />
              <path data-line d={PATH} pathLength={1} fill="none" stroke="var(--primary)" strokeWidth={2.2} strokeDasharray={1} strokeDashoffset={1} />
            </svg>
            {STEPS.map((s, i) => (
              <article key={s.t} data-step className="absolute w-[26%]" style={{ left: `${STEP_POS[i][0]}%`, top: `${STEP_POS[i][1]}%` }}>
                <span className={clsx(numCls, 'absolute top-0 left-0 h-[clamp(43px,4.8vw,62px)] w-[clamp(43px,4.8vw,62px)] -translate-x-1/2 -translate-y-1/2 text-[clamp(23px,2.5vw,35px)]')}>{i + 1}</span>
                <div className="pt-12 pr-3.5">
                  <h3 className="mb-2.5 text-[clamp(18px,1.6vw,25px)] leading-[1.13]">{s.t}</h3>
                  <p className="max-w-[25ch] text-[clamp(13px,1.08vw,16px)] leading-[1.4] text-[#484e55]">{s.d}</p>
                </div>
              </article>
            ))}
          </div>

          {/* celular: linha vertical */}
          <ol data-steps-m className="relative space-y-7 md:hidden">
            <span aria-hidden className="absolute top-5 bottom-5 left-5 w-px bg-[oklch(85%_0.01_260)]" />
            <span aria-hidden data-line-m className="absolute top-5 bottom-5 left-[19.5px] w-0.5 origin-top bg-[var(--primary)]" />
            {STEPS.map((s, i) => (
              <li key={s.t} data-step-m className="relative flex gap-4">
                <span className={clsx(numCls, 'relative h-10 w-10 shrink-0 text-[23px]')}>{i + 1}</span>
                <div className="pt-1.5">
                  <h3 className="text-lg leading-tight">{s.t}</h3>
                  <p className="mt-1 text-[13px] leading-[1.45] text-[#484e55]">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}

/* ---------------- Por que a Easy (cartão escuro) ---------------- */

function Why() {
  const cards = [
    { t: 'Professor de verdade', d: `Aulas com o ${FOUNDER} e equipe: técnica de competição ensinada passo a passo, do básico ao avançado.`, src: FOTO.competicao, pos: 'object-[50%_30%]' },
    { t: 'Turmas para todas as idades', d: 'Adulto, Feminino, Kids e Time Pro. Cada turma no ritmo certo, com segurança e acompanhamento.', src: FOTO.kids, pos: 'object-[50%_35%]' },
    { t: 'Uma equipe que puxa você', d: 'Treino duro e ambiente leve: aqui todo mundo evolui junto, do iniciante ao atleta.', src: FOTO.adulto, pos: 'object-[50%_45%]' },
  ];
  return (
    <div className="bg-white px-[clamp(10px,1.4vw,24px)] py-[clamp(14px,1.6vw,26px)]">
      <section id="diferenciais" className="overflow-hidden rounded-[40px] bg-[var(--navy-deep)] px-5 py-[clamp(72px,8vw,120px)] text-white md:px-[clamp(20px,5vw,72px)]">
        <div data-r className="mx-auto mb-[clamp(44px,5vw,70px)] max-w-[960px] text-center">
          <h2 className="text-[clamp(32px,3.4vw,58px)] leading-[1.12] font-normal tracking-[-0.01em]">
            Por que você
            <br />
            deve escolher
            <br />
            <span className="lv-light-grad">treinar com a gente?</span>
          </h2>
        </div>
        <div data-rg className="mx-auto grid max-w-[1040px] gap-[clamp(16px,2vw,28px)] md:grid-cols-3">
          {cards.map((c) => (
            <article key={c.t} className="lv-why-card flex min-h-[440px] flex-col px-6 pt-8 pb-[150px] text-center md:min-h-[500px] md:pt-16">
              <div className="lv-media-fade absolute inset-x-0 bottom-0 h-[60%] overflow-hidden">
                <img src={c.src} alt="" loading="lazy" className={clsx('lv-zoom h-full w-full object-cover opacity-90', c.pos)} />
              </div>
              <div aria-hidden className="lv-glow-orb absolute -inset-x-1/4 -bottom-1/2 h-[80%] opacity-60" />
              <h3 className="relative z-[1] mb-5 text-[clamp(19px,1.6vw,24px)] leading-[1.3]">{c.t}</h3>
              <p className="relative z-[1] text-[clamp(13.5px,1vw,15px)] leading-[1.55] text-white/72">{c.d}</p>
            </article>
          ))}
        </div>
        <div data-r className="mt-[clamp(40px,4.5vw,64px)] flex justify-center">
          <Cta size="lg">Agendar aula grátis</Cta>
        </div>
      </section>
    </div>
  );
}

/* ---------------- Horários (painel com luz) + planos ---------------- */

function Schedule() {
  const { db } = useStore();
  const [day, setDay] = useState(() => weekday(todayISO()));
  const list = useMemo(() => db.classes.filter((c) => c.active && c.days.includes(day)).sort((a, b) => a.time.localeCompare(b.time)), [db.classes, day]);
  const plans = [...db.plans].sort((a, b) => Number(a.id === 'kids') - Number(b.id === 'kids') || a.months - b.months);
  const featured = 'trimestral';

  return (
    <section id="horarios" className="lv-gate2 relative overflow-hidden px-5 pt-[72px] pb-[86px] md:px-[clamp(20px,5vw,72px)] md:py-[clamp(90px,10vw,150px)]">
      <div data-r className="relative z-[1] mx-auto mb-[clamp(40px,5vw,72px)] max-w-[1240px] text-center">
        <h2 className="mb-5 text-[clamp(24px,6.8vw,30px)] leading-[1.14] font-normal tracking-[-0.01em] text-balance text-[#0a0f1e] md:text-[clamp(30px,3.2vw,58px)]">
          Treinos de manhã, tarde e noite,
          <br className="hidden md:block" /> no horário que <span className="lv-ink-grad">cabe na sua rotina</span>
        </h2>
        <p className="mx-auto max-w-[680px] text-[13px] leading-[1.6] text-balance text-[#343b45]/75 md:text-[clamp(15px,1.2vw,19px)]">
          Aulas de segunda a sábado. A grade abaixo vem direto do sistema da academia: mudou lá, muda aqui.
        </p>
      </div>

      <div data-r className="relative z-[1] mx-auto max-w-[1180px] overflow-hidden rounded-[28px] bg-white shadow-[0_40px_90px_-30px_color-mix(in_oklab,var(--primary)_60%,transparent)]">
        <div className="relative h-[300px] overflow-hidden md:absolute md:inset-0 md:h-auto">
          <video autoPlay muted loop playsInline preload="auto" poster="/site/luz-poster.webp" aria-hidden className="lv-video-orange absolute inset-0 h-full w-full object-cover object-left">
            <source src="/site/luz.webm" type="video/webm" />
          </video>
          <div className="absolute inset-x-[13px] bottom-[22px] md:hidden">
            <h3 className="mb-2.5 text-[clamp(20px,6.1vw,26px)] leading-[1.15] tracking-[-0.01em]">
              Grade da
              <br />
              semana
            </h3>
            <p className="text-[13px] leading-[1.45] tracking-[-0.01em] text-[var(--ink)]/60">
              <span className="block whitespace-nowrap">Escolha o dia para ver as aulas,</span>
              <span className="block whitespace-nowrap">os horários e quem dá cada treino.</span>
            </p>
          </div>
        </div>
        <div className="relative grid gap-5 p-3 md:min-h-[clamp(380px,36vw,500px)] md:grid-cols-[0.8fr_1.2fr] md:items-center md:p-[clamp(24px,3vw,44px)]">
          <div className="hidden px-2 md:block md:px-[clamp(0px,1vw,12px)]">
            <h3 className="text-[clamp(22px,2.4vw,38px)] leading-[1.15] tracking-[-0.01em]">
              Grade da
              <br />
              semana
            </h3>
            <p className="mt-3.5 max-w-xs text-[13px] leading-[1.55] text-[var(--ink)]/60 md:text-[clamp(13px,1vw,16px)]">Escolha o dia para ver as aulas, os horários e quem dá cada treino.</p>
          </div>
          <div className="rounded-[22px] border border-white/70 bg-white/80 p-2.5 shadow-[0_20px_50px_-20px_rgb(10_20_50/0.35)] backdrop-blur-xl md:p-3">
            <div className="grid grid-cols-7 gap-1 rounded-full bg-[oklch(96%_0.005_260)] p-1.5">
              {WEEK_ORDER.map((wd) => (
                <button
                  key={wd}
                  onClick={() => setDay(wd)}
                  className={clsx('rounded-full py-2.5 text-[12px] transition-all md:text-sm', day === wd ? 'lv-glow bg-[var(--primary)] font-medium text-white' : 'text-[var(--ink)]/55 hover:text-[var(--ink)]')}
                >
                  {WEEKDAYS_SHORT[wd]}
                </button>
              ))}
            </div>
            <div className="mt-2.5 overflow-hidden rounded-2xl bg-white">
              {list.length ? (
                <div key={day}>
                  {list.map((c, i) => (
                    <div key={c.id} style={{ animationDelay: `${i * 60}ms` }} className="flex animate-fade-in items-center gap-4 border-b border-[oklch(93%_0.01_260)] px-4 py-3.5 last:border-0 md:gap-5 md:px-5">
                      <span className="w-[60px] text-xl tracking-tight md:w-20 md:text-[28px]">{c.time}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate">{c.name}</div>
                        <div className="truncate text-sm text-[var(--ink)]/55">
                          {c.duration} min · {c.professor}
                        </div>
                      </div>
                      <span className="hidden rounded-full bg-[var(--primary)]/10 px-3 py-1 text-xs font-medium text-[oklch(52%_0.16_42)] sm:inline">{modality(c.modality).label}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="px-6 py-12 text-center text-[var(--ink)]/55">Sem aulas no {WEEKDAYS[day].toLowerCase()}: dia de descanso.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div id="planos" data-rg className="relative z-[1] mx-auto mt-[clamp(28px,3vw,40px)] grid max-w-[1180px] scroll-mt-6 grid-cols-1 gap-[clamp(14px,1.8vw,26px)] sm:grid-cols-2 lg:grid-cols-5">
        {plans.map((p) => {
          const hot = p.id === featured;
          const kids = p.id === 'kids';
          return (
            <a
              key={p.id}
              href={IG_URL}
              target="_blank"
              rel="noreferrer"
              className={clsx(
                'relative flex flex-col items-center justify-center rounded-[22px] border px-3 py-6 text-center shadow-[0_18px_40px_-24px_rgb(10_24_60/0.35)] transition-transform duration-300 hover:-translate-y-1 md:px-5 md:py-8',
                hot ? 'border-[var(--primary)] bg-[var(--primary)] text-white' : 'lv-card-bg border-[#0a142e]/10',
                kids && 'sm:col-span-2 lg:col-span-1',
              )}
            >
              {hot && <span className="absolute -top-3 rounded-full bg-[var(--ink)] px-3 py-1 text-[11px] text-white">Mais escolhido</span>}
              <h4 className={clsx('text-[clamp(16px,1.4vw,21px)]', !hot && 'text-[#0a0f1e]')}>{kids ? 'Kids' : p.name}</h4>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-[28px] leading-none tracking-tight md:text-[34px]">R$ {Math.round(p.price / p.months)}</span>
                <span className={clsx('text-sm', hot ? 'text-white/75' : 'text-[#343b45]/60')}>/mês</span>
              </div>
              <p className={clsx('mt-2 text-[13px] leading-snug', hot ? 'text-white/80' : 'text-[#343b45]/70')}>
                {kids ? 'Turma Kids' : p.months > 1 ? `${brl(p.price)} a cada ${p.months} meses` : 'Todas as turmas adultas'}
              </p>
            </a>
          );
        })}
      </div>
    </section>
  );
}

/* ---------------- Objetivo (bloco 3D da logo) ---------------- */

function Goal() {
  return (
    <section data-goal className="relative isolate overflow-hidden bg-[var(--navy-deep)] text-[oklch(97%_0.01_250)] md:min-h-[clamp(650px,85svh,900px)]">
      <div className="relative mx-auto flex w-full max-w-[1600px] flex-col items-center px-[6%] pt-[72px] md:min-h-[inherit] md:flex-row md:px-[clamp(28px,7vw,112px)] md:py-[90px]">
        <div data-r className="relative z-[2] w-full text-center md:w-[54%] md:text-left">
          <h2 className="text-[clamp(26px,7.4vw,34px)] leading-[1.05] font-normal md:text-[clamp(40px,4.6vw,72px)] md:whitespace-nowrap">
            Nosso objetivo é a
            <br />
            sua <span className="lv-light-grad">evolução.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-[460px] text-[13px] leading-[1.55] text-balance text-[#a7afb9] md:mx-0 md:mt-[30px] md:text-[clamp(16px,1.23vw,20px)]">
            Cada aluno chega com um objetivo diferente: saúde, defesa pessoal, perder peso ou competir. A gente entende o seu e monta o caminho para você chegar lá.
          </p>
        </div>
      </div>
      <div data-goal-art className="relative mx-auto aspect-square w-[min(100%,440px)] md:absolute md:top-[8%] md:right-[1%] md:w-[min(50%,720px)]">
        <div aria-hidden className="lv-glow-orb absolute inset-[12%] opacity-80" />
        <Suspense fallback={null}>
          <LogoTile3D className="relative h-full w-full" />
        </Suspense>
      </div>
    </section>
  );
}

/* ---------------- Perguntas frequentes ---------------- */

function Faq() {
  const { db } = useStore();
  const [open, setOpen] = useState<number | null>(null);
  const active = db.classes.filter((c) => c.active);
  const fem = active.filter((c) => /feminino/i.test(c.name));
  const kids = active.filter((c) => c.modality === 'kids');
  const adultPlans = db.plans.filter((p) => p.id !== 'kids').map((p) => p.name.toLowerCase());
  const qa = [
    { q: 'Preciso ter experiência para começar?', a: 'Não. A maioria dos alunos começa do zero. A turma de fundamentos ensina a base com segurança e no seu ritmo, e o professor acompanha de perto.' },
    { q: 'Como funciona a aula experimental?', a: 'É grátis. Mande uma mensagem no nosso Instagram, escolha o dia e o horário e venha com roupa de treino confortável.' },
    { q: 'O que levar para o primeiro treino?', a: 'Bermuda ou legging, camiseta ou rashguard, garrafa de água e chinelo. No tatame se treina descalço ou com sapatilha de wrestling.' },
    { q: 'Mulheres podem treinar?', a: `Claro! As turmas são mistas e ainda temos a turma Wrestling Feminino${fem.length ? ` (${summary(fem)})` : ''}.` },
    { q: 'Tem turma para crianças?', a: `Sim. A turma Kids${kids.length ? ` (${summary(kids)})` : ''} trabalha coordenação, disciplina e confiança com aulas adaptadas para cada idade.` },
    { q: 'Como funciona o pagamento?', a: `Temos planos ${adultPlans.join(', ').replace(/, ([^,]*)$/, ' e $1')}. O pagamento pode ser feito via PIX e você acompanha o vencimento pelo app do aluno.` },
    { q: 'Como faço check-in nas aulas?', a: 'Pelo app do aluno, no celular. O check-in abre 30 minutos antes da aula, e no app você também tem carteirinha digital, histórico de treinos e avisos da academia.' },
  ];
  return (
    <section id="faq" className="relative z-10 flex justify-center rounded-b-[22px] bg-[var(--navy-deep)] px-5 pt-10 pb-20 text-white md:px-[clamp(20px,4vw,60px)] md:pt-[clamp(40px,5vw,80px)] md:pb-[clamp(80px,9vw,150px)]">
      <div className="w-full max-w-[880px] text-center">
        <h2 data-r className="lv-light-grad text-[clamp(34px,4.2vw,58px)] leading-[1.08] font-normal">
          Perguntas Frequentes
        </h2>
        <div data-rg className="mt-[clamp(36px,4vw,56px)] flex flex-col gap-4 text-left">
          {qa.map((it, i) => {
            const isOpen = open === i;
            return (
              <div key={it.q} className="lv-faq-row2 rounded-[18px] transition-[filter] duration-300 hover:brightness-115">
                <button onClick={() => setOpen(isOpen ? null : i)} aria-expanded={isOpen} className="flex w-full items-center gap-4 px-[18px] py-5 text-left md:px-6">
                  <span className="flex-1 text-sm md:text-[clamp(15px,1.15vw,17px)]">{it.q}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" className={clsx('h-5 w-5 shrink-0 transition-transform duration-[450ms]', isOpen && 'rotate-180')} aria-hidden>
                    <line x1={12} y1={5} x2={12} y2={19} className={clsx('transition-opacity duration-300', isOpen && 'opacity-0')} />
                    <line x1={5} y1={12} x2={19} y2={12} />
                  </svg>
                </button>
                <div className={clsx('grid transition-[grid-template-rows] duration-[450ms]', isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
                  <div className="min-h-0 overflow-hidden">
                    <p className="px-[18px] pb-[18px] text-sm leading-[1.6] text-white/60 md:pr-[60px] md:pb-[22px] md:pl-6 md:text-[15px]">{it.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Rodapé ---------------- */

function SiteFooter() {
  const enter = useEnter();
  const link = 'flex min-h-11 w-fit items-center text-[0.95rem] text-black/70 transition-colors hover:text-black md:min-h-0';
  return (
    <footer id="contato" className="relative -mt-[22px] overflow-hidden bg-white px-6 pt-[calc(clamp(56px,7vw,90px)+22px)] pb-[clamp(96px,8vw,110px)] md:px-[clamp(24px,4vw,64px)] md:pb-[clamp(28px,3vw,44px)]">
      <div className="relative z-[2] mx-auto flex max-w-[1280px] flex-col gap-[clamp(40px,6vw,88px)]">
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-[1.4fr_1fr_1fr_1.2fr] md:gap-8">
          <div className="col-span-2 flex flex-col gap-2.5 md:col-span-1">
            <Logo size={64} className="drop-shadow-[0_0_18px_color-mix(in_oklab,var(--primary)_35%,transparent)]" />
            <p className="text-[0.85rem] text-black/55">Academia de wrestling em Fortaleza-CE</p>
          </div>
          <nav aria-label="Navegação" className="flex flex-col md:gap-3.5">
            <a href="#top" className={link}>
              Início
            </a>
            <a href="#turmas" className={link}>
              Turmas
            </a>
            <a href="#passos" className={link}>
              Como começar
            </a>
            <a href="#faq" className={link}>
              Dúvidas
            </a>
          </nav>
          <nav aria-label="Seções" className="flex flex-col md:gap-3.5">
            <a href="#sobre" className={link}>
              Sobre
            </a>
            <a href="#resultados" className={link}>
              Números
            </a>
            <a href="#diferenciais" className={link}>
              Diferenciais
            </a>
            <a href="#horarios" className={link}>
              Horários e planos
            </a>
          </nav>
          <nav aria-label="Alunos" className="col-span-2 flex flex-col gap-3 text-[0.85rem] text-black/45 md:col-span-1">
            <Link to={enter.to} className="w-fit transition-colors hover:text-black/80">
              {enter.label === 'Entrar' ? 'Entrar no sistema' : enter.label}
            </Link>
            <a href={IG_URL} target="_blank" rel="noreferrer" className="w-fit transition-colors hover:text-black/80">
              Agendar aula grátis
            </a>
            <span>Fundador {FOUNDER}</span>
          </nav>
        </div>
        <div className="flex flex-col items-start justify-between gap-5 border-t border-black/12 pt-7 md:flex-row md:items-center">
          <p className="text-[0.85rem] text-black/50">{new Date().getFullYear()} © Easy Wrestling. Todos os direitos reservados</p>
          <div className="flex items-center gap-3">
            <a href={IG_URL} target="_blank" rel="noreferrer" className="flex h-12 items-center gap-2.5 rounded-full border border-black/12 bg-black/5 py-1 pr-[18px] pl-1 text-[0.9rem] text-[#111] transition-colors hover:bg-black/9">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-black/8">
                <IgIcon className="h-5 w-5" />
              </span>
              easywrestling_
            </a>
            <a href="#top" aria-label="Voltar ao topo" className="grid h-12 w-12 place-items-center rounded-full border border-black/12 bg-black/5 text-[#111] transition-colors hover:bg-black/9">
              <ArrowUp className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ---------------- Barra flutuante ---------------- */

function FloatingBar() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const on = () => {
      const y = window.scrollY;
      const vh = window.innerHeight;
      // aparece depois do banner e sai de cena perto do rodapé
      setShow(y > vh * 0.85 && y + vh < document.documentElement.scrollHeight - 160);
    };
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return (
    <div
      aria-hidden={!show}
      className={clsx(
        'fixed right-4 z-50 flex items-center gap-5 rounded-[14px] border border-white/20 bg-black/30 py-2.5 pr-2.5 pl-4 backdrop-blur-[20px] transition-all duration-500 md:right-[30px] md:gap-6 md:py-3 md:pr-3 md:pl-[22px]',
        show ? 'bottom-4 opacity-100 md:bottom-[30px]' : 'pointer-events-none -bottom-[120px] opacity-0',
      )}
    >
      <Logo size={30} />
      <Cta shine className="h-11 max-sm:pl-4 max-sm:text-[12px]">
        Agendar aula grátis
      </Cta>
    </div>
  );
}
