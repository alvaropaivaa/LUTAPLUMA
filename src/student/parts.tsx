import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { ArrowLeft, ArrowUpRight, CalendarClock, Check, Clock, Lock, Megaphone, Pin, Share, SquarePlus, Sparkles, X, type LucideIcon } from 'lucide-react';
import { useNow, useStore } from '../lib/store';
import { canCheckIn, classesFor, findCheckin, nextClassFor, sessionInfo } from '../lib/selectors';
import { fmtAgo, WEEKDAYS } from '../lib/dates';
import { askNotifyPermission, notifyPermission, showNotification, type NotifyState } from '../lib/notify';
import { Logo, ModalityTag } from '../components/bits';
import { Button, useToast } from '../components/ui';
import type { ClassItem, Notice, Student } from '../lib/types';

/** Mantém o "?as=" da prévia do painel ao navegar dentro do app */
export const appPath = (path: string) => path + window.location.search;

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-[17px] font-medium text-ink">{children}</h2>
      {action}
    </div>
  );
}

/** Volta no histórico; se a tela foi aberta direto (sem histórico), vai para `fallback` */
export function useBack(fallback: string) {
  const navigate = useNavigate();
  return () => ((window.history.state?.idx ?? 0) > 0 ? navigate(-1) : navigate(appPath(fallback)));
}

/** Botão principal no estilo do site: pílula laranja com a bolinha branca e o ícone à direita */
export function PillCta({ children, icon: Icon = ArrowUpRight, onClick, className, tone = 'brand' }: { children: ReactNode; icon?: LucideIcon; onClick?: () => void; className?: string; tone?: 'brand' | 'navy' }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'group flex h-14 w-full items-center justify-between rounded-full pr-2 pl-6 text-[15px] font-medium text-white transition active:scale-[0.99]',
        tone === 'brand' ? 'bg-brand-500 hover:bg-brand-600' : 'bg-navy-900 hover:bg-navy-800',
        className,
      )}
    >
      {children}
      <span className={clsx('grid size-10 place-items-center rounded-full bg-white', tone === 'brand' ? 'text-brand-500' : 'text-navy-900')}>
        <Icon className="size-5 transition-transform duration-300 group-hover:-rotate-12" strokeWidth={2.2} />
      </span>
    </button>
  );
}

/** Fotos reais da academia (as mesmas do site) usadas no topo das telas */
export const PHOTOS = { hero: '/fotos/hero.jpg', adulto: '/fotos/adulto.jpg', competicao: '/fotos/competicao.jpg', kids: '/fotos/kids.jpg' };

/** Foto da academia escurecida pelo azul, atrás do conteúdo da faixa */
export function HeaderPhoto({ src, position = 'center' }: { src: string; position?: string }) {
  return (
    <>
      <img src={src} alt="" aria-hidden className="app-photo" style={{ objectPosition: position }} />
      <div className="app-photo-fade" />
    </>
  );
}

/** Faixa azul-marinho do topo das telas; `back` mostra a seta de voltar */
export function AppHeader({ eyebrow, title, subtitle, back, photo, children }: { eyebrow?: string; title: string; subtitle?: ReactNode; back?: string; photo?: string; children?: ReactNode }) {
  const goBack = useBack(back ?? '/app');
  return (
    <header className="relative overflow-hidden bg-navy-900 px-5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-11 text-white">
      {photo && <HeaderPhoto src={photo} />}
      <div className="relative flex items-center gap-3">
        {back && (
          <button onClick={goBack} aria-label="Voltar" className="grid size-10 shrink-0 place-items-center rounded-full bg-white/10 ring-1 ring-white/15 backdrop-blur transition hover:bg-white/15">
            <ArrowLeft className="size-5" />
          </button>
        )}
        <div className="min-w-0">
          {eyebrow && <p className="app-eyebrow text-white/60">{eyebrow}</p>}
          <h1 className="mt-1 text-[28px] leading-tight font-normal">{title}</h1>
          {subtitle && <p className="mt-0.5 text-[13px] text-white/65">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="relative">{children}</div>}
    </header>
  );
}

