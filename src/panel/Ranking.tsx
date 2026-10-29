import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { ArrowRight, Award, Flame, History, Medal, Sparkles, TrendingUp, Trophy, Users } from 'lucide-react';
import { useNow, useStore } from '../lib/store';
import { activeStudents, gradProgress, READY_MONTHS, READY_TRAININGS } from '../lib/selectors';
import { BELTS, beltLabel, beltRank, degreeLabel, isDemotion, belt as beltDef, maxDegree } from '../lib/belts';
import { addDays, fmtDate, fmtDuration, startOfMonth } from '../lib/dates';
import { Avatar, BeltBar } from '../components/bits';
import { Button, Card, CardHeader, EmptyState, PageHeader, Segmented } from '../components/ui';
import { PromoteModal } from './shared';

export default function Ranking() {
  const { db } = useStore();
  const { today } = useNow();
  const [tab, setTab] = useState<'faixa' | 'frequencia'>('faixa');
  const [period, setPeriod] = useState<'mes' | '30' | '90'>('mes');
  const [promoteId, setPromoteId] = useState<string | null | undefined>(undefined);

  const people = useMemo(() => {
    return activeStudents(db).map((s) => ({ s, ...gradProgress(db, s, today) }));
  }, [db, today]);

  const byBelt = BELTS.slice()
    .reverse()
    .map((b) => ({
      belt: b,
      list: people.filter((p) => p.s.belt === b.id).sort((a, b2) => b2.s.degree - a.s.degree || a.since.localeCompare(b2.since)),
    }))
    .filter((g) => g.list.length);

  const from = period === 'mes' ? startOfMonth(today) : addDays(today, period === '30' ? -29 : -89);
  const freq = people
    .map((p) => ({ ...p, n: db.checkins.filter((k) => k.studentId === p.s.id && k.date >= from && k.date <= today).length }))
    .filter((p) => p.n > 0)
    .sort((a, b) => b.n - a.n || beltRank(b.s.belt, b.s.degree) - beltRank(a.s.belt, a.s.degree));
  const maxN = freq[0]?.n ?? 1;

  const ready = people.filter((p) => p.ready).sort((a, b) => b.trainingsSince - a.trainingsSince);
  const yearStart = today.slice(0, 4) + '-01-01';
  const gradsYear = db.graduations.filter((g) => g.date >= yearStart && !isDemotion({ belt: g.fromBelt, degree: g.fromDegree }, { belt: g.toBelt, degree: g.toDegree }));
  const beltChanges = gradsYear.filter((g) => g.fromBelt !== g.toBelt).length;
  const recent = db.graduations.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);

  let pos = 0;

  return (
    <>
      <PageHeader
        eyebrow="Evolução dos alunos"
        title="Graduação e ranking"
        subtitle="Acompanhe faixas, graus e quem mais treina."
        actions={
          <Button size="lg" icon={Award} onClick={() => setPromoteId(null)}>
            Promover aluno
          </Button>
        }
      />

      <section className="mb-4 grid grid-cols-1 gap-3 @2xl:grid-cols-3 @2xl:gap-4">
        <SummaryCard icon={Trophy} tone="bg-brand-50 text-brand-500" value={gradsYear.length} label={`Graduações em ${today.slice(0, 4)}`} sub={`${beltChanges} trocas de faixa`} />
        <SummaryCard icon={Sparkles} tone="bg-brand-50 text-brand-500" value={ready.length} label="Prontos para graduar" sub={`${READY_TRAININGS}+ treinos e ${READY_MONTHS}+ meses na faixa`} />
        <SummaryCard icon={Users} tone="bg-brand-50 text-brand-500" value={people.length} label="Alunos ativos no ranking" sub={`${people.filter((p) => p.s.belt === 'preta').length} faixas-pretas`} />
      </section>

      <div className="grid grid-cols-1 gap-4 @4xl:grid-cols-3">
        <Card className="overflow-hidden @4xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5">
            <Segmented
              value={tab}
              onChange={setTab}
              options={[
                { value: 'faixa', label: 'Por faixa e grau' },
                { value: 'frequencia', label: 'Por frequência' },
              ]}
            />
            {tab === 'frequencia' && (
              <Segmented
                size="sm"
                value={period}
                onChange={setPeriod}
                options={[
                  { value: 'mes', label: 'Este mês' },
                  { value: '30', label: '30 dias' },
                  { value: '90', label: '90 dias' },
                ]}
              />
            )}
          </div>

          {people.length === 0 ? (
            <EmptyState icon={Users} title="Sem alunos ainda." text="O ranking aparece quando houver alunos ativos." className="py-16" />
          ) : tab === 'faixa' ? (
            <div className="divide-y divide-line">
              {byBelt.map(({ belt, list }) => (
                <div key={belt.id}>
                  <div className="flex items-center gap-3 bg-paper/60 px-5 py-2.5">
                    <BeltBar belt={belt.id} degree={0} className="w-8" height={7} />
                    <span className="text-xs font-medium text-ink-2">Faixa {belt.label.toLowerCase()}</span>
                    <span className="text-xs text-muted">· {list.length}</span>
                  </div>
                  <ul>
                    {list.map((p) => {
                      pos++;
                      return (
                        <li key={p.s.id} className="group flex items-center gap-4 px-5 py-3 transition hover:bg-paper/50">
                          <span className="tnum w-6 text-center text-sm text-faint">{pos}</span>
                          <Avatar name={p.s.name} src={p.s.photo} size={34} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-sm font-medium text-ink">{p.s.name}</span>
                              {p.ready && <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-600">Pronto para graduar</span>}
                            </div>
                            <div className="mt-0.5 text-xs text-muted">
                              {degreeLabel(p.s.degree)} · há {fmtDuration(p.since, today)} na faixa · {p.trainingsSince} treinos desde a última graduação
                            </div>
                          </div>
                          <DegreeDots belt={p.s.belt} degree={p.s.degree} />
                          <Button size="sm" variant="ghost" icon={Award} onClick={() => setPromoteId(p.s.id)} className="[@media(hover:hover)]:opacity-0 group-hover:opacity-100 focus-visible:opacity-100">
                            Promover
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          ) : freq.length === 0 ? (
            <EmptyState icon={TrendingUp} title="Sem treinos no período" text="O ranking de frequência aparece com os check-ins." className="py-16" />
          ) : (
            <div className="p-5">
              <ol className="space-y-0.5">
                {freq.slice(0, 15).map((p, i) => (
                  <li key={p.s.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-paper/60">
                    <span className={clsx('tnum w-6 text-center text-sm', i < 3 ? 'font-semibold text-brand-500' : 'text-faint')}>{i + 1}</span>
                    <Avatar name={p.s.name} src={p.s.photo} size={30} />
                    <span className="w-28 truncate text-[13px] font-medium text-ink @xl:w-44">{p.s.name}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-2">
                      <div className={clsx('h-full rounded-full', i < 3 ? 'bg-brand-500' : 'bg-navy-900/70')} style={{ width: `${(p.n / maxN) * 100}%` }} />
                    </div>
                    <span className="tnum w-16 text-right text-[13px] text-ink-2 @xl:w-20">{p.n} treinos</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </Card>

        <div className="space-y-5">
          <Card className="p-6">
            <CardHeader icon={Flame} title="Prontos para graduar" subtitle="Sugestão pela frequência" />
            {ready.length ? (
              <ul className="mt-4 space-y-0.5">
                {ready.slice(0, 5).map((p) => (
                  <li key={p.s.id}>
                    <button onClick={() => setPromoteId(p.s.id)} className="group -mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-lg p-2 text-left transition hover:bg-paper">
                      <Avatar name={p.s.name} src={p.s.photo} size={32} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-ink">{p.s.name}</span>
                        <span className="block text-[11px] text-muted">
                          {p.trainingsSince} treinos · {fmtDuration(p.since, today)} de {beltDef(p.s.belt).label.toLowerCase()}
                        </span>
                      </span>
                      <ArrowRight className="size-4 text-faint transition group-hover:translate-x-0.5 group-hover:text-brand-500" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-[13px] text-muted">Ninguém atingiu o critério ainda.</p>
            )}
          </Card>

          <Card className="p-6">
            <CardHeader icon={History} title="Últimas graduações" subtitle="Histórico da academia" />
            {recent.length ? (
              <ol className="relative mt-5 space-y-4 before:absolute before:top-2 before:bottom-2 before:left-[13px] before:w-px before:bg-line">
                {recent.map((g) => {
                  const s = db.students.find((x) => x.id === g.studentId);
                  if (!s) return null;
                  const demo = isDemotion({ belt: g.fromBelt, degree: g.fromDegree }, { belt: g.toBelt, degree: g.toDegree });
                  return (
                    <li key={g.id} className="relative flex gap-3">
                      <span className={clsx('z-10 grid size-7 shrink-0 place-items-center rounded-full ring-4 ring-white', demo ? 'bg-rose-50 text-rose-500' : g.fromBelt !== g.toBelt ? 'bg-brand-50 text-brand-500' : 'bg-paper-2 text-muted')}>
                        {g.fromBelt !== g.toBelt ? <Medal className="size-3.5" /> : <Award className="size-3.5" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-medium text-ink">{s.name}</div>
                        <div className="text-xs text-muted">
                          {demo ? 'Correção: ' : ''}
                          {beltLabel(g.fromBelt, g.fromDegree)} → <span className="text-ink-2">{beltLabel(g.toBelt, g.toDegree)}</span>
                        </div>
                        {g.note && <div className="mt-1 text-xs text-ink-2 italic">“{g.note}”</div>}
                        <div className="mt-0.5 text-[11px] text-faint">{fmtDate(g.date)}</div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="mt-4 text-[13px] leading-relaxed text-muted">As graduações aparecem aqui quando você muda a faixa ou o grau de um aluno.</p>
            )}
          </Card>
        </div>
      </div>

      <PromoteModal open={promoteId !== undefined} onClose={() => setPromoteId(undefined)} studentId={promoteId ?? null} />
    </>
  );
}

function DegreeDots({ belt, degree }: { belt: Parameters<typeof maxDegree>[0]; degree: number }) {
  const max = maxDegree(belt);
  return (
    <span className="hidden items-center gap-1 @2xl:flex" aria-label={degreeLabel(degree)}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={clsx('h-3 w-1.5 rounded-sm', i < degree ? (belt === 'preta' ? 'bg-rose-600' : 'bg-ink') : 'bg-paper-2 ring-1 ring-line ring-inset')} />
      ))}
    </span>
  );
}

function SummaryCard({ icon: Icon, tone, value, label, sub }: { icon: typeof Trophy; tone: string; value: number; label: string; sub: string }) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <span className={clsx('grid size-10 shrink-0 place-items-center rounded-full', tone)}>
        <Icon className="size-[18px]" />
      </span>
      <div className="min-w-0">
        <div className="font-display text-2xl leading-none font-semibold text-ink">{value}</div>
        <div className="mt-1 text-[13px] text-ink-2">{label}</div>
        <div className="truncate text-xs text-faint">{sub}</div>
      </div>
    </Card>
  );
}
