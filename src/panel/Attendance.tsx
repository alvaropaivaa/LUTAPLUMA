import { useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { ArrowUpRight, CalendarDays, Check, ChevronLeft, ChevronRight, ClipboardCheck, Clock, Lock, Radio, Search, Smartphone, Unlock, UserCheck, Users } from 'lucide-react';
import { useNow, useStore } from '../lib/store';
import { activeStudents, classesOn, sessionInfo, studentStatus } from '../lib/selectors';
import { addDays, fmtDayMonth, fmtLong, fmtMonthYear, parseISO, startOfWeek, timeToMin, WEEKDAYS_SHORT } from '../lib/dates';
import { Avatar, Logo } from '../components/bits';
import { modality } from '../lib/belts';
import { Button, Card, EmptyState, PageHeader, Pill, Segmented, useToast } from '../components/ui';
import type { SessionStatus } from '../lib/types';

const STATUS_PILL: Record<SessionStatus, { label: string; cls: string; dot: string }> = {
  aberta: { label: 'Aberta', cls: 'bg-emerald-50 text-emerald-700 ring-transparent uppercase tracking-wide text-[10px]', dot: 'bg-emerald-500' },
  agendada: { label: 'Não aberta', cls: 'bg-paper-2 text-muted ring-transparent uppercase tracking-wide text-[10px]', dot: 'bg-faint' },
  encerrada: { label: 'Encerrada', cls: 'bg-paper-2 text-muted ring-transparent uppercase tracking-wide text-[10px]', dot: 'bg-line-strong' },
};

export default function Attendance() {
  const { db, togglePresence, setSessionClosed } = useStore();
  const { today, nowMin } = useNow();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const date = params.get('data') ?? today;
  const classes = classesOn(db, date);
  const selectedId = classes.find((c) => c.id === params.get('aula'))?.id ?? pickDefault();
  const cls = classes.find((c) => c.id === selectedId) ?? null;
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'todos' | 'presentes' | 'ausentes'>('todos');

  function pickDefault() {
    if (date !== today) return classes[0]?.id;
    const open = classes.find((c) => sessionInfo(db, c, date, today, nowMin).status === 'aberta');
    const next = classes.find((c) => sessionInfo(db, c, date, today, nowMin).status === 'agendada');
    return (open ?? next ?? classes[classes.length - 1])?.id;
  }

  const setDate = (d: string) => setParams({ data: d });
  const setClass = (id: string) => setParams({ data: date, aula: id });

  const dayCheckins = db.checkins.filter((k) => k.date === date);
  const openCount = classes.filter((c) => sessionInfo(db, c, date, today, nowMin).status === 'aberta').length;

  const roster = useMemo(() => {
    if (!cls) return [];
    const since = addDays(date, -60);
    const isKids = cls.modality === 'kids';
    return activeStudents(db)
      .filter((s) => (isKids ? s.planId === 'kids' || ['cinza', 'amarela', 'laranja', 'verde'].includes(s.belt) : s.planId !== 'kids'))
      .map((s) => {
        const k = db.checkins.find((x) => x.studentId === s.id && x.classId === cls.id && x.date === date);
        const regular = db.checkins.filter((x) => x.studentId === s.id && x.classId === cls.id && x.date >= since).length;
        return { s, k, regular };
      })
      .sort((a, b) => Number(!!b.k) - Number(!!a.k) || b.regular - a.regular || a.s.name.localeCompare(b.s.name));
  }, [db, cls, date]);

  const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const present = roster.filter((r) => r.k).length;
  const visible = roster.filter((r) => (filter === 'todos' ? true : filter === 'presentes' ? r.k : !r.k)).filter((r) => norm(r.s.name).includes(norm(q)));
  const info = cls ? sessionInfo(db, cls, date, today, nowMin) : null;
  const future = date > today;
  const weekStart = startOfWeek(date);

  return (
    <>
      <PageHeader
        eyebrow={
          <>
            {fmtLong(date)}
            {date !== today && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/80">{date < today ? 'Dia anterior' : 'Dia futuro'}</span>}
          </>
        }
        title="Chamada do dia"
        actions={
          <div className="-mx-4 flex items-center divide-x divide-white/10 sm:mx-0">
            <HeadStat icon={CalendarDays} tone="bg-white/10 text-white" value={classes.length} label={classes.length === 1 ? 'Aula no dia' : 'Aulas no dia'} />
            <HeadStat icon={Radio} tone="bg-white/10 text-emerald-300" value={openCount} label="Em chamada" />
            <HeadStat icon={UserCheck} tone="bg-white/10 text-brand-300" value={dayCheckins.length} label="Presenças" />
          </div>
        }
      />

      {/* Seletor de data */}
      <Card className="mb-8 p-3 @md:p-4">
        <div className="flex flex-wrap items-center gap-3 px-1 pb-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">{fmtMonthYear(weekStart)}</p>
            <p className="text-xs text-muted">
              Semana de {fmtDayMonth(weekStart)} a {fmtDayMonth(addDays(weekStart, 6))}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            {date !== today && (
              <Button variant="secondary" size="sm" onClick={() => setDate(today)}>
                Hoje
              </Button>
            )}
            <NavBtn label="Semana anterior" onClick={() => setDate(addDays(date, -7))}>
              <ChevronLeft className="size-4" />
            </NavBtn>
            <NavBtn label="Próxima semana" onClick={() => setDate(addDays(date, 7))}>
              <ChevronRight className="size-4" />
            </NavBtn>
            {/* calendário nativo escondido atrás de um botão de ícone */}
            <label className="relative grid size-8 cursor-pointer place-items-center rounded-full text-muted ring-1 ring-line transition hover:bg-paper hover:text-ink" title="Escolher data">
              <CalendarDays className="size-4" />
              <input
                type="date"
                value={date}
                onChange={(e) => e.target.value && setDate(e.target.value)}
                onClick={(e) => (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.()}
                className="absolute inset-0 cursor-pointer opacity-0"
                aria-label="Escolher data"
              />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 @md:gap-1.5">
          {Array.from({ length: 7 }, (_, i) => {
            const d = addDays(weekStart, i);
            const n = classesOn(db, d).length;
            const sel = d === date;
            const isToday = d === today;
            return (
              <button
                key={d}
                onClick={() => setDate(d)}
                className={clsx(
                  'relative flex flex-col items-center rounded-2xl py-2.5 transition duration-200',
                  sel ? 'bg-navy-900 text-white shadow-[0_10px_24px_-12px_rgb(12_33_80/0.8)]' : 'text-ink hover:bg-paper',
                  !sel && n === 0 && 'opacity-45',
                )}
              >
                {isToday && <span className={clsx('absolute top-2 right-2 hidden size-1.5 rounded-full @xl:block', sel ? 'bg-brand-400' : 'bg-brand-500')} />}
                <span className={clsx('text-[10px] font-medium tracking-wider uppercase @md:text-[11px]', sel ? 'text-white/60' : isToday ? 'text-brand-600' : 'text-muted')}>
                  {isToday ? 'Hoje' : WEEKDAYS_SHORT[parseISO(d).getDay()]}
                </span>
                <span className={clsx('tnum mt-0.5 text-lg leading-tight font-semibold @md:text-xl', !sel && isToday && 'text-brand-600')}>{parseISO(d).getDate()}</span>
                <span className={clsx('mt-1 hidden text-[11px] @xl:block', sel ? 'text-brand-300' : 'text-faint')}>{n ? `${n} ${n === 1 ? 'aula' : 'aulas'}` : 'sem aula'}</span>
                <span className={clsx('mt-1 size-1 rounded-full @xl:hidden', n ? (sel ? 'bg-brand-400' : 'bg-line-strong') : 'bg-transparent')} />
              </button>
            );
          })}
        </div>
      </Card>

      {classes.length === 0 ? (
        <Card className="py-14">
          <div className="flex flex-col items-center text-center">
            <Logo size={48} className="mb-4" />
            <p className="text-sm font-semibold">Nenhuma aula neste dia</p>
            <p className="mt-1 text-sm text-muted">Escolha outra data ou cadastre aulas na grade.</p>
          </div>
        </Card>
      ) : (
        <>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-medium text-ink">Agenda do dia</h2>
            <span className="text-xs text-muted">
              {classes.length} {classes.length === 1 ? 'aula' : 'aulas'}
            </span>
          </div>
          <div className="mb-8 grid grid-cols-1 gap-3 @lg:grid-cols-2 @3xl:grid-cols-3 @5xl:grid-cols-4">
            {classes.map((c, i) => {
              const inf = sessionInfo(db, c, date, today, nowMin);
              const count = dayCheckins.filter((k) => k.classId === c.id).length;
              const sel = c.id === selectedId;
              const pill = STATUS_PILL[inf.status];
              return (
                <button
                  key={c.id}
                  onClick={() => setClass(c.id)}
                  className={clsx(
                    'group relative flex flex-col rounded-2xl border p-5 text-left transition',
                    sel ? 'border-brand-300 bg-brand-50' : 'border-line bg-white hover:border-line-strong',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium tracking-wider text-muted uppercase">Aula {String(i + 1).padStart(2, '0')}</span>
                    <Pill className={pill.cls} dot={pill.dot}>
                      {pill.label}
                    </Pill>
                  </div>
                  <div className="mt-4 font-display text-[32px] leading-none font-semibold tracking-tight text-ink">{c.time}</div>
                  <div className="mt-3 truncate pr-8 text-sm font-medium text-ink">{c.name}</div>
                  <div className="mt-0.5 truncate pr-8 text-xs text-muted">
                    {modality(c.modality).label} · {count}/{c.capacity} presentes
                  </div>
                  <span
                    className={clsx(
                      'absolute right-5 bottom-5 grid size-7 place-items-center rounded-full transition',
                      sel ? 'bg-brand-500 text-white' : 'text-faint ring-1 ring-line group-hover:text-ink',
                    )}
                  >
                    {sel ? <Check className="size-3.5" strokeWidth={3} /> : <ArrowUpRight className="size-3.5" />}
                  </span>
                </button>
              );
            })}
          </div>

          {cls && info && (
            <Card className="overflow-hidden">
              <div className="flex flex-wrap items-center gap-4 border-b border-line p-5">
                <span className="grid size-10 place-items-center rounded-full bg-brand-50 text-brand-500">
                  <ClipboardCheck className="size-[18px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted">Lista de presença</p>
                  <h2 className="font-display text-lg font-semibold text-ink">{cls.name}</h2>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                    <Clock className="size-3.5" /> {cls.time} – {info.endsAt}
                    <span>·</span> {cls.professor}
                    <span>·</span> {modality(cls.modality).label}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-right">
                    <div className="tnum font-display text-xl leading-none font-semibold text-ink">
                      {present}
                      <span className="text-sm font-normal text-faint">/{roster.length}</span>
                    </div>
                    <div className="mt-1 text-[11px] text-muted">presentes</div>
                  </div>
                  {date === today && info.status === 'aberta' && (
                    <Button
                      variant="secondary"
                      icon={Lock}
                      onClick={() => {
                        setSessionClosed(date, cls.id, true);
                        toast('Chamada encerrada. Os alunos não podem mais fazer check-in.', 'info');
                      }}
                    >
                      Encerrar chamada
                    </Button>
                  )}
                  {date === today && info.manualClosed && nowMin <= timeToMin(info.endsAt) && (
                    <Button
                      icon={Unlock}
                      onClick={() => {
                        setSessionClosed(date, cls.id, false);
                        toast('Chamada reaberta para check-in.');
                      }}
                    >
                      Reabrir check-in
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2.5 border-b border-line bg-paper/60 px-5 py-3 text-[13px] text-muted">
                {info.status === 'aberta' ? <Smartphone className="size-4 text-emerald-600" /> : <Clock className="size-4" />}
                {future
                  ? 'Aula futura — a chamada fica disponível no dia da aula.'
                  : info.status === 'aberta'
                    ? `Check-in pelo app aberto até ${info.endsAt}. Toque em um aluno para marcar presença manualmente.`
                    : info.status === 'agendada'
                      ? `O check-in pelo app abre às ${info.opensAt}. Você já pode marcar presenças manualmente.`
                      : info.manualClosed
                        ? 'Chamada encerrada por você. Ainda é possível corrigir presenças manualmente.'
                        : 'Aula encerrada. Ainda é possível corrigir presenças manualmente.'}
              </div>

              <div className="flex flex-wrap items-center gap-3 px-5 pt-5">
                <div className="flex h-9 min-w-[220px] flex-1 items-center gap-2 rounded-lg bg-white px-3 ring-1 ring-line focus-within:ring-2 focus-within:ring-brand-200 @xl:max-w-xs">
                  <Search className="size-4 text-faint" />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar aluno" className="w-full bg-transparent text-sm outline-none placeholder:text-faint" />
                </div>
                <Segmented
                  size="sm"
                  value={filter}
                  onChange={setFilter}
                  options={[
                    { value: 'todos', label: 'Todos', count: roster.length },
                    { value: 'presentes', label: 'Presentes', count: present },
                    { value: 'ausentes', label: 'Ausentes', count: roster.length - present },
                  ]}
                />
              </div>

              <div className="p-5">
                {roster.length === 0 ? (
                  <EmptyState icon={Users} title="Nenhum aluno ativo para esta turma" text="Cadastre alunos para começar a fazer a chamada." />
                ) : visible.length === 0 ? (
                  <EmptyState icon={Search} title="Ninguém por aqui" text="Ajuste a busca ou o filtro." />
                ) : (
                  <div className="grid grid-cols-1 gap-2.5 @lg:grid-cols-2 @3xl:grid-cols-3 @5xl:grid-cols-4">
                    {visible.map(({ s, k }) => {
                      const late = studentStatus(s, today) === 'atrasado';
                      return (
                        <button
                          key={s.id}
                          disabled={future}
                          onClick={() => {
                            togglePresence(s.id, cls.id, date);
                            if (!k) toast(`${s.name.split(' ')[0]} marcado como presente.`);
                          }}
                          className={clsx(
                            'flex items-center gap-3 rounded-xl p-3 text-left ring-1 transition disabled:opacity-50',
                            k ? 'bg-white ring-emerald-300' : 'bg-white ring-line hover:ring-line-strong',
                          )}
                        >
                          <span className="relative">
                            <Avatar name={s.name} src={s.photo} size={40} />
                            <span
                              className={clsx(
                                'absolute -right-1 -bottom-1 grid size-5 place-items-center rounded-full ring-2 ring-white transition',
                                k ? 'scale-100 bg-emerald-500 text-white' : 'scale-90 bg-paper-2 text-transparent',
                              )}
                            >
                              <Check className="size-3" strokeWidth={3.5} />
                            </span>
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-medium text-ink">{s.name}</span>
                            <span className={clsx('mt-0.5 block truncate text-xs', k ? 'text-emerald-600' : late ? 'text-rose-500' : 'text-faint')}>
                              {k ? `Presente · ${k.time} · ${k.source === 'app' ? 'pelo app' : 'manual'}` : late ? 'Mensalidade atrasada' : 'Ausente'}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          )}
        </>
      )}
    </>
  );
}

function NavBtn({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} className="grid size-8 place-items-center rounded-full text-muted ring-1 ring-line transition hover:bg-paper hover:text-ink">
      {children}
    </button>
  );
}

function HeadStat({ icon: Icon, tone, value, label }: { icon: typeof CalendarDays; tone: string; value: number; label: string }) {
  return (
    <div className="flex items-center gap-3 px-3 @md:px-4">
      <span className={clsx('hidden size-9 place-items-center rounded-full @xs:grid', tone)}>
        <Icon className="size-4" />
      </span>
      <div>
        <div className="tnum font-display text-xl leading-none font-semibold text-white">{String(value).padStart(2, '0')}</div>
        <div className="mt-0.5 text-[11px] text-white/55">{label}</div>
      </div>
    </div>
  );
}
