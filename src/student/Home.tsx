import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { AlertTriangle, ArrowUpRight, Bell, BellRing, CalendarClock, CalendarX2, Check, ChevronRight, Clock, Download, Fingerprint, IdCard, Lock, X, type LucideIcon } from 'lucide-react';
import { useNow, useStore } from '../lib/store';
import { checkinsOf, countInRange, nextClassFor, streakWeeks, studentStatus } from '../lib/selectors';
import { addDays, diffDays, fmtShort, greeting, monthName, parseISO, startOfMonth, startOfWeek, timeToMin, WEEKDAYS, WEEKDAYS_LETTER } from '../lib/dates';
import { belt as beltDef } from '../lib/belts';
import { Avatar, BeltBar, Logo, ModalityTag } from '../components/bits';
import { Button, useToast } from '../components/ui';
import { useInstall } from '../lib/install';
import type { ClassItem, Student } from '../lib/types';
import { useStudentCtx } from './StudentLayout';
import { appPath, HeaderPhoto, InstallSheet, NoticeCard, PHOTOS, PillCta, SectionTitle, useClassState, useNotify } from './parts';
import { useAlerts } from './alerts';
import { NotificationsSheet } from './Notifications';

const INSTALL_DISMISSED = 'easy-wrestling:install-dismissed';
const NOTIFY_DISMISSED = 'easy-wrestling:notify-dismissed';

