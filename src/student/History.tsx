import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { CalendarCheck, ChevronLeft, ChevronRight, Flame, Smartphone, TrendingUp, UserCheck } from 'lucide-react';
import { useNow, useStore } from '../lib/store';
import { checkinsOf, countInRange, streakWeeks } from '../lib/selectors';
import { addDays, addMonths, fmtMonthYear, monthKey, monthName, parseISO, startOfMonth, startOfWeek, WEEKDAYS_LETTER, WEEKDAYS_SHORT } from '../lib/dates';
import { modality } from '../lib/belts';
import { useStudentCtx } from './StudentLayout';
import { AppHeader, PHOTOS, SectionTitle } from './parts';
import type { Modality } from '../lib/types';

export default function History() {
  const { db } = useStore();
  const { today } = useNow();
  const { student } = useStudentCtx();
  const [month, setMonth] = useState(startOfMonth(today));

  const list = useMemo(() => checkinsOf(db, student.id), [db, student.id]);
  const byDate = useMemo(() => {
    const m = new Map<string, number>();
    for (const k of list) m.set(k.date, (m.get(k.date) ?? 0) + 1);
    return m;
  }, [list]);

  const weeks8 = countInRange(list, addDays(startOfWeek(today), -56), addDays(startOfWeek(today), -1)) / 8;
  const stats = [
    { icon: CalendarCheck, label: 'Total de treinos', value: String(list.length) },
    { icon: TrendingUp, label: 'Neste mês', value: String(countInRange(list, startOfMonth(today), today)) },
    { icon: UserCheck, label: 'Média por semana', value: weeks8.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) },
    { icon: Flame, label: 'Sequência', value: `${streakWeeks(list, today)} sem.` },
  ];

  // Distribuição por modalidade (90 dias)
  const from90 = addDays(today, -89);
  const recent = list.filter((k) => k.date >= from90);
  const mods = Object.entries(
    recent.reduce<Record<string, number>>((acc, k) => {
      const c = db.classes.find((x) => x.id === k.classId);
      if (c) acc[c.modality] = (acc[c.modality] ?? 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  // Calendário do mês; a lista de check-ins abaixo acompanha o mês escolhido
  const first = parseISO(month);
  const lead = (first.getDay() + 6) % 7; // segunda = 0
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const monthList = list.filter((k) => monthKey(k.date) === monthKey(month));

  return (
    <div className="animate-fade-in">
      <AppHeader eyebrow="Sua frequência" title="Histórico" photo={PHOTOS.competicao} />

      <div className="relative -mt-6 rounded-t-[28px] bg-paper px-5 pt-6">
        <div className="grid grid-cols-2 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="card-soft p-4">
              <s.icon className="size-4 text-brand-500" />
              <div className="mt-2 text-[26px] leading-none text-ink">{s.value}</div>
              <div className="mt-1 text-xs text-muted">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Calendário */}
        <section className="mt-6 card-soft p-4">
          <div className="mb-3 flex items-center justify-between">
            <button onClick={() => setMonth(addMonths(month, -1))} className="grid size-8 place-items-center rounded-full text-muted hover:bg-paper" aria-label="Mês anterior">
              <ChevronLeft className="size-4" />
            </button>
            <div className="text-center">
              <div className="text-sm font-medium text-ink">{fmtMonthYear(month)}</div>
              <div className="text-[11px] text-muted">
                {monthList.length} {monthList.length === 1 ? 'treino' : 'treinos'}
              </div>
            </div>
            <button
              onClick={() => setMonth(addMonths(month, 1))}
              disabled={month >= startOfMonth(today)}
              className="grid size-8 place-items-center rounded-full text-muted hover:bg-paper disabled:opacity-30"
              aria-label="Próximo mês"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {[1, 2, 3, 4, 5, 6, 0].map((wd, i) => (
              <span key={i} className="text-[10px] font-semibold text-faint">
                {WEEKDAYS_LETTER[wd]}
              </span>
            ))}
            {Array.from({ length: lead }, (_, i) => (
              <span key={`l${i}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const date = addDays(month, i);
              const n = byDate.get(date) ?? 0;
              return (
                <span
                  key={date}
                  title={n ? `${n} treino(s)` : undefined}
                  className={clsx(
                    'grid aspect-square place-items-center rounded-full text-[13px]',
                    n > 0 ? 'bg-navy-900 text-white' : date > today ? 'text-line-strong' : 'text-muted',
                    date === today && 'ring-2 ring-brand-500',
                  )}
                >
                  {i + 1}
                </span>
              );
            })}
          </div>
        </section>

        <section className="mt-6">
          <SectionTitle>Check-ins de {monthName(month)}</SectionTitle>
          {monthList.length ? (
            <ul className="overflow-hidden card-soft">
              {monthList.map((k, i) => {
                const c = db.classes.find((x) => x.id === k.classId);
                const d = parseISO(k.date);
                return (
                  <li key={k.id} className={clsx('flex items-center gap-3 px-4 py-3', i > 0 && 'border-t border-line')}>
                    <span className="grid w-11 shrink-0 text-center">
                      <span className="text-lg leading-none font-medium text-ink">{d.getDate()}</span>
                      <span className="text-[10px] text-muted uppercase">{WEEKDAYS_SHORT[d.getDay()]}</span>
                    </span>
                    <span className="h-8 w-px bg-line" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-ink">{c?.name ?? 'Aula'}</span>
                      <span className="block text-[11px] text-muted">
                        {c?.time ?? ''} · check-in às {k.time}
                      </span>
                    </span>
                    <span className={clsx('inline-flex items-center gap-1 text-[11px]', k.source === 'app' ? 'text-muted' : 'text-faint')}>
                      {k.source === 'app' ? <Smartphone className="size-3" /> : <UserCheck className="size-3" />}
                      {k.source === 'app' ? 'App' : 'Professor'}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-col items-center card-soft px-6 py-10 text-center">
              <span className="mb-3 grid size-12 place-items-center rounded-full bg-paper-2 text-faint">
                <CalendarCheck className="size-5" />
              </span>
              <p className="text-[15px] font-medium text-ink">{list.length ? `Nenhum treino em ${monthName(month)}` : 'Nenhum check-in ainda'}</p>
              <p className="mt-1 text-[13px] text-muted">{list.length ? 'Use as setas do calendário para ver outros meses.' : 'Seus treinos aparecem aqui depois do primeiro check-in.'}</p>
            </div>
          )}
        </section>

        {mods.length > 0 && (
          <section className="mt-6">
            <SectionTitle>Modalidades · 90 dias</SectionTitle>
            <div className="card-soft p-4">
              <div className="flex h-2 gap-[2px] overflow-hidden rounded-full">
                {mods.map(([m, n]) => (
                  <span key={m} style={{ flex: n, background: modality(m as Modality).solid }} />
                ))}
              </div>
              <ul className="mt-3 space-y-1.5">
                {mods.map(([m, n]) => (
                  <li key={m} className="flex items-center gap-2 text-[13px]">
                    <span className="size-2.5 rounded-full" style={{ background: modality(m as Modality).solid }} />
                    <span className="flex-1 text-ink-2">{modality(m as Modality).label}</span>
                    <span className="font-medium text-ink">{n}</span>
                    <span className="w-10 text-right text-xs text-muted">{Math.round((n / recent.length) * 100)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