/** Folha que sobe de baixo (check-in, PIX, edição de dados...) */
export function BottomSheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="app-lv fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div className="pb-safe scrollbar-none relative max-h-[92dvh] w-full max-w-[480px] overflow-y-auto rounded-t-[32px] bg-white px-5 pt-3 animate-slide-up">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line-strong" />
        <button onClick={onClose} className="absolute top-4 right-4 grid size-9 place-items-center rounded-full bg-paper text-muted" aria-label="Fechar">
          <X className="size-4" />
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}

/** Notificações do celular: permissão do navegador + preferência do aluno */
export function useNotify(student: Student) {
  const { db, setPushOptIn } = useStore();
  const toast = useToast();
  // a permissão é lida a cada render (outro componente pode ter acabado de pedir); o estado só força o redesenho
  const [, rerender] = useState(0);
  const perm: NotifyState = notifyPermission();
  const on = perm === 'granted' && db.pushOptIn.includes(student.id);

  const enable = async () => {
    const p = await askNotifyPermission();
    rerender((n) => n + 1);
    if (p === 'granted') {
      setPushOptIn(student.id, true);
      showNotification('Notificações ativadas', 'Você vai receber os avisos da academia por aqui.', 'ew-welcome');
      toast('Notificações ativadas.');
    } else if (p === 'denied') toast('As notificações foram bloqueadas no navegador.', 'error');
  };
  const disable = () => {
    setPushOptIn(student.id, false);
    toast('Notificações desativadas.', 'info');
  };
  return { perm, on, enable, disable };
}

/** Passo a passo para instalar no iPhone (Safari não tem botão de instalar) */
export function InstallSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const steps = [
    { icon: Share, text: (<>Toque em <b className="font-medium text-ink">Compartilhar</b> na barra do Safari</>) },
    { icon: SquarePlus, text: (<>Escolha <b className="font-medium text-ink">Adicionar à Tela de Início</b></>) },
    { icon: Check, text: (<>Abra o app pelo ícone da <b className="font-medium text-ink">Easy Wrestling</b></>) },
  ];
  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="pt-2 pb-6">
        <div className="flex items-center gap-3">
          <Logo size={44} />
          <div>
            <h3 className="text-[22px] leading-tight text-ink">Instalar o app</h3>
            <p className="text-[13px] text-muted">Acesso rápido e avisos no celular.</p>
          </div>
        </div>
        <ol className="mt-5 space-y-2.5">
          {steps.map((s, i) => (
            <li key={i} className="flex items-center gap-3 rounded-2xl bg-paper p-3.5 text-[13px] text-ink-2">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white text-xs font-semibold text-ink ring-1 ring-line">{i + 1}</span>
              <span className="flex-1">{s.text}</span>
              <s.icon className="size-[18px] shrink-0 text-brand-500" />
            </li>
          ))}
        </ol>
        <Button size="lg" className="mt-5 w-full" onClick={onClose}>
          Entendi
        </Button>
      </div>
    </BottomSheet>
  );
}