export default function Home() {
  const { db } = useStore();
  const { today, time, nowMin } = useNow();
  const { student } = useStudentCtx();
  const navigate = useNavigate();
  const [allNotices, setAllNotices] = useState(false);
  const install = useInstall();
  const [hidden, setHidden] = useState(() => ({
    install: localStorage.getItem(INSTALL_DISMISSED) === '1',
    notify: localStorage.getItem(NOTIFY_DISMISSED) === '1',
  }));
  const dismiss = (key: 'install' | 'notify') => {
    localStorage.setItem(key === 'install' ? INSTALL_DISMISSED : NOTIFY_DISMISSED, '1');
    setHidden((h) => ({ ...h, [key]: true }));
  };
  const showInstall = !hidden.install && (install.canPrompt || install.iosSteps);
  const notify = useNotify(student);
  // ativar notificações vem primeiro; no iPhone (só funciona instalado) o convite é o de instalar
  const showNotify = !hidden.notify && !notify.on && notify.perm === 'default';
  const alerts = useAlerts(student);
  const [bell, setBell] = useState({ open: false, seen: '' });

  const d = useMemo(() => {
    const list = checkinsOf(db, student.id);
    const week0 = startOfWeek(today);
    // comparação justa: mês passado até o mesmo dia
    const lmStart = startOfMonth(addDays(startOfMonth(today), -1));
    const lmEnd = addDays(startOfMonth(today), -1);
    const lmSameDay = addDays(lmStart, parseISO(today).getDate() - 1);
    return {
      list,
      month: countInRange(list, startOfMonth(today), today),
      lastMonthName: monthName(lmStart),
      lastSame: countInRange(list, lmStart, lmSameDay > lmEnd ? lmEnd : lmSameDay),
      week: countInRange(list, week0, addDays(week0, 6)),
      streak: streakWeeks(list, today),
      days: Array.from({ length: 7 }, (_, i) => {
        const date = addDays(week0, i);
        return { date, trained: list.some((k) => k.date === date) };
      }),
    };
  }, [db, student.id, today]);

  const status = studentStatus(student, today);
  const goal = Math.max(1, student.weeklyGoal);
  const next = nextClassFor(db, today, nowMin, student);
  const notices = db.notices.slice().sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt));
  const dueIn = student.dueDate ? diffDays(today, student.dueDate) : null;
  const claimed = db.pixClaims.some((c) => c.studentId === student.id);
  const diff = d.month - d.lastSame;

  // Notificações não lidas (por aparelho); abrir o sininho marca tudo como lido
  const seenKey = `easy-wrestling:seen:${student.id}`;
  const [seen, setSeen] = useState(() => localStorage.getItem(seenKey) ?? '');
  const unread = alerts.filter((a) => a.at > seen).length;
  const openBell = () => {
    setBell({ open: true, seen });
    const now = new Date().toISOString();
    localStorage.setItem(seenKey, now);
    setSeen(now);
  };

  return (
    <div className="animate-fade-in">
      {/* Faixa azul-marinho com a foto da academia: saudação + resumo do mês */}
      <div className="relative overflow-hidden bg-navy-900 px-5 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-[5.5rem] text-white">
        <HeaderPhoto src={PHOTOS.hero} position="62% 22%" />
        <header className="relative flex items-center gap-2.5">
          <button onClick={() => navigate(appPath('/app/perfil'))} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label="Abrir perfil">
            <Avatar name={student.name} src={student.photo} size={44} className="ring-2 ring-white/20" />
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] text-white/65">{greeting(time)},</span>
              <span className="block truncate text-[19px] leading-tight font-medium">{student.name.split(' ').slice(0, 2).join(' ')}</span>
            </span>
          </button>
          <Logo size={40} className="mr-1" />
          <HeaderButton icon={IdCard} label="Carteirinha" onClick={() => navigate(appPath('/app/carteirinha'))} />
          <HeaderButton icon={Bell} label="Notificações" onClick={openBell} badge={unread} />
        </header>

        <p className="app-eyebrow relative mt-9 text-white/60">Treinos em {monthName(today)}</p>
        <div className="relative mt-2 flex items-end justify-between gap-4">
          <p className="tnum text-[68px] leading-[0.9] font-light tracking-tight">{d.month}</p>
          <p className="mb-1 flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/80 ring-1 ring-white/15 backdrop-blur">
            {diff > 0 && <ArrowUpRight className="size-3.5 text-brand-400" />}
            {diff > 0 ? `${diff} a mais que em ${d.lastMonthName}` : diff === 0 ? `Mesmo ritmo de ${d.lastMonthName}` : `${d.lastMonthName.replace(/^./, (c) => c.toUpperCase())} até hoje: ${d.lastSame}`}
          </p>
        </div>

        <dl className="relative mt-7 grid grid-cols-3 border-t border-white/12 pt-4">
          <Mini label="Sequência">
            {d.streak} {d.streak === 1 ? 'semana' : 'semanas'}
          </Mini>
          <Mini label="Faixa" icon={<BeltBar belt={student.belt} degree={student.degree} className="w-6 shrink-0" height={6} />}>
            {beltDef(student.belt).label}
            {student.degree ? ` · ${student.degree}º` : ''}
          </Mini>
          <Mini label="Plano">
            <span className={clsx(dueIn !== null && dueIn < 0 ? 'text-rose-300' : dueIn !== null && dueIn <= 5 ? 'text-amber-300' : '')}>
              {student.dueDate ? (dueIn! < 0 ? 'Vencido' : `Vence ${fmtShort(student.dueDate)}`) : student.role === 'professor' ? 'Equipe' : '—'}
            </span>
          </Mini>
        </dl>
      </div>

      {/* O cartão da próxima aula flutua sobre a borda da faixa */}
      <div className="relative -mt-14 space-y-6 px-5">
        {next ? <NextClassCard student={student} cls={next.cls} date={next.date} /> : <NoClassCard />}

        {status === 'inativo' && <Banner tone="slate" icon={Lock} title="Matrícula inativa" text="O check-in está bloqueado. Fale com o professor para reativar." />}
        {status === 'atrasado' && (
          <Banner
            tone="rose"
            icon={AlertTriangle}
            title="Mensalidade atrasada"
            text={claimed ? `Venceu em ${fmtShort(student.dueDate!)}. PIX informado — falta a academia confirmar.` : `Venceu em ${fmtShort(student.dueDate!)}. Toque para pagar com PIX pelo app.`}
            onClick={() => navigate(appPath('/app/financeiro'))}
          />
        )}

        {showNotify ? <NotifyPrompt onEnable={notify.enable} onDismiss={() => dismiss('notify')} /> : showInstall && <InstallCard onDismiss={() => dismiss('install')} />}

        {/* Semana + meta */}
        <section className="card-soft p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[17px] font-medium text-ink">Sua semana</h2>
            <span className={clsx('text-[13px]', d.week >= goal ? 'font-medium text-emerald-600' : 'text-muted')}>
              {d.week >= goal ? 'Meta batida!' : (
                <>
                  <b className="font-medium text-ink">{d.week}</b> de {goal} treinos
                </>
              )}
            </span>
          </div>
          <div className="mt-5 flex justify-between">
            {d.days.map(({ date, trained }) => {
              const isToday = date === today;
              const future = date > today;
              return (
                <div key={date} className="flex flex-col items-center gap-2">
                  <span className={clsx('text-[11px]', isToday ? 'font-medium text-brand-600' : 'text-faint')}>{WEEKDAYS_LETTER[parseISO(date).getDay()]}</span>
                  <span
                    className={clsx(
                      'grid size-10 place-items-center rounded-full text-[13px] transition',
                      trained ? 'bg-navy-900 text-white' : isToday ? 'text-ink ring-2 ring-brand-500' : future ? 'text-faint' : 'bg-paper text-muted',
                    )}
                  >
                    {trained ? <Check className="size-4 text-brand-400" strokeWidth={3} /> : parseISO(date).getDate()}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-5 flex gap-1.5">
            {Array.from({ length: goal }, (_, i) => (
              <span key={i} className={clsx('h-1.5 flex-1 rounded-full', i < d.week ? (d.week >= goal ? 'bg-emerald-500' : 'bg-brand-500') : 'bg-paper-2')} />
            ))}
          </div>
        </section>

        {/* Avisos */}
        <section id="avisos" className="scroll-mt-4">
          <SectionTitle
            action={
              <span className="flex items-center gap-3">
                <NotifySwitch student={student} />
                {notices.length > 2 && (
                  <button onClick={() => setAllNotices((v) => !v)} className="text-[13px] font-medium text-brand-600">
                    {allNotices ? 'Ver menos' : `Ver todos (${notices.length})`}
                  </button>
                )}
              </span>
            }
          >
            Avisos da academia
          </SectionTitle>
          {notices.length ? (
            <div className="space-y-3">
              {(allNotices ? notices : notices.slice(0, 2)).map((n) => (
                <NoticeCard key={n.id} notice={n} unread={n.createdAt > seen} clamp={!allNotices} />
              ))}
            </div>
          ) : (
            <p className="card-soft p-5 text-center text-[13px] text-muted">Nenhum aviso por enquanto.</p>
          )}
        </section>
      </div>

      <NotificationsSheet open={bell.open} onClose={() => setBell((b) => ({ ...b, open: false }))} student={student} seen={bell.seen} />
    </div>
  );
}

function HeaderButton({ icon: Icon, label, onClick, badge = 0 }: { icon: LucideIcon; label: string; onClick: () => void; badge?: number }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} className="relative grid size-10 shrink-0 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/15 backdrop-blur transition hover:bg-white/15">
      <Icon className="size-[18px]" />
      {badge > 0 && <span className="tnum absolute -top-1 -right-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brand-500 px-1 text-[10px] font-semibold ring-2 ring-navy-900">{badge}</span>}
    </button>
  );
}

