import { useState } from 'react';
import clsx from 'clsx';
import { CalendarX2, Info, Lock } from 'lucide-react';
import { useNow, useStore } from '../lib/store';
import { CHECKIN_OPENS_BEFORE, checkinsOf, classesFor, countInRange, sessionInfo } from '../lib/selectors';
import { addDays, fmtLong, parseISO, startOfMonth, WEEKDAYS_SHORT } from '../lib/dates';
import { useStudentCtx } from './StudentLayout';
import { AppHeader, ClassCard, PHOTOS } from './parts';

export default function Classes() {
  const { db } = useStore();
  const { today, nowMin } = useNow();
  const { student, openCheckin } = useStudentCtx();
  const [date, setDate] = useState(today);

  const todays = classesFor(db, today, student);
  const list = classesFor(db, date, student);
  const monthCount = countInRange(checkinsOf(db, student.id), startOfMonth(today), today);
  const openNow = todays.filter((c) => sessionInfo(db, c, today, today, nowMin).status === 'aberta').length;

  return (
    <div className="animate-fade-in">
      <AppHeader eyebrow="Agenda" title="Aulas" subtitle={fmtLong(date)} photo={PHOTOS.adulto}>
        <div className="mt-6 grid grid-cols-2 border-t border-white/12 pt-4">
          <div>
            <p className="text-[11px] text-white/55">Hoje</p>
            <p className="mt-1 text-[15px] font-medium">
              {todays.length} {todays.length === 1 ? 'aula' : 'aulas'}
              {openNow > 0 && <span className="text-emerald-300"> · {openNow} aberta{openNow > 1 ? 's' : ''}</span>}
            </p>
          </div>
          <div className="border-l border-white/12 pl-4">
            <p className="text-[11px] text-white/55">No mês</p>
            <p className="mt-1 text-[15px] font-medium">
              {monthCount} {monthCount === 1 ? 'check-in' : 'check-ins'}
            </p>
          </div>
        </div>

        <div className="scrollbar-none -mx-5 mt-5 flex gap-2 overflow-x-auto px-5 pb-1">
          {Array.from({ length: 7 }, (_, i) => {
            const d = addDays(today, i);
            const sel = d === date;
            const n = classesFor(db, d, student).length;
            return (
              <button
                key={d}
                onClick={() => setDate(d)}
                className={clsx(
                  'flex min-w-[54px] flex-col items-center rounded-2xl py-2.5 transition',
                  sel ? 'bg-white text-ink' : 'bg-white/[0.07] text-white/80 ring-1 ring-white/10 backdrop-blur hover:bg-white/12',
                )}
              >
                <span className={clsx('app-eyebrow text-[9.5px]', sel ? 'text-brand-600' : 'text-white/50')}>{i === 0 ? 'Hoje' : WEEKDAYS_SHORT[parseISO(d).getDay()]}</span>
                <span className="mt-0.5 text-xl leading-tight">{parseISO(d).getDate()}</span>
                <span className={clsx('mt-1 size-1 rounded-full', n ? 'bg-brand-500' : 'bg-transparent')} />
              </button>
            );
          })}
        </div>
      </AppHeader>

      <div className="relative -mt-6 space-y-3 rounded-t-[28px] bg-paper px-5 pt-6">
        {!student.active && (
          <div className="flex items-center gap-3 rounded-3xl bg-slate-100 p-4 text-[13px] text-slate-700">
            <Lock className="size-4 shrink-0" /> Matrícula inativa — check-in bloqueado.
          </div>
        )}
        {list.length ? (
          list.map((c) => <ClassCard key={c.id} student={student} cls={c} date={date} onCheckIn={openCheckin} />)
        ) : (
          <div className="flex flex-col items-center card-soft px-6 py-12 text-center">
            <span className="mb-3 grid size-12 place-items-center rounded-full bg-paper-2 text-faint">
              <CalendarX2 className="size-5" />
            </span>
            <p className="text-[15px] font-medium text-ink">Sem aulas neste dia</p>
            <p className="mt-1 text-[13px] text-muted">Escolha outro dia acima.</p>
          </div>
        )}
        <p className="flex items-start gap-2 px-1 pt-2 text-[11px] leading-relaxed text-muted">
          <Info className="mt-0.5 size-3.5 shrink-0" />O check-in abre {CHECKIN_OPENS_BEFORE} minutos antes do início e fecha no fim da aula. Um check-in por aula.
        </p>
      </div>
    </div>
  );
}
