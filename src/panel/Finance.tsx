import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { AlertTriangle, Banknote, CalendarClock, CreditCard, Landmark, Plus, QrCode, Receipt, RefreshCw, Search, TrendingUp, Wallet, type LucideIcon } from 'lucide-react';
import { useNow, useStore } from '../lib/store';
import { enrolled, monthlyRecurring, planOf, revenueByMonth, studentStatus } from '../lib/selectors';
import { brl, PAY_METHODS, payMethodLabel } from '../lib/belts';
import { diffDays, fmtAgo, fmtDate, fmtShort, monthKey, MONTHS, MONTHS_SHORT, parseISO } from '../lib/dates';
import { Avatar } from '../components/bits';
import { Button, Card, EmptyState, PageHeader, Segmented, useToast } from '../components/ui';
import { Bars } from '../components/charts';
import { PaymentModal } from './shared';
import type { PayMethod } from '../lib/types';

const METHOD_ICON: Record<PayMethod, LucideIcon> = { pix: QrCode, cartao: CreditCard, dinheiro: Banknote, boleto: Landmark };

export default function Finance() {
  const { db } = useStore();
  const { today } = useNow();
  const [payFor, setPayFor] = useState<string | null | undefined>(undefined);
  const [tab, setTab] = useState<'vencer' | 'atrasados'>('vencer');
  const [q, setQ] = useState('');
  const [method, setMethod] = useState<'todos' | PayMethod>('todos');
  const [limit, setLimit] = useState(10);

  const m = useMemo(() => {
    const thisMonth = monthKey(today);
    const monthPays = db.payments.filter((p) => monthKey(p.date) === thisMonth);
    const people = enrolled(db).filter((s) => s.active && s.planId && s.dueDate);
    const late = people.filter((s) => studentStatus(s, today) === 'atrasado').sort((a, b) => a.dueDate!.localeCompare(b.dueDate!));
    const upcoming = people.filter((s) => diffDays(today, s.dueDate!) >= 0).sort((a, b) => a.dueDate!.localeCompare(b.dueDate!));
    const week = upcoming.filter((s) => diffDays(today, s.dueDate!) <= 7);
    const price = (s: (typeof people)[number]) => planOf(db, s)?.price ?? 0;
    return {
      received: monthPays.reduce((n, p) => n + p.amount, 0),
      receivedCount: monthPays.length,
      late,
      lateValue: late.reduce((n, s) => n + price(s), 0),
      upcoming,
      week,
      weekValue: week.reduce((n, s) => n + price(s), 0),
      mrr: monthlyRecurring(db),
      rev: revenueByMonth(db, 6, today),
      price,
    };
  }, [db, today]);

  const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const history = db.payments
    .filter((p) => method === 'todos' || p.method === method)
    .filter((p) => !q || norm(db.students.find((s) => s.id === p.studentId)?.name ?? '').includes(norm(q)))
    .sort((a, b) => b.date.localeCompare(a.date));

  const avgTicket = m.receivedCount ? m.received / m.receivedCount : 0;
  const list = tab === 'vencer' ? m.upcoming.slice(0, 6) : m.late;

  return (
    <>
      <PageHeader
        eyebrow="Mensalidades e recebimentos"
        title="Financeiro"
        subtitle={`${MONTHS[parseISO(today).getMonth()].replace(/^./, (c) => c.toUpperCase())} de ${today.slice(0, 4)}`}
        actions={
          <Button size="lg" icon={Plus} onClick={() => setPayFor(null)}>
            Registrar pagamento
          </Button>
        }
      />

      <section className="mb-4 grid grid-cols-1 gap-3 @xl:grid-cols-2 @xl:gap-4 @5xl:grid-cols-4">
        <Kpi icon={Wallet} tone="bg-brand-50 text-brand-500" label="Recebido no mês" value={brl(m.received)} sub={`${m.receivedCount} ${m.receivedCount === 1 ? 'pagamento' : 'pagamentos'}`} />
        <Kpi icon={CalendarClock} tone="bg-brand-50 text-brand-500" label="A receber (7 dias)" value={brl(m.weekValue)} sub={`${m.week.length} ${m.week.length === 1 ? 'plano vence' : 'planos vencem'}`} />
        <Kpi icon={AlertTriangle} tone="bg-brand-50 text-brand-500" label="Em atraso" value={brl(m.lateValue)} sub={`${m.late.length} ${m.late.length === 1 ? 'aluno' : 'alunos'} com mensalidade vencida`} />
        <Kpi icon={TrendingUp} tone="bg-brand-50 text-brand-500" label="Receita recorrente" value={brl(m.mrr)} sub="previsão mensal pelos planos ativos" />
      </section>

      <PixClaims />

      <section className="mb-4 grid grid-cols-1 gap-4 @4xl:grid-cols-5">
        <Card className="p-5 @md:p-6 @4xl:col-span-3">
          <div>
            <h3 className="text-[15px] font-semibold text-ink">Receita por mês</h3>
            <p className="text-xs text-muted">
              Últimos 6 meses · {brl(m.rev.reduce((n, r) => n + r.value, 0))} no total · ticket médio {brl(avgTicket)}
            </p>
          </div>
          {m.rev.some((r) => r.value) ? (
            <div className="mt-6">
            <Bars
              height={260}
              maxBarSize={44}
              yWidth={48}
              yFormat={(v) => (v >= 1000 ? `${(v / 1000).toLocaleString('pt-BR')}k` : String(v))}
              format={brl}
              data={m.rev.map((r, i) => ({
                label: MONTHS_SHORT[parseISO(r.date).getMonth()],
                tip: `${MONTHS[parseISO(r.date).getMonth()]} · ${r.count} pagamentos`,
                value: r.value,
                highlight: i === m.rev.length - 1,
              }))}
            />
            </div>
          ) : (
            <EmptyState icon={Receipt} title="Sem receita registrada" text="Os pagamentos registrados aparecem no gráfico." dashed className="h-[270px]" />
          )}
        </Card>

        <Card className="flex flex-col p-5 @md:p-6 @4xl:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[15px] font-semibold text-ink">Vencimentos</h3>
            <Segmented
              size="sm"
              value={tab}
              onChange={setTab}
              options={[
                { value: 'vencer', label: 'Próximos', count: m.upcoming.length },
                { value: 'atrasados', label: 'Atrasados', count: m.late.length },
              ]}
            />
          </div>
          {list.length ? (
            <ul className="mt-4 flex-1 divide-y divide-line">
              {list.map((s) => {
                const d = diffDays(today, s.dueDate!);
                return (
                  <li key={s.id} className="flex items-center gap-3 py-2.5">
                    <Avatar name={s.name} src={s.photo} size={36} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium text-ink">{s.name}</div>
                      <div className={clsx('text-[11px] font-medium', d < 0 ? 'text-rose-600' : d <= 5 ? 'text-amber-600' : 'text-muted')}>
                        {fmtShort(s.dueDate!)} · {d < 0 ? `atrasado há ${-d} ${-d === 1 ? 'dia' : 'dias'}` : d === 0 ? 'vence hoje' : `em ${d} ${d === 1 ? 'dia' : 'dias'}`} · {planOf(db, s)?.name}
                      </div>
                    </div>
                    <span className="tnum hidden text-[13px] text-ink-2 @xl:block">{brl(m.price(s))}</span>
                    <Button size="sm" variant="secondary" icon={RefreshCw} onClick={() => setPayFor(s.id)}>
                      Renovar
                    </Button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState
              icon={tab === 'vencer' ? CalendarClock : Wallet}
              title={tab === 'vencer' ? 'Nenhum vencimento próximo' : 'Nenhum atraso'}
              text={tab === 'vencer' ? 'Nenhum aluno com plano ativo.' : 'Todas as mensalidades estão em dia.'}
              className="flex-1"
            />
          )}
        </Card>
      </section>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-5">
          <h3 className="mr-auto text-[15px] font-semibold text-ink">Histórico de pagamentos</h3>
          <div className="flex h-9 w-full items-center gap-2 rounded-lg bg-white @xl:w-60 px-3 ring-1 ring-line focus-within:ring-2 focus-within:ring-brand-200">
            <Search className="size-4 text-faint" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar aluno" className="w-full bg-transparent text-[13px] outline-none placeholder:text-faint" />
          </div>
          <Segmented size="sm" value={method} onChange={setMethod} options={[{ value: 'todos' as const, label: 'Todos' }, ...PAY_METHODS.map((p) => ({ value: p.id, label: p.label }))]} />
        </div>
        {history.length ? (
          <>
            {/* Celular: lista compacta */}
            <ul className="divide-y divide-line @3xl:hidden">
              {history.slice(0, limit).map((p) => {
                const s = db.students.find((x) => x.id === p.studentId);
                return (
                  <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                    <Avatar name={s?.name ?? '?'} src={s?.photo} size={34} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium text-ink">{s?.name ?? 'Aluno removido'}</div>
                      <div className="truncate text-xs text-muted">
                        {fmtDate(p.date)} · {db.plans.find((x) => x.id === p.planId)?.name} · {payMethodLabel(p.method)}
                      </div>
                    </div>
                    <span className="tnum text-[13px] font-medium text-ink">{brl(p.amount)}</span>
                  </li>
                );
              })}
            </ul>
            {/* Tela larga: tabela */}
            <div className="hidden overflow-x-auto @3xl:block">
              <table className="w-full min-w-[720px] text-left">
                <thead>
                  <tr className="bg-paper/60 text-[11px] font-medium tracking-wider text-muted uppercase">
                    <th className="px-5 py-3">Aluno</th>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Plano</th>
                    <th className="px-4 py-3">Forma</th>
                    <th className="px-4 py-3">Período</th>
                    <th className="px-5 py-3 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {history.slice(0, limit).map((p) => {
                    const s = db.students.find((x) => x.id === p.studentId);
                    const Icon = METHOD_ICON[p.method];
                    return (
                      <tr key={p.id} className="hover:bg-paper/50">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={s?.name ?? '?'} src={s?.photo} size={32} />
                            <span className="truncate text-[13px] font-medium text-ink">{s?.name ?? 'Aluno removido'}</span>
                          </div>
                        </td>
                        <td className="tnum px-4 py-3 text-[13px] text-ink-2">{fmtDate(p.date)}</td>
                        <td className="px-4 py-3 text-[13px] text-ink-2">{db.plans.find((x) => x.id === p.planId)?.name}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 text-xs text-ink-2">
                            <Icon className="size-3.5" /> {payMethodLabel(p.method)}
                          </span>
                        </td>
                        <td className="tnum px-4 py-3 text-xs text-muted">
                          {fmtShort(p.periodStart)} → {fmtShort(p.periodEnd)}
                        </td>
                        <td className="tnum px-5 py-3 text-right text-[13px] font-medium text-ink">{brl(p.amount)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-line px-5 py-3 text-xs text-muted">
              <span>
                {Math.min(limit, history.length)} de {history.length} pagamentos
              </span>
              {history.length > limit && (
                <Button size="sm" variant="ghost" onClick={() => setLimit((l) => l + 15)}>
                  Ver mais
                </Button>
              )}
            </div>
          </>
        ) : (
          <EmptyState icon={Receipt} title="Nenhum pagamento registrado ainda." text="Use “Registrar pagamento” para lançar mensalidades." className="py-14" />
        )}
      </Card>

      <PaymentModal open={payFor !== undefined} onClose={() => setPayFor(undefined)} studentId={payFor ?? null} />
    </>
  );
}

/** PIX que os alunos avisaram pelo app: o professor confere no banco e confirma (renova o plano) */
function PixClaims() {
  const { db, confirmPixClaim, dismissPixClaim } = useStore();
  const toast = useToast();
  if (!db.pixClaims.length) return null;
  const claims = db.pixClaims.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const confirm = (id: string, name: string) => {
    const res = confirmPixClaim(id);
    if (!res.ok) return toast(res.error, 'error');
    toast(`PIX de ${name.split(' ')[0]} confirmado. Plano renovado até ${fmtDate(res.value)}.`);
  };

  return (
    <Card className="mb-4 overflow-hidden">
      <div className="flex items-center gap-3 border-b border-line px-5 py-4">
        <span className="grid size-9 place-items-center rounded-full bg-brand-50 text-brand-500">
          <QrCode className="size-[18px]" />
        </span>
        <div>
          <h3 className="text-[15px] font-semibold text-ink">PIX informados pelos alunos</h3>
          <p className="text-xs text-muted">Confira no extrato do banco e confirme para renovar o plano.</p>
        </div>
      </div>
      <ul className="divide-y divide-line">
        {claims.map((c) => {
          const s = db.students.find((x) => x.id === c.studentId);
          const plan = db.plans.find((p) => p.id === c.planId);
          return (
            <li key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <Avatar name={s?.name ?? '?'} src={s?.photo} size={36} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-ink">{s?.name ?? 'Aluno removido'}</div>
                <div className="text-xs text-muted">
                  {plan?.name} · {brl(c.amount)} · avisou {fmtAgo(c.createdAt)}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => dismissPixClaim(c.id)}>
                  Descartar
                </Button>
                <Button size="sm" onClick={() => confirm(c.id, s?.name ?? 'aluno')}>
                  Confirmar
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function Kpi({ icon: Icon, tone, label, value, sub }: { icon: LucideIcon; tone: string; label: string; value: string; sub: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <span className="text-[13px] text-muted">{label}</span>
        <span className={clsx('grid size-9 place-items-center rounded-full', tone)}>
          <Icon className="size-[18px]" />
        </span>
      </div>
      <div className="tnum mt-4 font-display text-[26px] leading-none font-semibold tracking-tight text-ink">{value}</div>
      <div className="mt-2 text-xs text-muted">{sub}</div>
    </Card>
  );
}
