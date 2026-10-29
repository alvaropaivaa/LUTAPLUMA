import { useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Cake,
  CalendarCheck,
  CircleDollarSign,
  Clock,
  Search,
  Star,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  Radio,
  UserCheck,
  CalendarDays,
  type LucideIcon,
} from 'lucide-react';
import { useNow, useStore } from '../lib/store';
import { ChevronDown, LogOut, Smartphone } from 'lucide-react';
import { activeStudents, beltDistribution, classesOn, dailySeries, enrolled, monthlyRecurring, planOf, revenueByMonth, sessionInfo, studentStatus, topClasses } from '../lib/selectors';
import { addDays, diffDays, fmtLong, fmtShort, greeting, monthKey, parseISO, weekday, WEEK_ORDER, WEEKDAYS, WEEKDAYS_SHORT, MONTHS_SHORT } from '../lib/dates';
import { brl, brlInt } from '../lib/belts';
import { Avatar, BeltBar, Logo } from '../components/bits';
import { Card, CardHeader, EmptyState, NoData, PageHeader, Segmented, usePopover } from '../components/ui';
import { Bars, FlatLine, Sparkline } from '../components/charts';

export default function Overview() {
  const { db, me } = useStore();
  const { today, nowMin, time } = useNow();
  const [range, setRange] = useState<'30' | '7'>('30');

  const data = useMemo(() => {
    const active = activeStudents(db);
    const all = enrolled(db);
    const thisMonth = monthKey(today);
    const newThisMonth = all.filter((s) => monthKey(s.joinedAt) === thisMonth).length;
    // janelas móveis de 7 dias terminando hoje (sempre completas)
    const windows = Array.from({ length: 8 }, (_, i) => {
      const to = addDays(today, -7 * (7 - i));
      return { from: addDays(to, -6), to };
    });
    const weeklyActive = windows.map(({ from, to }) => new Set(db.checkins.filter((k) => k.date >= from && k.date <= to).map((k) => k.studentId)).size);
    const weeklyCheckins = windows.map(({ from, to }) => db.checkins.filter((k) => k.date >= from && k.date <= to).length);
    const d30 = dailySeries(db, 30, today);
    const total30 = d30.reduce((n, d) => n + d.value, 0);
    const prev30 = db.checkins.filter((k) => k.date >= addDays(today, -59) && k.date <= addDays(today, -30)).length;
    const rev = revenueByMonth(db, 6, today);
    const statuses = all.map((s) => ({ s, st: studentStatus(s, today) }));
    const late = statuses.filter((x) => x.st === 'atrasado');
    const soon = statuses.filter((x) => x.st === 'vence-logo');
    const ok = statuses.filter((x) => x.st === 'em-dia');
    const owed = late.reduce((n, x) => n + (planOf(db, x.s)?.price ?? 0), 0);
    return { active, all, newThisMonth, weeklyActive, weeklyCheckins, d30, total30, prev30, rev, late, soon, ok, owed };
  }, [db, today]);

  const series = (range === '30' ? data.d30 : data.d30.slice(-7)).map((d) => ({
    label: fmtShort(d.date),
    tip: `${WEEKDAYS_SHORT[parseISO(d.date).getDay()]}, ${fmtShort(d.date)}`,
    value: d.value,
    highlight: d.date === today,
  }));
  const seriesTotal = series.reduce((n, d) => n + d.value, 0);

  // Números do gráfico de frequência
  const days = series.length;
  const avg = days ? seriesTotal / days : 0;
  const fmt1 = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  const prevTotal = db.checkins.filter((k) => k.date >= addDays(today, -(2 * days) + 1) && k.date <= addDays(today, -days)).length;
  const periodDelta = prevTotal ? Math.round(((seriesTotal - prevTotal) / prevTotal) * 100) : null;
  const peak = series.reduce((m, d) => (d.value > m.value ? d : m), series[0]);
  // Média por dia da semana nas últimas 8 semanas
  const byWeekday = WEEK_ORDER.map((wd) => {
    const n = db.checkins.filter((k) => k.date > addDays(today, -56) && k.date <= today && weekday(k.date) === wd).length;
    return { wd, avg: n / 8 };
  });
  const bestWd = byWeekday.reduce((m, x) => (x.avg > m.avg ? x : m), byWeekday[0]);
  const maxWd = Math.max(1, ...byWeekday.map((x) => x.avg));
  const mrr = monthlyRecurring(db);
  const revNow = data.rev[data.rev.length - 1].value;

  const belts = beltDistribution(db).filter((b) => b.count > 0 || !b.belt.kids);
  const beltTotal = belts.reduce((n, b) => n + b.count, 0);
  const beltMax = Math.max(1, ...belts.map((b) => b.count));
  const top = topClasses(db, today, 30).slice(0, 4);
  const todays = classesOn(db, today);
  // Resumo do dia no topo
  const liveNow = todays.filter((c) => sessionInfo(db, c, today, today, nowMin).status === 'aberta');
  const upcoming = todays.find((c) => sessionInfo(db, c, today, today, nowMin).status === 'agendada');
  const checkinsToday = db.checkins.filter((k) => k.date === today).length;
  const attention = [...data.late, ...data.soon].slice(0, 4);

  return (
    <>
      <PageHeader
        eyebrow={fmtLong(today)}
        title={`${greeting(time)}, ${me?.name.split(' ')[0] ?? 'professor'}`}
        dot={false}
        subtitle="Aqui está o resumo da sua academia."
        meta={
          <>
            <HeaderChip to="/painel/grade" icon={CalendarDays}>
              {todays.length} {todays.length === 1 ? 'aula hoje' : 'aulas hoje'}
            </HeaderChip>
            <HeaderChip to="/painel/chamada" icon={Radio} live={liveNow.length > 0}>
              {liveNow.length
                ? `${liveNow.length} em chamada agora`
                : upcoming
                  ? `Próxima: ${upcoming.time} · ${upcoming.name}`
                  : 'Sem mais aulas hoje'}
            </HeaderChip>
            <HeaderChip to="/painel/chamada" icon={UserCheck}>
              {checkinsToday} {checkinsToday === 1 ? 'check-in hoje' : 'check-ins hoje'}
            </HeaderChip>
            {data.late.length > 0 && (
              <HeaderChip to="/painel/alunos?filtro=atrasado" icon={AlertTriangle} warn>
                {data.late.length} {data.late.length === 1 ? 'mensalidade atrasada' : 'mensalidades atrasadas'}
              </HeaderChip>
            )}
          </>
        }
        actions={
          <>
            <StudentSearch />
            <NotificationBell late={data.late.length} soon={data.soon.length} />
            <ProfileMenu />
          </>
        }
      />

      {/* Indicadores */}
      <section className="grid grid-cols-1 gap-4 @xl:grid-cols-2 @5xl:grid-cols-4">
        <KpiCard
          to="/painel/alunos"
          icon={Users}
          tone="bg-brand-50 text-brand-500"
          label="Alunos ativos"
          value={String(data.active.length)}
          delta={data.newThisMonth ? { text: `+${data.newThisMonth} no mês`, good: true } : undefined}
          sub={`de ${data.all.length} cadastrados`}
          empty={!data.all.length}
        >
          <Sparkline data={data.weeklyActive} color="#F2701C" height={48} />
        </KpiCard>

        <KpiCard
          to="/painel/financeiro"
          icon={Wallet}
          tone="bg-emerald-50 text-emerald-600"
          label="Receita mensal"
          value={brlInt(revNow)}
          sub={mrr ? `Meta do mês: ${brlInt(mrr)}` : 'Sem planos ativos'}
          empty={!mrr && !revNow}
        >
          <GoalBar value={revNow} goal={mrr} />
        </KpiCard>

        <KpiCard
          to="/painel/alunos?filtro=atrasado"
          icon={AlertTriangle}
          tone="bg-rose-50 text-rose-500"
          label="Inadimplentes"
          value={String(data.late.length)}
          delta={data.late.length ? { text: `${brl(data.owed)} em aberto`, good: false } : { text: 'Tudo em dia', good: true }}
          sub={`${data.soon.length} ${data.soon.length === 1 ? 'vence' : 'vencem'} em até 5 dias`}
          empty={!data.all.length}
        >
          <StatusBar ok={data.ok.length} soon={data.soon.length} late={data.late.length} />
        </KpiCard>

        <KpiCard
          to="/painel/chamada"
          icon={CalendarCheck}
          tone="bg-sky-50 text-sky-600"
          label="Check-ins (30 dias)"
          value={String(data.total30)}
          delta={data.prev30 ? { text: `${data.total30 >= data.prev30 ? '+' : ''}${Math.round(((data.total30 - data.prev30) / data.prev30) * 100)}%`, good: data.total30 >= data.prev30, arrow: true } : undefined}
          sub={`${(data.total30 / 30).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} por dia · vs. 30 dias antes`}
          empty={!data.total30}
        >
          <Sparkline data={data.weeklyCheckins} color="#0EA5E9" height={48} />
        </KpiCard>
      </section>

      {/* Frequência + faixas */}
      <section className="mt-4 grid grid-cols-1 gap-4 @4xl:grid-cols-3">
        <Card className="p-5 @md:p-6 @4xl:col-span-2">
          <CardHeader
            icon={TrendingUp}
            title="Frequência diária"
            subtitle={range === '30' ? 'Últimos 30 dias' : 'Últimos 7 dias'}
            action={
              <Segmented
                size="sm"
                value={range}
                onChange={setRange}
                options={[
                  { value: '30', label: '30 dias' },
                  { value: '7', label: '7 dias' },
                ]}
              />
            }
          />
          {seriesTotal ? (
            <>
              {/* Resumo do período */}
              <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-line ring-1 ring-line @2xl:grid-cols-4">
                <MiniStat label="Check-ins" value={String(seriesTotal)} />
                <MiniStat label="Média por dia" value={fmt1(avg)} />
                <MiniStat label="Dia mais cheio" value={String(peak.value)} hint={peak.tip} />
                <MiniStat
                  label="vs. período anterior"
                  value={periodDelta === null ? '—' : `${periodDelta > 0 ? '+' : ''}${periodDelta}%`}
                  tone={periodDelta === null ? undefined : periodDelta >= 0 ? 'good' : 'bad'}
                />
              </div>

              <div className="mt-5">
                <Bars
                  data={series}
                  height={230}
                  maxBarSize={range === '7' ? 44 : 16}
                  track
                  avg={avg}
                  avgLabel={`média ${fmt1(avg)}`}
                  format={(v) => `${v} ${v === 1 ? 'check-in' : 'check-ins'}`}
                  note={(v) => (v === 0 ? 'Sem treinos neste dia' : v >= avg ? `${fmt1(v - avg)} acima da média` : `${fmt1(avg - v)} abaixo da média`)}
                />
              </div>

              {/* Média por dia da semana */}
              <div className="mt-5 border-t border-line pt-4">
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-[13px] font-medium text-ink-2">Média por dia da semana</span>
                  <span className="text-xs text-muted">
                    <b className="font-semibold text-brand-600">{WEEKDAYS[bestWd.wd]}</b> é o dia mais cheio
                  </span>
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {byWeekday.map((x) => (
                    <div key={x.wd} className="flex flex-col items-center gap-1.5" title={`${WEEKDAYS[x.wd]}: média de ${fmt1(x.avg)} check-ins`}>
                      <span className={clsx('tnum text-[11px] font-semibold', x.wd === bestWd.wd ? 'text-brand-600' : 'text-ink-2')}>{fmt1(x.avg)}</span>
                      <div className="flex h-14 w-3 items-end overflow-hidden rounded-full bg-paper-2 @md:w-4">
                        <div
                          className={clsx('w-full rounded-full transition-[height] duration-700', x.wd === bestWd.wd ? 'bg-brand-500' : 'bg-brand-200')}
                          style={{ height: `${x.avg ? Math.max(10, (x.avg / maxWd) * 100) : 0}%` }}
                        />
                      </div>
                      <span className={clsx('text-[11px]', x.wd === bestWd.wd ? 'font-medium text-brand-600' : 'text-muted')}>{WEEKDAYS_SHORT[x.wd]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <EmptyState icon={TrendingUp} title="Sem check-ins no período" text="A frequência aparece aqui quando os alunos começarem a treinar." dashed className="mt-6 h-[240px]" />
          )}
        </Card>

        <Card className="flex flex-col p-6">
          <CardHeader icon={Users} title="Alunos por faixa" subtitle={beltTotal ? `${beltTotal} alunos ativos` : undefined} />
          {beltTotal ? (
            <ul className="mt-6 flex flex-1 flex-col justify-between gap-3">
              {belts.map(({ belt, count }) => (
                <li key={belt.id} className="flex items-center gap-3 text-[13px]">
                  <BeltBar belt={belt.id} degree={0} className="w-7 shrink-0" height={7} />
                  <span className="w-16 text-ink-2">{belt.label}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-2">
                    <div className="h-full rounded-full bg-navy-900/80" style={{ width: `${(count / beltMax) * 100}%` }} />
                  </div>
                  <span className="tnum w-5 text-right font-medium text-ink">{count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={Users} title="Sem alunos ainda." text="Os alunos cadastrados irão aparecer aqui." className="flex-1" />
          )}
        </Card>
      </section>

      {/* Aulas, mensalidades, hoje */}
      <section className="mt-4 grid grid-cols-1 gap-4 @3xl:grid-cols-2 @5xl:grid-cols-3">
        <Card className="flex flex-col p-6">
          <CardHeader icon={Star} title="Aulas mais cheias" subtitle="Média de alunos por aula" />
          {top.length ? (
            <ol className="mt-4 divide-y divide-line">
              {top.map((t, i) => (
                <li key={t.cls.id} className="flex items-center gap-3 py-3">
                  <span className={clsx('tnum w-5 text-sm font-semibold', i === 0 ? 'text-brand-500' : 'text-faint')}>{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium text-ink">{t.cls.name}</div>
                    <div className="truncate text-xs text-muted">
                      {t.cls.days.map((d) => WEEKDAYS_SHORT[d]).join(' · ')} · {t.cls.time}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="tnum text-sm font-semibold text-ink">{t.avg.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</span>
                    <span className="text-xs text-faint">/{t.cls.capacity}</span>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState icon={Star} dashed className="mt-5 flex-1" title="Nenhum check-in ainda" text="As aulas mais cheias vão aparecer aqui assim que os alunos começarem a treinar." />
          )}
        </Card>

        <Card className="flex flex-col p-6">
          <CardHeader
            icon={CircleDollarSign}
            title="Mensalidades"
            subtitle="Situação dos planos"
            action={
              <Link to="/painel/alunos?filtro=atrasado" className="inline-flex shrink-0 items-center gap-1 text-xs font-medium whitespace-nowrap text-brand-600 hover:text-brand-700">
                Ver alunos <ArrowRight className="size-3.5" />
              </Link>
            }
          />
          {data.all.length ? (
            <>
              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                {[
                  { n: data.ok.length, l: 'Em dia', dot: 'bg-emerald-500' },
                  { n: data.soon.length, l: 'Vencem logo', dot: 'bg-amber-400' },
                  { n: data.late.length, l: 'Atrasadas', dot: 'bg-rose-500' },
                ].map((x) => (
                  <div key={x.l} className="rounded-xl bg-paper px-2 py-2.5">
                    <div className="tnum font-display text-lg font-semibold text-ink">{x.n}</div>
                    <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted">
                      <span className={clsx('size-1.5 rounded-full', x.dot)} />
                      {x.l}
                    </div>
                  </div>
                ))}
              </div>
              {attention.length ? (
                <ul className="mt-3 divide-y divide-line">
                  {attention.map(({ s, st }) => {
                    const days = diffDays(today, s.dueDate!);
                    return (
                      <li key={s.id} className="flex items-center gap-3 py-2.5">
                        <Avatar name={s.name} src={s.photo} size={30} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-medium text-ink">{s.name}</div>
                          <div className={clsx('text-xs', st === 'atrasado' ? 'text-rose-600' : 'text-amber-600')}>
                            {st === 'atrasado' ? `Atrasada há ${-days} ${-days === 1 ? 'dia' : 'dias'}` : days === 0 ? 'Vence hoje' : `Vence em ${days} ${days === 1 ? 'dia' : 'dias'}`}
                          </div>
                        </div>
                        <span className="tnum text-[13px] text-ink-2">{brl(planOf(db, s)?.price ?? 0)}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <EmptyState icon={CircleDollarSign} title="Tudo em dia" text="Nenhuma mensalidade em atraso no momento." className="py-6" />
              )}
            </>
          ) : (
            <EmptyState icon={CircleDollarSign} title="Tudo em dia" text="Nenhuma mensalidade em atraso no momento." className="flex-1" />
          )}
        </Card>

        <section className="relative flex flex-col overflow-hidden rounded-[20px] bg-navy-900 p-6 text-white @3xl:col-span-2 @5xl:col-span-1">
          {/* logo grande e translúcida ao fundo do cartão */}
          <Logo size={240} className="pointer-events-none absolute -right-14 -bottom-14 -rotate-12 opacity-[0.13]" />
          <div className="relative flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full bg-white/10">
              <Clock className="size-4" />
            </span>
            <Link to="/painel/chamada" className="inline-flex items-center gap-1 text-[15px] font-semibold hover:text-white/80">
              Hoje na academia <ArrowRight className="size-4" />
            </Link>
            <span className="ml-auto text-xs text-white/60">
              {todays.length} {todays.length === 1 ? 'aula' : 'aulas'}
            </span>
          </div>
          {todays.length ? (
            <ol className="relative mt-4 flex-1 divide-y divide-white/10">
              {todays.map((c) => {
                const info = sessionInfo(db, c, today, today, nowMin);
                const present = db.checkins.filter((k) => k.classId === c.id && k.date === today).length;
                return (
                  <li key={c.id}>
                    <Link to={`/painel/chamada?aula=${c.id}`} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition hover:bg-white/5">
                      <span className="tnum w-12 text-sm font-semibold">{c.time}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-medium">{c.name}</div>
                        <div className="flex items-center gap-1.5 text-xs text-white/55">
                          <span className={clsx('size-1.5 rounded-full', info.status === 'aberta' ? 'bg-emerald-400' : 'bg-white/30')} />
                          {info.status === 'aberta' ? 'Check-in aberto' : info.status === 'encerrada' ? 'Encerrada' : `Abre às ${info.opensAt}`}
                        </div>
                      </div>
                      <span className="tnum text-[13px] text-white/80">
                        {present}
                        <span className="text-white/40">/{c.capacity}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="relative mt-4 text-sm text-white/60">Nenhuma aula hoje. Cadastre aulas na grade para vê-las aqui.</p>
          )}
          <Link to="/painel/chamada" className="relative mt-5 inline-flex h-10 items-center gap-2 self-start rounded-full bg-white px-4 text-sm font-medium text-ink transition hover:bg-white/90">
            <CalendarCheck className="size-4" /> Abrir chamada
          </Link>
        </section>
      </section>
    </>
  );
}

function MiniStat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'good' | 'bad' }) {
  return (
    <div className="bg-white px-4 py-3">
      <div className="text-[11px] text-muted">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-1.5">
        <span className={clsx('tnum text-lg font-semibold', tone === 'good' ? 'text-emerald-600' : tone === 'bad' ? 'text-rose-600' : 'text-ink')}>{value}</span>
        {hint && <span className="truncate text-[11px] text-muted">{hint}</span>}
      </div>
    </div>
  );
}

/** Pílula clicável do resumo do dia, sobre a faixa azul */
function HeaderChip({ to, icon: Icon, live, warn, children }: { to: string; icon: LucideIcon; live?: boolean; warn?: boolean; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white/[0.07] px-3 text-xs text-white/85 ring-1 ring-white/10 transition hover:bg-white/[0.12] hover:text-white"
    >
      {live ? (
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
        </span>
      ) : (
        <Icon className={clsx('size-3.5', warn ? 'text-amber-300' : 'text-brand-300')} />
      )}
      {children}
    </Link>
  );
}

/** Cartão de indicador: valor em destaque, variação, legenda e um visual próprio embaixo */
function KpiCard({
  to,
  icon: Icon,
  tone,
  label,
  value,
  delta,
  sub,
  empty,
  children,
}: {
  to: string;
  icon: LucideIcon;
  tone: string;
  label: string;
  value: string;
  delta?: { text: string; good: boolean; arrow?: boolean };
  sub: string;
  empty?: boolean;
  children: ReactNode;
}) {
  return (
    <Link to={to} className="group card flex flex-col p-5 transition duration-300 hover:-translate-y-0.5 hover:shadow-(--shadow-lift)">
      <div className="flex items-center gap-3">
        <span className={clsx('grid size-9 place-items-center rounded-[10px] transition-transform duration-300 group-hover:scale-110', tone)}>
          <Icon className="size-[17px]" strokeWidth={2} />
        </span>
        <span className="flex-1 text-[13px] font-medium text-ink-2">{label}</span>
        <span className="grid size-7 place-items-center rounded-full text-faint ring-1 ring-line transition duration-300 group-hover:rotate-45 group-hover:bg-ink group-hover:text-white group-hover:ring-ink">
          <ArrowUpRight className="size-3.5" />
        </span>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <span className="tnum font-display text-[30px] leading-none font-semibold tracking-tight whitespace-nowrap text-ink">{value}</span>
        {empty ? (
          <NoData />
        ) : (
          delta && (
            <span
              className={clsx(
                'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap',
                delta.good ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600',
              )}
            >
              {delta.arrow && (delta.good ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />)}
              {delta.text}
            </span>
          )
        )}
      </div>
      <p className="mt-1.5 truncate text-xs text-muted">{sub}</p>

      <div className="mt-auto flex h-14 flex-col justify-end pt-4">{empty ? <FlatLine height={36} /> : children}</div>
    </Link>
  );
}

/** Barra de progresso até a meta (receita prevista do mês) */
function GoalBar({ value, goal }: { value: number; goal: number }) {
  const pct = goal ? Math.min(1, value / goal) : 0;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-[11px]">
        <span className="font-semibold text-emerald-700">{Math.round(pct * 100)}% da meta</span>
        <span className="text-muted">faltam {brlInt(Math.max(0, goal - value))}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-emerald-50">
        <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-[width] duration-700" style={{ width: `${pct * 100}%` }} />
      </div>
    </div>
  );
}

/** Situação das mensalidades em uma barra empilhada */
function StatusBar({ ok, soon, late }: { ok: number; soon: number; late: number }) {
  const parts = [
    { n: ok, cls: 'bg-emerald-500', label: 'em dia' },
    { n: soon, cls: 'bg-amber-400', label: 'vencendo' },
    { n: late, cls: 'bg-rose-500', label: 'atrasadas' },
  ];
  return (
    <div>
      <div className="flex h-2.5 gap-[3px] overflow-hidden rounded-full">
        {parts.map((p) => (p.n ? <span key={p.label} className={p.cls} style={{ flex: p.n }} /> : null))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-muted">
        {parts.map((p) => (
          <span key={p.label} className="inline-flex items-center gap-1">
            <span className={clsx('size-1.5 rounded-full', p.cls)} />
            <b className="font-semibold text-ink-2">{p.n}</b> {p.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function StudentSearch() {
  const { db } = useStore();
  const { today } = useNow();
  const navigate = useNavigate();
  const pop = usePopover();
  const [q, setQ] = useState('');
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const results = q.trim() ? db.students.filter((s) => norm(s.name).includes(norm(q)) || norm(s.email).includes(norm(q))).slice(0, 6) : [];

  return (
    <div ref={pop.ref} className="relative min-w-0 flex-1 sm:flex-none">
      <div className="flex h-10 w-full items-center gap-2.5 rounded-full bg-white/[0.07] px-4 text-white ring-1 ring-white/15 transition focus-within:bg-white/10 focus-within:ring-white/35 sm:w-[300px]">
        <Search className="size-4 text-white/60" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            pop.setOpen(true);
          }}
          onFocus={() => pop.setOpen(true)}
          placeholder="Buscar aluno, matrícula…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-white/50"
        />
      </div>
      {pop.open && q.trim() && (
        <div className="absolute right-0 z-30 mt-2 w-full overflow-hidden rounded-xl bg-white p-1 text-ink shadow-(--shadow-lift) ring-1 ring-line animate-pop">
          {results.length ? (
            results.map((s) => (
              <button key={s.id} onClick={() => navigate(`/painel/alunos?aluno=${s.id}`)} className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-paper">
                <Avatar name={s.name} src={s.photo} size={28} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-ink">{s.name}</span>
                  <span className="block truncate text-[11px] text-muted">
                    {s.role === 'professor' ? 'Professor' : studentStatus(s, today) === 'atrasado' ? 'Mensalidade atrasada' : s.email}
                  </span>
                </span>
              </button>
            ))
          ) : (
            <p className="px-3 py-4 text-center text-[13px] text-muted">Nenhum aluno encontrado.</p>
          )}
        </div>
      )}
    </div>
  );
}

/** Perfil no topo: mesmo estilo translúcido do sino, com um menu curto */
function ProfileMenu() {
  const { me, logout } = useStore();
  const navigate = useNavigate();
  const pop = usePopover();
  if (!me) return null;
  const initials = me.name
    .split(' ')
    .filter(Boolean)
    .map((p, i, a) => (i === 0 || i === a.length - 1 ? p[0] : ''))
    .join('')
    .toUpperCase();
  return (
    <div ref={pop.ref} className="relative">
      <button
        onClick={() => pop.setOpen(!pop.open)}
        className="flex h-10 items-center gap-2 rounded-full bg-white/[0.07] pr-3 pl-1 text-white ring-1 ring-white/15 transition hover:bg-white/10"
        aria-label="Menu do perfil"
      >
        {me.photo ? (
          <img src={me.photo} alt="" className="size-8 rounded-full object-cover" />
        ) : (
          <span className="grid size-8 place-items-center rounded-full bg-brand-500 text-xs font-semibold">{initials}</span>
        )}
        <ChevronDown className={clsx('size-4 text-white/60 transition', pop.open && 'rotate-180')} />
      </button>
      {pop.open && (
        <div className="absolute right-0 z-30 mt-2 w-60 overflow-hidden rounded-xl bg-white p-1 text-ink shadow-(--shadow-lift) ring-1 ring-line animate-pop">
          <div className="px-3 pt-2.5 pb-2">
            <div className="truncate text-sm font-semibold">{me.name}</div>
            <div className="truncate text-xs text-muted">{me.email}</div>
          </div>
          <div className="my-1 h-px bg-line" />
          <button onClick={() => navigate('/painel/app')} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm hover:bg-paper">
            <Smartphone className="size-4 text-muted" /> Ver app do aluno
          </button>
          <button
            onClick={() => {
              logout();
              navigate('/entrar');
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
          >
            <LogOut className="size-4" /> Sair
          </button>
        </div>
      )}
    </div>
  );
}

function NotificationBell({ late, soon }: { late: number; soon: number }) {
  const { db } = useStore();
  const { today } = useNow();
  const pop = usePopover();
  const month = parseISO(today).getMonth();
  const birthdays = enrolled(db).filter((s) => s.birthDate && parseISO(s.birthDate).getMonth() === month && s.active);
  const todayCount = db.checkins.filter((k) => k.date === today).length;
  const items: { icon: LucideIcon; title: string; text: string; to: string }[] = [];
  if (late) items.push({ icon: AlertTriangle, title: `${late} ${late === 1 ? 'mensalidade atrasada' : 'mensalidades atrasadas'}`, text: 'Registre o pagamento ou entre em contato.', to: '/painel/financeiro' });
  if (soon) items.push({ icon: Clock, title: `${soon} ${soon === 1 ? 'plano vence' : 'planos vencem'} em até 5 dias`, text: 'Lembre os alunos de renovar.', to: '/painel/alunos?filtro=vence-logo' });
  if (todayCount) items.push({ icon: CalendarCheck, title: `${todayCount} check-ins hoje`, text: 'Veja quem já treinou na chamada do dia.', to: '/painel/chamada' });
  if (birthdays.length)
    items.push({
      icon: Cake,
      title: `${birthdays.length} ${birthdays.length === 1 ? 'aniversariante' : 'aniversariantes'} em ${MONTHS_SHORT[month].toLowerCase()}`,
      text: birthdays.slice(0, 3).map((b) => b.name.split(' ')[0]).join(', ') + (birthdays.length > 3 ? '…' : ''),
      to: '/painel/alunos',
    });

  return (
    <div ref={pop.ref} className="relative">
      <button onClick={() => pop.setOpen(!pop.open)} className="relative grid size-10 place-items-center rounded-full bg-white/[0.07] text-white ring-1 ring-white/15 transition hover:bg-white/10" aria-label="Avisos">
        <Bell className="size-[17px]" />
        {items.length > 0 && <span className="absolute top-2 right-2.5 size-2 rounded-full bg-brand-500 ring-2 ring-navy-900" />}
      </button>
      {pop.open && (
        <div className="absolute right-0 z-30 mt-2 w-[min(320px,calc(100vw-2rem))] overflow-hidden rounded-xl bg-white text-ink shadow-(--shadow-lift) ring-1 ring-line animate-pop">
          <div className="border-b border-line px-4 py-3 text-sm font-semibold">Avisos</div>
          {items.length ? (
            <ul className="p-1">
              {items.map((it) => (
                <li key={it.title}>
                  <Link to={it.to} onClick={() => pop.setOpen(false)} className="flex gap-3 rounded-lg p-2.5 hover:bg-paper">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-paper-2 text-ink-2">
                      <it.icon className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-medium text-ink">{it.title}</span>
                      <span className="block truncate text-xs text-muted">{it.text}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-8 text-center text-[13px] text-muted">Nenhum aviso por enquanto.</p>
          )}
        </div>
      )}
    </div>
  );
}
