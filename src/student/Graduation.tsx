import clsx from 'clsx';
import { Flag, Sparkles } from 'lucide-react';
import { useNow, useStore } from '../lib/store';
import { checkinsOf, gradProgress, READY_MONTHS, READY_TRAININGS } from '../lib/selectors';
import { belt as beltDef, beltLabel, degreeLabel, nextStep } from '../lib/belts';
import { diffDays, fmtDate, fmtDuration, fmtRelative } from '../lib/dates';
import { BeltBar } from '../components/bits';
import { ProgressBar } from '../components/ui';
import type { BeltId } from '../lib/types';
import { useStudentCtx } from './StudentLayout';
import { AppHeader, PHOTOS, SectionTitle } from './parts';

type Step = { id: string; date: string; belt?: BeltId; degree?: number; title: string; sub: string; note?: string };

export default function Graduation() {
  const { db } = useStore();
  const { today } = useNow();
  const { student } = useStudentCtx();
  const def = beltDef(student.belt);
  const prog = gradProgress(db, student, today);
  const next = nextStep(student.belt, student.degree);
  const maxed = next.belt === student.belt && next.degree === student.degree;
  const total = checkinsOf(db, student.id).length;

  const grads = db.graduations.filter((g) => g.studentId === student.id);
  // linha do tempo: graduações + a matrícula, do mais recente para o mais antigo
  const steps: Step[] = [
    ...grads.map((g) => ({
      id: g.id,
      date: g.date,
      belt: g.toBelt,
      degree: g.toDegree,
      title: beltLabel(g.toBelt, g.toDegree),
      sub: g.toBelt !== g.fromBelt ? `Nova faixa · antes ${beltDef(g.fromBelt).label.toLowerCase()}` : `Novo grau · antes ${degreeLabel(g.fromDegree).toLowerCase()}`,
      note: g.note,
    })),
    { id: 'joined', date: student.joinedAt, title: 'Início na Easy Wrestling', sub: 'Matrícula na academia' },
  ].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="animate-fade-in">
      <AppHeader back="/app/perfil" eyebrow="Sua evolução" title="Graduação" photo={PHOTOS.competicao}>
        <div className="mt-5 rounded-2xl bg-white/[0.06] p-5 ring-1 ring-white/10">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] text-white/55">Faixa atual</p>
              <p className="mt-1 text-[22px] leading-tight">
                {def.label} · {degreeLabel(student.degree).toLowerCase()}
              </p>
            </div>
            <p className="text-right text-[11px] text-white/55">
              desde {fmtDate(prog.since)}
              <br />
              há {fmtDuration(prog.since, today)}
            </p>
          </div>
          <BeltBar belt={student.belt} degree={student.degree} height={20} className="mt-4 w-full" />
        </div>
      </AppHeader>

      <div className="relative -mt-6 space-y-6 rounded-t-[28px] bg-paper px-5 pt-6">
        {/* Próximo passo */}
        <section className="card-soft p-4">
          {maxed ? (
            <p className="text-sm text-ink-2">Você está no grau máximo da faixa {def.label.toLowerCase()}.</p>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-muted">Próximo passo</p>
                  <p className="text-sm font-medium text-ink">{beltLabel(next.belt, next.degree)}</p>
                </div>
                <BeltBar belt={next.belt} degree={next.degree} className="w-20" height={10} />
              </div>
              <Meter label="Treinos desde a última graduação" value={prog.trainingsSince} goal={READY_TRAININGS} text={`${prog.trainingsSince} de ${READY_TRAININGS}`} />
              {/* barra anda por dia; "pronto" segue a regra em meses */}
              <Meter
                label="Tempo na graduação atual"
                value={prog.months >= READY_MONTHS ? 1 : Math.min(0.99, diffDays(prog.since, today) / (READY_MONTHS * 30.4))}
                goal={1}
                text={`${fmtDuration(prog.since, today)} de ${READY_MONTHS} meses`}
              />
              {prog.ready ? (
                <p className="mt-4 flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-[13px] text-emerald-800">
                  <Sparkles className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  Você já atingiu a referência da academia. Converse com o professor!
                </p>
              ) : (
                <p className="mt-4 text-[11px] leading-relaxed text-muted">
                  Referência da academia: {READY_TRAININGS} treinos e {READY_MONTHS} meses desde a última graduação. Quem decide a graduação é o professor.
                </p>
              )}
            </>
          )}
        </section>

        <div className="grid grid-cols-3 gap-2.5">
          <Stat value={fmtDuration(student.joinedAt, today)} label="na academia" />
          <Stat value={String(total)} label="treinos no total" />
          <Stat value={String(grads.length)} label={grads.length === 1 ? 'graduação' : 'graduações'} />
        </div>

        {/* Linha do tempo */}
        <section>
          <SectionTitle>Linha do tempo</SectionTitle>
          <ol className="card-soft p-4">
            {steps.map((s, i) => (
              <li key={s.id} className={clsx('relative flex gap-3', i < steps.length - 1 && 'pb-5')}>
                {i < steps.length - 1 && <span className="absolute top-9 bottom-1 left-[17px] w-px bg-line" />}
                <span className={clsx('grid size-9 shrink-0 place-items-center rounded-full', i === 0 ? 'bg-brand-50' : 'bg-paper')}>
                  {s.belt ? <BeltBar belt={s.belt} degree={s.degree ?? 0} className="w-6" height={7} /> : <Flag className="size-4 text-muted" />}
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-medium text-ink">{s.title}</p>
                    <span className="shrink-0 text-[11px] text-faint">{fmtDate(s.date)}</span>
                  </div>
                  <p className="text-xs text-muted">
                    {s.sub} · {fmtRelative(s.date, today)}
                  </p>
                  {s.note && <p className="mt-2 rounded-xl bg-paper px-3 py-2 text-[13px] text-ink-2">“{s.note}”</p>}
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}

function Meter({ label, value, goal, text }: { label: string; value: number; goal: number; text: string }) {
  const done = value >= goal;
  return (
    <div className="mt-4">
      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
        <span className="text-muted">{label}</span>
        <span className={clsx('shrink-0 font-medium', done ? 'text-emerald-600' : 'text-ink')}>{text}</span>
      </div>
      <ProgressBar value={value / goal} barClass={done ? 'bg-emerald-500' : 'bg-brand-500'} />
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="card-soft px-3 py-3.5">
      <p className="text-lg leading-tight font-medium text-ink">{value}</p>
      <p className="mt-0.5 text-[11px] text-muted">{label}</p>
    </div>
  );
}
