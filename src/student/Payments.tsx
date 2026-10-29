import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Banknote, Check, Clock, Copy, CreditCard, Landmark, QrCode as QrIcon, Receipt, type LucideIcon } from 'lucide-react';
import { useNow, useStore } from '../lib/store';
import { planOf, plansFor, STATUS_META, studentStatus } from '../lib/selectors';
import { brl, payMethodLabel } from '../lib/belts';
import { addMonths, diffDays, fmtAgo, fmtDate, fmtShort } from '../lib/dates';
import { ACADEMY_PIX, copyText, pixPayload } from '../lib/pix';
import { QrCode } from '../components/QrCode';
import { Button, useToast } from '../components/ui';
import type { PayMethod, Student } from '../lib/types';
import { useStudentCtx } from './StudentLayout';
import { AppHeader, BottomSheet, PHOTOS, PillCta, SectionTitle } from './parts';

const METHOD_ICON: Record<PayMethod, LucideIcon> = { pix: QrIcon, cartao: CreditCard, dinheiro: Banknote, boleto: Landmark };

export default function Payments() {
  const { db } = useStore();
  const { today } = useNow();
  const { student } = useStudentCtx();
  const [pix, setPix] = useState(false);
  const [all, setAll] = useState(false);

  const plan = planOf(db, student);
  const status = studentStatus(student, today);
  const pays = db.payments.filter((p) => p.studentId === student.id).sort((a, b) => b.date.localeCompare(a.date));
  const claim = db.pixClaims.find((c) => c.studentId === student.id);
  const due = student.dueDate;
  const dueIn = due ? diffDays(today, due) : null;
  // quanto do período atual já passou (barra do cartão)
  const start = pays[0]?.periodStart ?? (plan && due ? addMonths(due, -plan.months) : null);
  const elapsed = start && due ? Math.max(0, Math.min(1, diffDays(start, today) / Math.max(1, diffDays(start, due)))) : 0;
  const canPay = student.role === 'aluno' && plansFor(db, student).length > 0;

  return (
    <div className="animate-fade-in">
      <AppHeader back="/app/perfil" eyebrow="Mensalidade" title="Financeiro" photo={PHOTOS.adulto}>
        <div className="mt-5 rounded-2xl bg-white/[0.06] p-5 ring-1 ring-white/10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] text-white/55">Seu plano</p>
              <p className="mt-1 text-[22px] leading-tight">{plan?.name ?? 'Sem plano'}</p>
              {plan && <p className="text-xs text-white/60">{plan.months > 1 ? `${brl(plan.price)} a cada ${plan.months} meses` : `${brl(plan.price)} por mês`}</p>}
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium">
              <span className={clsx('size-1.5 rounded-full', STATUS_META[status].dot)} />
              {STATUS_META[status].label}
            </span>
          </div>
          {due && dueIn !== null && (
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="text-white/60">{dueIn < 0 ? 'Venceu em' : 'Vence em'} {fmtDate(due)}</span>
                <span className={clsx('font-medium', dueIn < 0 ? 'text-rose-300' : dueIn <= 5 ? 'text-amber-300' : 'text-white')}>
                  {dueIn < 0 ? `${-dueIn} ${dueIn === -1 ? 'dia' : 'dias'} em atraso` : dueIn === 0 ? 'vence hoje' : `faltam ${dueIn} ${dueIn === 1 ? 'dia' : 'dias'}`}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/12">
                <div className={clsx('h-full rounded-full', dueIn < 0 ? 'bg-rose-400' : 'bg-brand-500')} style={{ width: `${(dueIn < 0 ? 1 : elapsed) * 100}%` }} />
              </div>
            </div>
          )}
        </div>
      </AppHeader>

      <div className="relative -mt-6 space-y-6 rounded-t-[28px] bg-paper px-5 pt-6">
        {claim && (
          <div className="flex gap-3 rounded-2xl bg-amber-50 p-4 text-amber-900 ring-1 ring-amber-200">
            <Clock className="mt-0.5 size-5 shrink-0 text-amber-600" />
            <div>
              <p className="text-[15px] font-medium">PIX de {brl(claim.amount)} aguardando confirmação</p>
              <p className="mt-0.5 text-[13px] opacity-80">Você avisou {fmtAgo(claim.createdAt)}. O plano é renovado assim que a academia confirmar.</p>
            </div>
          </div>
        )}

        {canPay && (
          <div>
            <PillCta icon={QrIcon} tone={claim ? 'navy' : 'brand'} onClick={() => setPix(true)}>
              {claim ? 'Ver o código PIX de novo' : status === 'atrasado' ? 'Pagar mensalidade com PIX' : 'Renovar com PIX'}
            </PillCta>
            {!claim && dueIn !== null && dueIn > 5 && <p className="mt-2 text-center text-[11px] text-muted">Pagando antes, o novo período começa no vencimento atual ({fmtShort(due!)}).</p>}
          </div>
        )}

        <section>
          <SectionTitle
            action={
              pays.length > 4 && (
                <button onClick={() => setAll((v) => !v)} className="text-xs font-medium text-brand-600">
                  {all ? 'Ver menos' : `Ver todos (${pays.length})`}
                </button>
              )
            }
          >
            Pagamentos
          </SectionTitle>
          {pays.length ? (
            <ul className="divide-y divide-line overflow-hidden card-soft">
              {(all ? pays : pays.slice(0, 4)).map((p) => {
                const Icon = METHOD_ICON[p.method];
                return (
                  <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-paper text-muted">
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-ink">
                        {db.plans.find((x) => x.id === p.planId)?.name ?? 'Plano'} · {payMethodLabel(p.method)}
                      </p>
                      <p className="text-[11px] text-muted">
                        Pago em {fmtShort(p.date)} · até {fmtShort(p.periodEnd)}
                      </p>
                    </div>
                    <span className="tnum shrink-0 text-[13px] font-medium text-ink">{brl(p.amount)}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-col items-center card-soft px-6 py-10 text-center">
              <span className="mb-3 grid size-12 place-items-center rounded-full bg-paper-2 text-faint">
                <Receipt className="size-5" />
              </span>
              <p className="text-[15px] font-medium text-ink">Nenhum pagamento ainda</p>
              <p className="mt-1 text-[13px] text-muted">Os pagamentos registrados pela academia aparecem aqui.</p>
            </div>
          )}
          <p className="mt-3 px-1 text-[11px] leading-relaxed text-muted">Pagou no cartão ou em dinheiro? A recepção registra e o pagamento aparece aqui.</p>
        </section>
      </div>

      {canPay && <PixSheet open={pix} onClose={() => setPix(false)} student={student} />}
    </div>
  );
}

function PixSheet({ open, onClose, student }: { open: boolean; onClose: () => void; student: Student }) {
  const { db, claimPix } = useStore();
  const { today } = useNow();
  const toast = useToast();
  const options = plansFor(db, student);
  const [planId, setPlanId] = useState(student.planId ?? options[0].id);
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPlanId(student.planId ?? options[0].id);
    setCopied(false);
    setSent(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const plan = options.find((p) => p.id === planId) ?? options[0];
  const monthly = options.find((p) => p.months === 1);
  // mesma regra do painel: em dia, o novo período começa no vencimento atual
  const start = student.dueDate && student.dueDate >= today ? student.dueDate : today;
  const newEnd = addMonths(start, plan.months);
  const code = pixPayload(plan.price, `EW${student.id}${plan.id}`);

  const copy = async () => {
    if (await copyText(code)) {
      setCopied(true);
      toast('Código PIX copiado. Cole no app do seu banco.');
    } else toast('Não foi possível copiar. Use o QR code.', 'error');
  };

  const confirm = () => {
    const res = claimPix(student.id, plan.id);
    if (!res.ok) return toast(res.error, 'error');
    setSent(true);
  };

  return (
    <BottomSheet open={open} onClose={onClose}>
      {sent ? (
        <div className="flex flex-col items-center px-2 pt-4 pb-8 text-center">
          <span className="grid size-20 place-items-center rounded-full bg-emerald-500 text-white animate-pop">
            <Check className="size-10" strokeWidth={2.5} />
          </span>
          <h3 className="mt-5 text-[22px] leading-tight text-ink">Aviso enviado</h3>
          <p className="mt-1 text-sm text-muted">
            A academia vai conferir o PIX de {brl(plan.price)} e renovar seu plano {plan.name.toLowerCase()} até {fmtDate(newEnd)}.
          </p>
          <Button size="lg" className="mt-6 w-full" onClick={onClose}>
            Fechar
          </Button>
        </div>
      ) : (
        <div className="pt-2 pb-6">
          <h3 className="text-[22px] leading-tight text-ink">Pagar com PIX</h3>
          <p className="text-[13px] text-muted">Escolha o plano e pague pelo app do seu banco.</p>

          {options.length > 1 && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              {options.map((p) => {
                const sel = p.id === plan.id;
                const save = monthly && p.months > 1 ? Math.round((1 - p.price / p.months / monthly.price) * 100) : 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setPlanId(p.id);
                      setCopied(false);
                    }}
                    className={clsx('rounded-2xl p-3 text-left transition', sel ? 'bg-brand-50/60 ring-2 ring-brand-500' : 'bg-white ring-1 ring-line')}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-medium text-ink">{p.name}</span>
                      {p.id === student.planId && <span className="text-[10px] text-muted">atual</span>}
                    </span>
                    <span className="tnum mt-1 block text-lg font-medium text-ink">{brl(p.price)}</span>
                    <span className="block text-[11px] text-muted">
                      {p.months > 1 ? `${brl(p.price / p.months)}/mês` : 'por mês'}
                      {save > 0 && <span className="text-emerald-600"> · −{save}%</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-4 flex flex-col items-center rounded-2xl bg-paper px-4 pt-5 pb-4">
            <div className="rounded-xl bg-white p-2 ring-1 ring-line">
              <QrCode value={code} size={168} className="text-navy-900" />
            </div>
            <p className="tnum mt-3 text-[30px] leading-none text-ink">{brl(plan.price)}</p>
            <p className="text-xs text-muted">Plano válido até {fmtDate(newEnd)}</p>
            <p className="mt-2 text-[11px] text-faint">
              {ACADEMY_PIX.name} · {ACADEMY_PIX.keyLabel}
            </p>
          </div>

          <Button size="lg" variant="secondary" icon={copied ? Check : Copy} className="mt-4 w-full" onClick={copy}>
            {copied ? 'Código copiado' : 'Copiar código PIX'}
          </Button>
          <PillCta className="mt-2.5" icon={Check} onClick={confirm}>
            Já fiz o pagamento
          </PillCta>
          <p className="mt-3 text-center text-[11px] text-muted">A academia confere o PIX e renova seu plano.</p>
        </div>
      )}
    </BottomSheet>
  );
}