/** `clamp`: corta o texto em 3 linhas (lista resumida do Início) */
export function NoticeCard({ notice, unread, clamp }: { notice: Notice; unread?: boolean; clamp?: boolean }) {
  return (
    <article className="relative overflow-hidden card-soft p-4">
      <div className="flex items-start gap-3">
        <span className={clsx('grid size-8 shrink-0 place-items-center rounded-full', notice.pinned ? 'bg-brand-50 text-brand-500' : 'bg-paper-2 text-muted')}>
          {notice.pinned ? <Pin className="size-4" /> : <Megaphone className="size-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm leading-snug font-medium text-ink">{notice.title}</h3>
            {unread && <span className="rounded-full bg-brand-500 px-1.5 py-0.5 text-[10px] leading-none font-semibold text-white">Novo</span>}
          </div>
          <p className={clsx('mt-1 text-[13px] leading-relaxed whitespace-pre-line text-ink-2', clamp && 'line-clamp-3')}>{notice.body}</p>
          <p className="mt-2 text-[11px] text-faint">
            {notice.pinned && <span className="mr-1.5 text-brand-600">Fixado ·</span>}
            {fmtAgo(notice.createdAt)}
          </p>
        </div>
      </div>
    </article>
  );
}

/** Situação de uma aula para o aluno */
export function useClassState(student: Student, cls: ClassItem, date: string) {
  const { db } = useStore();
  const { today, nowMin } = useNow();
  const info = sessionInfo(db, cls, date, today, nowMin);
  const done = findCheckin(db, student.id, cls.id, date);
  const check = date === today ? canCheckIn(db, student, cls, date, today, nowMin) : { ok: false };
  return { info, done, canCheck: check.ok, reason: check.reason };
}

export function ClassCard({ student, cls, date, onCheckIn }: { student: Student; cls: ClassItem; date: string; onCheckIn: (c: ClassItem) => void }) {
  const { info, done, canCheck } = useClassState(student, cls, date);
  return (
    <article
      className={clsx('card-soft flex items-center gap-4 p-4 transition', canCheck && 'ring-2 ring-emerald-400', info.status === 'encerrada' && !done && 'opacity-60')}
    >
      <div className="w-14 shrink-0 text-center">
        <div className="tnum text-[22px] leading-none text-ink">{cls.time}</div>
        <div className="mt-1.5 text-[10px] text-muted">até {info.endsAt}</div>
      </div>
      <div className="min-w-0 flex-1 border-l border-line pl-4">
        <div className="truncate text-[15px] font-medium text-ink">{cls.name}</div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
          <ModalityTag modality={cls.modality} /> {cls.professor.split(' ')[0]}
        </div>
        <div className="mt-2">
          {done ? (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
              <Check className="size-3.5" strokeWidth={3} /> Check-in feito às {done.time}
            </span>
          ) : info.status === 'aberta' ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600">
              <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" /> Aberta agora
            </span>
          ) : info.status === 'agendada' ? (
            <span className="inline-flex items-center gap-1 text-xs text-muted">
              <Clock className="size-3.5" /> Check-in abre às {info.opensAt}
            </span>
          ) : (
            <span className="text-xs text-faint">{info.manualClosed ? 'Chamada encerrada' : 'Encerrada'}</span>
          )}
        </div>
      </div>
      {/* Botão só aparece com a aula aberta e sem check-in feito */}
      {canCheck && (
        <Button size="md" className="shrink-0" onClick={() => onCheckIn(cls)}>
          Check-in
        </Button>
      )}
      {!canCheck && info.status === 'aberta' && !done && !student.active && <Lock className="size-4 shrink-0 text-faint" />}
      {done && (
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600">
          <Check className="size-4" strokeWidth={2.5} />
        </span>
      )}
    </article>
  );
}

/* ======================================================================
   Folha de check-in (botão laranja do meio)
   ====================================================================== */

