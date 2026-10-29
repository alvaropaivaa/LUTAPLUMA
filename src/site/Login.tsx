import { lazy, Suspense, useRef, useState, type CSSProperties, type FormEvent, type PointerEvent, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import '@fontsource-variable/google-sans-flex';
import { ArrowLeft, ArrowUpRight, CalendarCheck, Eye, EyeOff, GraduationCap, IdCard, Lock, Mail, ShieldCheck, Smartphone, User, UserCog, type LucideIcon } from 'lucide-react';
import { useStore } from '../lib/store';
import { Avatar, Logo } from '../components/bits';
import { Button, Modal, useToast } from '../components/ui';
import type { Role } from '../lib/types';

/* three.js só carrega quando a tela abre */
const LogoTile3D = lazy(() => import('./LogoTile3D'));

export function GoogleIcon({ className = 'size-[18px]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

/* ---------------- palco 3D (lado escuro) ---------------- */

/** Cartão de vidro que flutua e acompanha o mouse (quanto maior `depth`, mais se mexe) */
function GlassChip({ icon: Icon, title, sub, className, depth, delay }: { icon: LucideIcon; title: string; sub: string; className: string; depth: number; delay: number }) {
  return (
    <div
      className={clsx('absolute z-[3] hidden transition-[translate] duration-500 ease-out xl:block', className)}
      style={{ translate: `calc(var(--mx, 0) * ${depth}px) calc(var(--my, 0) * ${depth}px)` }}
    >
      <div
        className="lv-floaty flex items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.07] py-3 pr-5 pl-3 shadow-[0_24px_60px_-24px_rgb(0_0_0/0.7)] backdrop-blur-xl"
        style={{ animationDelay: `${delay}s`, animationDuration: `${6 + delay}s` }}
      >
        <span className="lv-glow grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--primary)]">
          <Icon className="size-5 text-white" />
        </span>
        <span className="whitespace-nowrap">
          <span className="block text-[14px] text-white">{title}</span>
          <span className="block text-[12px] text-white/55">{sub}</span>
        </span>
      </div>
    </div>
  );
}

function Stage() {
  const ref = useRef<HTMLElement>(null);
  const onMove = (e: PointerEvent<HTMLElement>) => {
    const el = ref.current;
    if (!el || e.pointerType !== 'mouse') return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', (((e.clientX - r.left) / r.width - 0.5) * 2).toFixed(3));
    el.style.setProperty('--my', (((e.clientY - r.top) / r.height - 0.5) * 2).toFixed(3));
  };
  return (
    <aside
      ref={ref}
      onPointerMove={onMove}
      className="lv-spot lv-spot2 relative isolate flex flex-col overflow-hidden px-5 pt-4 pb-14 text-white lg:sticky lg:top-0 lg:h-dvh lg:w-[56%] lg:px-12 lg:py-10"
    >
      <div className="relative z-[4] flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <Logo size={42} />
          <span>
            <span className="block text-[15px]">Easy Wrestling</span>
            <span className="block text-xs text-white/55">Wrestling · Fortaleza-CE</span>
          </span>
        </Link>
        <Link to="/" className="flex h-10 items-center gap-1.5 rounded-full border border-white/25 px-4 text-[13px] text-white/85 transition-colors hover:bg-white/10 lg:hidden">
          <ArrowLeft className="size-4" /> Site
        </Link>
      </div>

      <div className="relative z-[2] mx-auto mt-2 aspect-square w-[min(70vw,290px)] lg:my-auto lg:w-[min(40vw,560px)]">
        <div aria-hidden className="lv-glow-orb absolute inset-[14%] opacity-80" />
        <Suspense fallback={<img src="/site/logo-hd.png" alt="" className="absolute inset-[30%] rounded-full" />}>
          <LogoTile3D className="relative h-full w-full" />
        </Suspense>
        <GlassChip icon={CalendarCheck} title="Check-in pelo celular" sub="Abre 30 min antes da aula" className="top-[4%] -left-[6%]" depth={-18} delay={0} />
        <GlassChip icon={IdCard} title="Carteirinha digital" sub="Sempre no seu bolso" className="top-[46%] -right-[8%]" depth={24} delay={1.2} />
        <GlassChip icon={GraduationCap} title="Faixa e frequência" sub="Sua evolução acompanhada" className="bottom-[4%] -left-[2%]" depth={-12} delay={2.1} />
      </div>

      <div className="relative z-[4] mt-1 text-center lg:mt-0 lg:text-left">
        <h1 className="text-[clamp(26px,7vw,34px)] leading-[1.08] tracking-[-0.01em] lg:text-[clamp(34px,3.1vw,52px)]">
          Seu treino e sua <span className="lv-light-grad">evolução</span>,
          <br />
          num só lugar.
        </h1>
        <p className="mx-auto mt-3 max-w-md text-[13px] leading-relaxed text-white/60 lg:mx-0 lg:text-[15px]">Check-in, carteirinha, avisos e a sua frequência: tudo no app da Easy Wrestling.</p>
        <p className="mt-8 hidden text-xs text-white/35 lg:block">© {new Date().getFullYear()} Easy Wrestling</p>
      </div>
    </aside>
  );
}

/* ---------------- formulário ---------------- */

const inputCls =
  'h-12 w-full rounded-2xl border border-[oklch(90%_0.01_260)] bg-[oklch(98.5%_0.003_260)] pr-4 pl-11 text-[15px] text-[var(--ink)] outline-none transition placeholder:text-[var(--ink)]/35 focus:border-[var(--primary)] focus:bg-white focus:ring-4 focus:ring-[var(--primary)]/15';

function InputRow({ label, icon: Icon, children }: { label: string; icon: LucideIcon; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] text-[var(--ink)]/65">{label}</span>
      <span className="relative block">
        <Icon className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-[var(--ink)]/35" />
        {children}
      </span>
    </label>
  );
}

/** Botão laranja do site: faixa azul-marinho corre por dentro e a seta gira */
function PrimaryButton({ children, onClick, type = 'button' }: { children: ReactNode; onClick?: () => void; type?: 'button' | 'submit' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      style={{ '--cta-base': 'var(--primary)', '--cta-sweep': 'var(--navy-deep)' } as CSSProperties}
      className="cta flex h-[52px] w-full items-center justify-between rounded-full bg-[var(--primary)] pr-1.5 pl-6 text-[15px] text-white shadow-[0_16px_34px_-14px_var(--primary)] transition-transform duration-300 hover:-translate-y-0.5"
    >
      <span aria-hidden className="cta-fill cta-fill--a" />
      <span aria-hidden className="cta-fill cta-fill--b" />
      <span>{children}</span>
      <span className="cta-chip grid size-10 place-items-center rounded-full bg-white text-[var(--primary)]">
        <ArrowUpRight className="size-4" />
      </span>
    </button>
  );
}

function DemoCard({ icon: Icon, title, sub, tone, onClick }: { icon: LucideIcon; title: string; sub: string; tone: 'orange' | 'navy'; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-3 rounded-2xl border border-[oklch(91%_0.01_260)] bg-white p-3 text-left transition duration-300 hover:-translate-y-0.5 hover:border-[var(--primary)]/45 hover:shadow-[0_16px_34px_-20px_rgb(10_20_50/0.45)]"
    >
      <span className={clsx('grid size-10 shrink-0 place-items-center rounded-xl', tone === 'orange' ? 'bg-[var(--primary)]/12 text-[var(--primary)]' : 'bg-[var(--navy-deep)] text-white')}>
        <Icon className="size-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] text-[var(--ink)]">{title}</span>
        <span className="block text-[12px] text-[var(--ink)]/50">{sub}</span>
      </span>
      <ArrowUpRight className="size-4 text-[var(--ink)]/30 transition group-hover:rotate-45 group-hover:text-[var(--primary)]" />
    </button>
  );
}

export default function Login() {
  const { db, me, login, signUp, loginWithGoogle, logout } = useStore();
  const navigate = useNavigate();
  const loc = useLocation();
  const toast = useToast();
  const [mode, setMode] = useState<'entrar' | 'criar'>('entrar');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [google, setGoogle] = useState(false);
  const [gName, setGName] = useState('');
  const [gEmail, setGEmail] = useState('');

  const hasProfessor = db.students.some((s) => s.role === 'professor');
  const from = (loc.state as { from?: string } | null)?.from;
  const go = (role: Role) => navigate(from && (role === 'professor' || !from.startsWith('/painel')) ? from : role === 'professor' ? '/painel' : '/app', { replace: true });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (mode === 'entrar') {
      const r = login(email, password);
      if (!r.ok) return setError(r.error);
      go(r.value);
    } else {
      if (!name.trim()) return setError('Informe seu nome.');
      if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Informe um e-mail válido.');
      if (password.length < 6) return setError('A senha precisa ter pelo menos 6 caracteres.');
      const r = signUp({ name, email, password, provider: 'email' });
      if (!r.ok) return setError(r.error);
      toast(r.value === 'professor' ? 'Conta criada! Você é o professor (administrador).' : 'Conta criada! Bem-vindo à Easy Wrestling.');
      go(r.value);
    }
  };

  const quick = (mail: string) => {
    const r = login(mail, '123456');
    if (!r.ok) return toast(r.error, 'error');
    go(r.value);
  };

  const googleAccounts = db.accounts
    .slice(0, 4)
    .map((a) => ({ a, s: db.students.find((s) => s.id === a.studentId) }))
    .filter((x) => x.s);

  const chooseGoogle = (mail: string, nm: string) => {
    const r = loginWithGoogle(mail, nm);
    if (!r.ok) return toast(r.error, 'error');
    setGoogle(false);
    go(r.value);
  };

  const demoProf = db.accounts.find((a) => a.email === 'professor@easywrestling.com.br');
  const demoStudent = db.accounts.find((a) => a.email === 'lucas.martins@email.com');

  return (
    <div className="site-lv flex min-h-dvh flex-col bg-[var(--navy-deep)] text-[var(--ink)] antialiased lg:flex-row">
      <Stage />

      {/* Folha branca com o formulário */}
      <main className="relative z-10 -mt-7 flex flex-1 flex-col rounded-t-[28px] bg-white px-5 pt-6 pb-10 sm:px-10 lg:mt-0 lg:min-h-dvh lg:rounded-t-none lg:rounded-l-[40px] lg:px-14 lg:py-8">
        <Link to="/" className="hidden items-center gap-1.5 self-start text-[13px] text-[var(--ink)]/55 transition-colors hover:text-[var(--ink)] lg:inline-flex">
          <ArrowLeft className="size-4" /> Voltar ao site
        </Link>

        <div className="pvm-pop mx-auto my-auto w-full max-w-[400px] py-4 lg:py-8">
          <span className="inline-block rounded-full border border-[var(--ink)]/20 px-4 py-1.5 text-[11px] tracking-[0.14em] uppercase">Área do aluno</span>
          <h2 className="mt-4 text-[clamp(28px,7vw,36px)] leading-[1.08] tracking-[-0.01em]">
            {mode === 'entrar' ? (
              <>
                Bem-vindo <span className="lv-ink-grad">de volta</span>
              </>
            ) : (
              <>
                Crie sua <span className="lv-ink-grad">conta</span>
              </>
            )}
          </h2>
          <p className="mt-2 text-[14px] text-[var(--ink)]/55">{mode === 'entrar' ? 'Entre para acessar o painel ou o app do aluno.' : 'Leva menos de um minuto.'}</p>

          {me ? (
            <div className="mt-8 rounded-3xl border border-[oklch(91%_0.01_260)] bg-[oklch(98.5%_0.003_260)] p-6 text-center">
              <Avatar name={me.name} src={me.photo} size={60} className="mx-auto" />
              <p className="mt-3 text-sm text-[var(--ink)]/55">Você já está conectado como</p>
              <p className="text-[17px]">{me.name}</p>
              <div className="mt-5 grid gap-2">
                <PrimaryButton onClick={() => go(me.role)}>{me.role === 'professor' ? 'Ir para o painel' : 'Abrir o app'}</PrimaryButton>
                <button onClick={logout} className="h-11 rounded-full text-[14px] text-[var(--ink)]/60 transition-colors hover:bg-[oklch(96%_0.005_260)] hover:text-[var(--ink)]">
                  Entrar com outra conta
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="relative mt-7 mb-6 grid grid-cols-2 rounded-full bg-[oklch(96%_0.005_260)] p-1.5">
                <span
                  aria-hidden
                  className={clsx(
                    'absolute inset-y-1.5 left-1.5 w-[calc(50%-6px)] rounded-full bg-[var(--navy-deep)] shadow-[0_8px_20px_-8px_rgb(10_20_50/0.6)] transition-transform duration-500 ease-[cubic-bezier(0.22,0.61,0.36,1)]',
                    mode === 'criar' && 'translate-x-full',
                  )}
                />
                {(['entrar', 'criar'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      setMode(m);
                      setError('');
                    }}
                    className={clsx('relative z-[1] rounded-full py-2.5 text-[14px] transition-colors duration-300', mode === m ? 'text-white' : 'text-[var(--ink)]/55 hover:text-[var(--ink)]')}
                  >
                    {m === 'entrar' ? 'Entrar' : 'Criar conta'}
                  </button>
                ))}
              </div>

              <form onSubmit={submit} className="space-y-4">
                {mode === 'criar' && (
                  <InputRow label="Nome completo" icon={User}>
                    <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" autoComplete="name" />
                  </InputRow>
                )}
                <InputRow label="E-mail" icon={Mail}>
                  <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" autoComplete="email" />
                </InputRow>
                <InputRow label="Senha" icon={Lock}>
                  <input
                    className={clsx(inputCls, 'pr-12')}
                    type={show ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'criar' ? 'Mínimo de 6 caracteres' : '••••••'}
                    autoComplete={mode === 'criar' ? 'new-password' : 'current-password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    className="absolute top-1/2 right-3 grid size-8 -translate-y-1/2 place-items-center rounded-full text-[var(--ink)]/40 transition-colors hover:bg-[oklch(95%_0.005_260)] hover:text-[var(--ink)]"
                    aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </InputRow>

                {mode === 'entrar' && (
                  <div className="text-right">
                    <button type="button" onClick={() => toast('Recuperação de senha é simulada nesta demonstração.', 'info')} className="text-[13px] text-[oklch(55%_0.16_42)] hover:text-[var(--primary)]">
                      Esqueci minha senha
                    </button>
                  </div>
                )}

                {mode === 'criar' && (
                  <p className="flex items-start gap-2.5 rounded-2xl bg-[var(--primary)]/[0.07] px-4 py-3 text-[13px] leading-snug text-[var(--ink)]/75 ring-1 ring-[var(--primary)]/20">
                    <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[var(--primary)]" />
                    {hasProfessor
                      ? 'Sua conta será de aluno, com plano mensal padrão. Se o professor já te cadastrou, use o mesmo e-mail.'
                      : 'Nenhuma conta ainda: você será o professor (administrador) da academia.'}
                  </p>
                )}

                {error && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-[13px] text-rose-700 ring-1 ring-rose-200">{error}</p>}

                <PrimaryButton type="submit">{mode === 'entrar' ? 'Entrar' : 'Criar conta'}</PrimaryButton>
              </form>

              <div className="my-6 flex items-center gap-3 text-xs text-[var(--ink)]/40">
                <span className="h-px flex-1 bg-[oklch(91%_0.01_260)]" /> ou <span className="h-px flex-1 bg-[oklch(91%_0.01_260)]" />
              </div>

              <button
                onClick={() => setGoogle(true)}
                className="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-[oklch(90%_0.01_260)] bg-white text-[14px] text-[var(--ink)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-20px_rgb(10_20_50/0.5)]"
              >
                <GoogleIcon /> Continuar com Google
              </button>

              {(demoProf || demoStudent) && (
                <div className="mt-8 border-t border-[oklch(92%_0.01_260)] pt-5">
                  <p className="text-[12px] tracking-[0.08em] text-[var(--ink)]/50 uppercase">Acesso rápido de demonstração</p>
                  <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                    {demoProf && <DemoCard icon={UserCog} title="Professor" sub="Painel" tone="orange" onClick={() => quick(demoProf.email)} />}
                    {demoStudent && <DemoCard icon={Smartphone} title="Aluno" sub="App do celular" tone="navy" onClick={() => quick(demoStudent.email)} />}
                  </div>
                  <p className="mt-3 text-[11px] text-[var(--ink)]/40">professor@easywrestling.com.br · senha 123456</p>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Modal open={google} onClose={() => setGoogle(false)} title="Continuar com Google" subtitle="Simulação — escolha uma conta" size="sm" icon={Mail}>
        <div className="space-y-1.5">
          {googleAccounts.map(({ a, s }) => (
            <button key={a.email} onClick={() => chooseGoogle(a.email, s!.name)} className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left ring-1 ring-line transition hover:bg-paper">
              <Avatar name={s!.name} src={s!.photo} size={34} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink">{s!.name}</span>
                <span className="block truncate text-xs text-muted">{a.email}</span>
              </span>
              {s!.role === 'professor' && <span className="rounded-full bg-paper-2 px-2 py-0.5 text-[10px] text-ink-2">Professor</span>}
            </button>
          ))}
        </div>
        <div className="mt-5 border-t border-line pt-4">
          <p className="mb-2 text-xs font-medium text-ink-2">Usar outra conta Google</p>
          <div className="space-y-2">
            <input className="field" placeholder="Seu nome" value={gName} onChange={(e) => setGName(e.target.value)} />
            <input className="field" placeholder="voce@gmail.com" type="email" value={gEmail} onChange={(e) => setGEmail(e.target.value)} />
            <Button className="w-full" variant="secondary" disabled={!gName.trim() || !/^\S+@\S+\.\S+$/.test(gEmail)} onClick={() => chooseGoogle(gEmail, gName)}>
              <GoogleIcon className="size-4" /> Continuar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