function Mini({ label, icon, children }: { label: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <div className="min-w-0 border-white/12 px-3 first:pl-0 [&+&]:border-l">
      <dt className="flex items-center gap-1.5 text-[11px] text-white/55">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 truncate text-[15px] font-medium">{children}</dd>
    </div>
  );
}

/** "em 25 min" / "em 1h 40min" */
function untilLabel(min: number) {
  if (min < 60) return `em ${Math.max(1, min)} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `em ${h}h${m ? ` ${m}min` : ''}`;
}

/** Destaque do Início: a próxima aula e o que dá para fazer com ela agora */
function NextClassCard({ student, cls, date }: { student: Student; cls: ClassItem; date: string }) {
  const { today, nowMin } = useNow();
  const { openCheckin } = useStudentCtx();
  const navigate = useNavigate();
  const { info, done, canCheck } = useClassState(student, cls, date);
  const day = date === today ? 'Hoje' : date === addDays(today, 1) ? 'Amanhã' : WEEKDAYS[parseISO(date).getDay()];

  let action: ReactNode;
  if (done) {
    action = (
      <Status className="bg-emerald-50 text-emerald-700">
        <Check className="size-4" strokeWidth={2.5} /> Check-in feito às {done.time}
      </Status>
    );
  } else if (canCheck) {
    action = (
      <PillCta icon={Fingerprint} onClick={() => openCheckin(cls)}>
        Fazer check-in
      </PillCta>
    );
  } else if (info.status === 'aberta') {
    action = (
      <Status className="bg-paper text-muted">
        <Lock className="size-4" /> Check-in bloqueado
      </Status>
    );
  } else if (date === today) {
    action = (
      <Status className="bg-paper text-ink-2">
        <Clock className="size-4 text-muted" /> Check-in abre às {info.opensAt}
        <span className="text-muted">· {untilLabel(timeToMin(info.opensAt) - nowMin)}</span>
      </Status>
    );
  } else {
    action = (
      <Status className="bg-paper text-ink-2">
        <CalendarClock className="size-4 text-muted" /> {day} · check-in abre às {info.opensAt}
      </Status>
    );
  }

  return (
    <section className="card-soft rounded-[28px] p-5">
      <div className="flex items-center justify-between">
        <p className={clsx('app-eyebrow flex items-center gap-1.5', info.status === 'aberta' && !done ? 'text-emerald-600' : 'text-muted')}>
          {info.status === 'aberta' && !done && <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />}
          {info.status === 'aberta' ? 'Aula aberta agora' : `Próxima aula · ${day}`}
        </p>
        <button onClick={() => navigate(appPath('/app/aulas'))} className="-mr-1 inline-flex items-center text-[13px] font-medium text-brand-600">
          Agenda <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="mt-4 flex items-center gap-4">
        <span className="tnum text-[44px] leading-none font-light tracking-tight text-ink">{cls.time}</span>
        <div className="min-w-0 flex-1 border-l border-line pl-4">
          <p className="truncate text-[17px] font-medium text-ink">{cls.name}</p>
          <ModalityTag modality={cls.modality} className="mt-1.5" />
          <p className="mt-1.5 truncate text-xs text-muted">
            com {cls.professor.split(' ')[0]} · até {info.endsAt}
          </p>
        </div>
      </div>
      <div className="mt-5">{action}</div>
    </section>
  );
}

function Status({ className, children }: { className: string; children: ReactNode }) {
  return <div className={clsx('flex h-14 items-center justify-center gap-1.5 rounded-full text-[14px] font-medium', className)}>{children}</div>;
}

function NoClassCard() {
  return (
    <section className="card-soft flex items-center gap-3 rounded-[28px] p-5">
      <span className="grid size-11 place-items-center rounded-full bg-paper-2 text-faint">
        <CalendarX2 className="size-5" />
      </span>
      <div>
        <p className="text-[15px] font-medium text-ink">Sem aulas nos próximos dias</p>
        <p className="text-xs text-muted">Fique de olho nos avisos da academia.</p>
      </div>
    </section>
  );
}

/** Convite para instalar o app (Android: pedido do sistema; iPhone: passo a passo) */
function InstallCard({ onDismiss }: { onDismiss: () => void }) {
  const install = useInstall();
  const toast = useToast();
  const [steps, setSteps] = useState(false);
  const onInstall = async () => {
    if (install.iosSteps) return setSteps(true);
    if (await install.prompt()) toast('App instalado na tela inicial.');
  };
  return (
    <Prompt icon={Download} title="Instale o app" text="Check-in mais rápido e avisos da academia." onDismiss={onDismiss}>
      <Button size="sm" onClick={onInstall}>
        Instalar
      </Button>
      <InstallSheet open={steps} onClose={() => setSteps(false)} />
    </Prompt>
  );
}

/** Convite para ativar as notificações; só aparece quando dá para ativar (bloqueadas ficam no sininho e no Perfil) */
function NotifyPrompt({ onEnable, onDismiss }: { onEnable: () => void; onDismiss: () => void }) {
  return (
    <Prompt icon={BellRing} title="Ative as notificações" text="Avisos, check-in aberto e lembrete da mensalidade." onDismiss={onDismiss}>
      <Button size="sm" onClick={onEnable}>
        Ativar
      </Button>
    </Prompt>
  );
}

function Prompt({ icon: Icon, title, text, onDismiss, children }: { icon: LucideIcon; title: string; text: string; onDismiss: () => void; children: ReactNode }) {
  return (
    <div className="card-soft relative flex items-center gap-3 p-4 pr-10">
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-500">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-medium text-ink">{title}</p>
        <p className="text-xs text-muted">{text}</p>
      </div>
      {children}
      <button onClick={onDismiss} aria-label="Agora não" title="Agora não" className="absolute top-2 right-2 grid size-7 place-items-center rounded-full text-faint hover:bg-paper">
        <X className="size-3.5" />
      </button>
    </div>
  );
}

/** Liga/desliga rápido, ao lado do título dos avisos */
function NotifySwitch({ student }: { student: Student }) {
  const { on, disable } = useNotify(student);
  if (!on) return null;
  return (
    <button onClick={disable} className="inline-flex items-center gap-1 text-xs text-emerald-600" title="Desativar notificações">
      <BellRing className="size-3.5" /> Ativas
    </button>
  );
}

function Banner({ tone, icon: Icon, title, text, onClick }: { tone: 'rose' | 'slate'; icon: LucideIcon; title: string; text: string; onClick?: () => void }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag onClick={onClick} className={clsx('flex w-full items-center gap-3 rounded-3xl p-4 text-left', tone === 'rose' ? 'bg-rose-50 text-rose-900' : 'bg-slate-100 text-slate-800')}>
      <span className={clsx('grid size-11 shrink-0 place-items-center rounded-full', tone === 'rose' ? 'bg-white text-rose-600' : 'bg-white text-slate-500')}>
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-medium">{title}</p>
        <p className="mt-0.5 text-[13px] opacity-80">{text}</p>
      </div>
      {onClick && <ChevronRight className="size-4 shrink-0 opacity-60" />}
    </Tag>
  );
}