export function CheckinSheet({ open, onClose, student, preselect }: { open: boolean; onClose: () => void; student: Student; preselect?: ClassItem | null }) {
  const { db, studentCheckIn } = useStore();
  const { today, nowMin } = useNow();
  const toast = useToast();
  const [success, setSuccess] = useState<{ cls: ClassItem; time: string } | null>(null);

  useEffect(() => {
    if (open) setSuccess(null);
  }, [open]);

  if (!open) return null;

  const todays = classesFor(db, today, student);
  const openNow = todays.filter((c) => sessionInfo(db, c, today, today, nowMin).status === 'aberta');
  const eligible = (preselect ? [preselect] : openNow).filter((c) => canCheckIn(db, student, c, today, today, nowMin).ok);
  const doneNow = openNow.map((c) => ({ c, k: findCheckin(db, student.id, c.id, today) })).filter((x) => x.k);
  const next = nextClassFor(db, today, nowMin, student);

  const confirm = (cls: ClassItem) => {
    const res = studentCheckIn(student.id, cls.id);
    if (!res.ok) return toast(res.error, 'error');
    setSuccess({ cls, time: db.demoTime ?? new Date().toTimeString().slice(0, 5) });
  };

  return (
    <BottomSheet open={open} onClose={onClose}>
        {success ? (
          <div className="flex flex-col items-center px-2 pt-4 pb-8 text-center">
            <div className="relative mb-5 grid size-24 place-items-center">
              <span className="relative grid size-20 place-items-center rounded-full bg-emerald-500 text-white animate-pop">
                <Check className="size-10" strokeWidth={2.5} />
              </span>
            </div>
            <h3 className="text-[22px] leading-tight text-ink">Presença confirmada</h3>
            <p className="mt-1 text-sm text-muted">
              {success.cls.name} · {success.cls.time} — check-in às {success.time}
            </p>
            <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted">
              <Sparkles className="size-3.5" /> Bom treino, {student.name.split(' ')[0]}!
            </p>
            <Button size="lg" className="mt-6 w-full" onClick={onClose}>
              Fechar
            </Button>
          </div>
        ) : (
          <div className="pt-2 pb-6">
            <h3 className="text-[22px] leading-tight text-ink">Check-in</h3>
            <p className="text-[13px] text-muted">Confirme sua presença na aula.</p>

            {!student.active ? (
              <Blocked icon={Lock} title="Matrícula inativa" text="Seu check-in está bloqueado. Fale com o professor para reativar a matrícula." />
            ) : eligible.length ? (
              <div className="mt-4 space-y-3">
                {eligible.map((c) => {
                  const info = sessionInfo(db, c, today, today, nowMin);
                  return (
                    <div key={c.id} className="rounded-3xl bg-paper p-5">
                      <div className="flex items-center gap-2 text-xs text-emerald-600">
                        <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" /> Aberta até {info.endsAt}
                      </div>
                      <div className="mt-3 flex items-center gap-4">
                        <span className="tnum text-[40px] leading-none text-ink">{c.time}</span>
                        <div className="min-w-0 border-l border-line pl-4">
                          <div className="truncate text-[15px] font-medium text-ink">{c.name}</div>
                          <div className="text-xs text-muted">com {c.professor}</div>
                        </div>
                      </div>
                      <PillCta className="mt-5" icon={Check} onClick={() => confirm(c)}>
                        Confirmar check-in
                      </PillCta>
                    </div>
                  );
                })}
              </div>
            ) : doneNow.length ? (
              <Blocked
                icon={Check}
                tone="green"
                title="Você já fez check-in"
                text={`Presença confirmada em ${doneNow[0].c.name} às ${doneNow[0].k!.time}. Só é possível um check-in por aula.`}
              />
            ) : (
              <Blocked
                icon={CalendarClock}
                title="Nenhuma aula aberta agora"
                text={
                  next
                    ? `Próxima: ${next.cls.name} ${next.date === today ? 'hoje' : WEEKDAYS[new Date(next.date + 'T00:00').getDay()].toLowerCase()} às ${next.cls.time}. O check-in abre 30 min antes do início.`
                    : 'Não há aulas programadas nos próximos dias.'
                }
              />
            )}
          </div>
        )}
    </BottomSheet>
  );
}

function Blocked({ icon: Icon, title, text, tone = 'navy' }: { icon: typeof Lock; title: string; text: string; tone?: 'navy' | 'green' }) {
  return (
    <div className="mt-4 flex flex-col items-center rounded-2xl bg-paper px-6 py-8 text-center">
      <span className={clsx('mb-3 grid size-12 place-items-center rounded-full', tone === 'green' ? 'bg-emerald-50 text-emerald-600' : 'bg-white text-muted ring-1 ring-line')}>
        <Icon className="size-5" />
      </span>
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-1 text-[13px] leading-relaxed text-muted">{text}</p>
    </div>
  );
}
