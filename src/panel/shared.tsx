import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import {
  AlertTriangle,
  ArrowRight,
  Award,
  Camera,
  CreditCard,
  Banknote,
  Landmark,
  Mail,
  Minus,
  Phone,
  Plus,
  QrCode,
  Receipt,
  ShieldAlert,
  Trophy,
  UserPlus,
  X,
  CalendarCheck,
} from 'lucide-react';
import { useNow, useStore } from '../lib/store';
import { BELTS, beltLabel, brl, isDemotion, maxDegree, nextStep, PAY_METHODS, payMethodLabel } from '../lib/belts';
import { addDays, addMonths, diffDays, fmtDate, fmtDuration, fmtShort, todayISO } from '../lib/dates';
import { checkinsOf, countInRange, lastGraduation, planOf, studentStatus } from '../lib/selectors';
import { Avatar, BeltBar, BeltDot, StatusPill } from '../components/bits';
import { Button, Drawer, Field, IconButton, Modal, Pill, Toggle, useToast } from '../components/ui';
import { fileToDataUrl } from '../lib/image';
import type { BeltId, PayMethod, Student } from '../lib/types';

/* ======================================================================
   Gaveta do aluno: cadastro, edição e resumo
   ====================================================================== */

type FormState = {
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  photo: string | null;
  belt: BeltId;
  degree: number;
  planId: string;
  dueDate: string;
  weeklyGoal: number;
  active: boolean;
  notes: string;
};

const blank = (today: string): FormState => ({
  name: '',
  email: '',
  phone: '',
  birthDate: '',
  photo: null,
  belt: 'branca',
  degree: 0,
  planId: 'mensal',
  dueDate: addDays(today, 30),
  weeklyGoal: 3,
  active: true,
  notes: '',
});

export function StudentDrawer({ studentId, open, onClose }: { studentId: string | null; open: boolean; onClose: () => void }) {
  const { db, addStudent, updateStudent } = useStore();
  const { today } = useNow();
  const toast = useToast();
  const student = studentId ? db.students.find((s) => s.id === studentId) ?? null : null;
  const [form, setForm] = useState<FormState>(blank(today));
  const [error, setError] = useState('');
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setError('');
    setForm(
      student
        ? {
            name: student.name,
            email: student.email,
            phone: student.phone,
            birthDate: student.birthDate,
            photo: student.photo,
            belt: student.belt,
            degree: student.degree,
            planId: student.planId ?? '',
            dueDate: student.dueDate ?? '',
            weeklyGoal: student.weeklyGoal,
            active: student.active,
            notes: student.notes ?? '',
          }
        : blank(today),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, studentId]);

  // Faixa/grau vêm sempre do cadastro atual (graduação muda por fora do formulário)
  useEffect(() => {
    if (student) setForm((f) => ({ ...f, belt: student.belt, degree: student.degree, planId: student.planId ?? '', dueDate: student.dueDate ?? '', active: student.active }));
  }, [student?.belt, student?.degree, student?.planId, student?.dueDate, student?.active]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const stats = useMemo(() => {
    if (!student) return null;
    const list = checkinsOf(db, student.id);
    const g = lastGraduation(db, student.id);
    return {
      total: list.length,
      d30: countInRange(list, addDays(today, -29), today),
      since: g?.date ?? student.joinedAt,
      recent: list.slice(0, 5),
      grads: db.graduations.filter((x) => x.studentId === student.id).slice(0, 4),
      pays: db.payments.filter((p) => p.studentId === student.id).slice(0, 4),
    };
  }, [db, student, today]);

  const save = () => {
    if (!form.name.trim()) return setError('Informe o nome do aluno.');
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) return setError('E-mail inválido.');
    if (form.email && db.students.some((s) => s.id !== studentId && s.email.toLowerCase() === form.email.trim().toLowerCase())) return setError('Já existe um aluno com esse e-mail.');
    const base = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone,
      birthDate: form.birthDate,
      photo: form.photo,
      planId: form.planId || null,
      dueDate: form.planId ? form.dueDate || today : null,
      weeklyGoal: form.weeklyGoal,
      active: form.active,
      notes: form.notes,
    };
    if (student) {
      updateStudent(student.id, base);
      toast('Dados do aluno atualizados.');
    } else {
      addStudent({ ...base, belt: form.belt, degree: form.degree });
      toast(`${base.name.split(' ')[0]} cadastrado com sucesso.`);
    }
    onClose();
  };

  const onPhoto = async (file?: File) => {
    if (!file) return;
    try {
      set('photo', await fileToDataUrl(file));
    } catch {
      toast('Não foi possível ler a imagem.', 'error');
    }
  };

  const status = student ? studentStatus(student, today) : null;

  return (
    <>
      <Drawer open={open} onClose={onClose}>
        {/* Cabeçalho */}
        <div className="relative border-b border-line px-6 pt-5 pb-6">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted">{student ? 'Ficha do aluno' : 'Novo aluno'}</span>
            <button onClick={onClose} className="grid size-9 place-items-center rounded-xl text-muted hover:bg-paper-2 hover:text-ink" aria-label="Fechar">
              <X className="size-5" />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-4">
            <button onClick={() => fileRef.current?.click()} className="group relative shrink-0 rounded-full" aria-label="Alterar foto">
              <Avatar name={form.name || 'Novo aluno'} src={form.photo} size={72} />
              <span className="absolute inset-0 grid place-items-center rounded-full bg-ink/40 text-white opacity-0 transition group-hover:opacity-100">
                <Camera className="size-5" />
              </span>
              <span className="absolute -right-0.5 -bottom-0.5 grid size-7 place-items-center rounded-full bg-white text-ink-2 ring-1 ring-line">
                <Camera className="size-3.5" />
              </span>
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
            <div className="min-w-0">
              <h2 className="truncate font-display text-xl font-semibold text-ink">{form.name || 'Cadastrar aluno'}</h2>
              {student ? (
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  {student.role === 'professor' ? <Pill className="bg-navy-900 text-white ring-transparent">Professor</Pill> : status && <StatusPill status={status} />}
                  {!student.hasAccount && <Pill className="bg-paper-2 text-muted ring-transparent">Sem conta no app</Pill>}
                </div>
              ) : (
                <p className="mt-1 text-[13px] text-muted">Alunos sem conta podem ser cadastrados aqui. Se criarem conta com o mesmo e-mail, o cadastro é vinculado.</p>
              )}
              {form.photo && (
                <button onClick={() => set('photo', null)} className="mt-2 text-xs text-muted underline-offset-2 hover:text-ink hover:underline">
                  Remover foto
                </button>
              )}
            </div>
          </div>
          {student && stats && (
            <div className="mt-5 grid grid-cols-3 gap-2">
              {[
                { l: 'Treinos (30d)', v: String(stats.d30) },
                { l: 'Total de treinos', v: String(stats.total) },
                { l: 'Na faixa há', v: fmtDuration(stats.since, today) },
              ].map((x) => (
                <div key={x.l} className="rounded-xl bg-paper px-3 py-2.5">
                  <div className="truncate font-display text-[15px] font-semibold text-ink">{x.v}</div>
                  <div className="text-[11px] text-muted">{x.l}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Corpo */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          <section className="space-y-4">
            <Field label="Nome completo *">
              <input className="field" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ex.: João da Silva" autoFocus={!student} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="E-mail">
                <div className="relative">
                  <Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" />
                  <input className="field pl-9" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="aluno@email.com" />
                </div>
              </Field>
              <Field label="Telefone / WhatsApp">
                <div className="relative">
                  <Phone className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" />
                  <input className="field pl-9" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="(85) 90000-0000" />
                </div>
              </Field>
              <Field label="Data de nascimento">
                <input className="field" type="date" value={form.birthDate} onChange={(e) => set('birthDate', e.target.value)} />
              </Field>
              <Field label="Meta semanal de treinos">
                <div className="flex h-[42px] items-center justify-between rounded-xl border border-line-strong px-1.5">
                  <IconButton icon={Minus} label="Diminuir" onClick={() => set('weeklyGoal', Math.max(1, form.weeklyGoal - 1))} className="size-8" />
                  <span className="font-display text-sm font-semibold">{form.weeklyGoal}x por semana</span>
                  <IconButton icon={Plus} label="Aumentar" onClick={() => set('weeklyGoal', Math.min(7, form.weeklyGoal + 1))} className="size-8" />
                </div>
              </Field>
            </div>
          </section>

          {/* Faixa */}
          <section className="rounded-2xl p-4 ring-1 ring-line">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink">Graduação</h3>
              {student && (
                <Button size="sm" variant="secondary" icon={Award} onClick={() => setPromoteOpen(true)}>
                  Graduar
                </Button>
              )}
            </div>
            {student ? (
              <div className="flex items-center gap-4">
                <BeltBar belt={form.belt} degree={form.degree} className="w-36" height={14} />
                <div>
                  <div className="text-sm font-semibold text-ink">{beltLabel(form.belt, form.degree)}</div>
                  <div className="text-[11px] text-muted">Para mudar a faixa use “Graduar” — evita rebaixar por engano.</div>
                </div>
              </div>
            ) : (
              <BeltPicker belt={form.belt} degree={form.degree} onChange={(b, d) => setForm((f) => ({ ...f, belt: b, degree: d }))} />
            )}
          </section>

          {/* Plano */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink">Plano e mensalidade</h3>
              {student && student.role !== 'professor' && (
                <Button size="sm" variant="secondary" icon={Receipt} onClick={() => setPayOpen(true)}>
                  Registrar pagamento
                </Button>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Plano">
                <select className="field" value={form.planId} onChange={(e) => set('planId', e.target.value)}>
                  <option value="">Sem plano</option>
                  {db.plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {brl(p.price)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Vencimento" hint={form.dueDate && form.planId ? relativeDue(form.dueDate, today) : undefined}>
                <input className="field" type="date" disabled={!form.planId} value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
              </Field>
            </div>
            <div className="rounded-2xl p-4 ring-1 ring-line">
              <Toggle
                checked={form.active}
                onChange={(v) => set('active', v)}
                label={form.active ? 'Matrícula ativa' : 'Matrícula inativa'}
                description={form.active ? 'O aluno pode fazer check-in nas aulas.' : 'Check-in bloqueado no app até reativar.'}
              />
            </div>
            <Field label="Observações">
              <textarea className="field min-h-20 resize-y" value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Lesões, restrições, objetivos…" />
            </Field>
          </section>

          {student && stats && (
            <section className="grid gap-4 sm:grid-cols-2">
              <MiniList
                title="Últimas graduações"
                empty="Nenhuma graduação registrada."
                items={stats.grads.map((g) => ({
                  key: g.id,
                  left: <BeltDot belt={g.toBelt} size={12} />,
                  title: beltLabel(g.toBelt, g.toDegree),
                  sub: fmtDate(g.date),
                }))}
              />
              <MiniList
                title="Pagamentos recentes"
                empty="Nenhum pagamento ainda."
                items={stats.pays.map((p) => ({
                  key: p.id,
                  left: <Receipt className="size-3.5 text-muted" />,
                  title: brl(p.amount),
                  sub: `${fmtDate(p.date)} · ${payMethodLabel(p.method)}`,
                }))}
              />
              <MiniList
                className="sm:col-span-2"
                title="Últimos check-ins"
                empty="Ainda não treinou."
                items={stats.recent.map((k) => ({
                  key: k.id,
                  left: <CalendarCheck className="size-3.5 text-muted" />,
                  title: db.classes.find((c) => c.id === k.classId)?.name ?? 'Aula',
                  sub: `${fmtShort(k.date)} às ${k.time} · ${k.source === 'app' ? 'pelo app' : 'manual'}`,
                }))}
              />
            </section>
          )}

          {error && (
            <p className="flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-[13px] font-medium text-rose-700 ring-1 ring-rose-200">
              <AlertTriangle className="size-4" /> {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-line px-6 py-4">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button icon={student ? undefined : UserPlus} onClick={save}>
            {student ? 'Salvar alterações' : 'Cadastrar aluno'}
          </Button>
        </div>
      </Drawer>

      {student && <PromoteModal open={promoteOpen} onClose={() => setPromoteOpen(false)} studentId={student.id} />}
      {student && <PaymentModal open={payOpen} onClose={() => setPayOpen(false)} studentId={student.id} />}
    </>
  );
}

function relativeDue(due: string, today: string) {
  const n = diffDays(today, due);
  if (n < 0) return `Atrasado há ${-n} ${-n === 1 ? 'dia' : 'dias'}`;
  if (n === 0) return 'Vence hoje';
  return `Vence em ${n} ${n === 1 ? 'dia' : 'dias'}`;
}

function MiniList({ title, items, empty, className }: { title: string; empty: string; className?: string; items: { key: string; left: ReactNode; title: string; sub: string }[] }) {
  return (
    <div className={clsx('rounded-2xl p-4 ring-1 ring-line', className)}>
      <h4 className="mb-2 text-xs font-medium text-muted">{title}</h4>
      {items.length ? (
        <ul className="space-y-2">
          {items.map((i) => (
            <li key={i.key} className="flex items-center gap-2.5">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-paper">{i.left}</span>
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium text-ink">{i.title}</span>
                <span className="block truncate text-[11px] text-muted">{i.sub}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted">{empty}</p>
      )}
    </div>
  );
}

/* ======================================================================
   Seletor de faixa e grau
   ====================================================================== */

export function BeltPicker({ belt, degree, onChange, current }: { belt: BeltId; degree: number; onChange: (b: BeltId, d: number) => void; current?: { belt: BeltId; degree: number } }) {
  const groups = [
    { title: 'Adulto', list: BELTS.filter((b) => !b.kids) },
    { title: 'Infantil', list: BELTS.filter((b) => b.kids) },
  ];
  const max = maxDegree(belt);
  return (
    <div className="space-y-3">
      {groups.map((g) => (
        <div key={g.title}>
          <p className="mb-1.5 text-xs text-muted">{g.title}</p>
          <div className="flex flex-wrap gap-1.5">
            {g.list.map((b) => {
              const sel = b.id === belt;
              const below = current && isDemotion(current, { belt: b.id, degree: maxDegree(b.id) });
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => onChange(b.id, Math.min(degree, maxDegree(b.id)))}
                  className={clsx(
                    'flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium ring-1 transition',
                    sel ? 'bg-brand-50 text-brand-700 ring-brand-300' : 'bg-white text-ink-2 ring-line hover:ring-line-strong',
                    below && !sel && 'opacity-45',
                  )}
                >
                  <BeltDot belt={b.id} size={12} />
                  {b.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div>
        <p className="mb-1.5 text-xs text-muted">Grau</p>
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: max + 1 }, (_, d) => (
            <button
              key={d}
              type="button"
              onClick={() => onChange(belt, d)}
              className={clsx(
                'h-9 min-w-11 rounded-lg px-3 text-[13px] font-medium ring-1 transition',
                d === degree ? 'bg-brand-50 text-brand-700 ring-brand-300' : 'bg-white text-ink-2 ring-line hover:ring-line-strong',
              )}
            >
              {d === 0 ? 'Sem grau' : `${d}º`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ======================================================================
   Promover aluno (com proteção contra rebaixamento)
   ====================================================================== */

export function PromoteModal({ open, onClose, studentId }: { open: boolean; onClose: () => void; studentId?: string | null }) {
  const { db, promote } = useStore();
  const toast = useToast();
  const candidates = db.students.filter((s) => s.active).sort((a, b) => a.name.localeCompare(b.name));
  const [sid, setSid] = useState<string>('');
  const student: Student | undefined = db.students.find((s) => s.id === (studentId ?? sid));
  const [to, setTo] = useState<{ belt: BeltId; degree: number }>({ belt: 'branca', degree: 0 });
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayISO());
  const [confirmDemote, setConfirmDemote] = useState(false);
  const [typed, setTyped] = useState('');

  useEffect(() => {
    if (!open) return;
    setSid(studentId ?? candidates[0]?.id ?? '');
    setNote('');
    setDate(todayISO());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, studentId]);

  useEffect(() => {
    if (student) setTo(nextStep(student.belt, student.degree));
    setConfirmDemote(false);
    setTyped('');
  }, [student?.id, open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!student) return null;
  const from = { belt: student.belt, degree: student.degree };
  const same = from.belt === to.belt && from.degree === to.degree;
  const demotion = isDemotion(from, to);
  const changesBelt = from.belt !== to.belt;
  const canSubmit = !same && (!demotion || (confirmDemote && typed.trim().toUpperCase() === 'REBAIXAR'));

  const submit = () => {
    const res = promote(student.id, to, { note: note.trim() || undefined, date, allowDemotion: demotion && confirmDemote });
    if (!res.ok) return toast(res.error, 'error');
    toast(demotion ? `Graduação de ${student.name.split(' ')[0]} corrigida.` : `${student.name.split(' ')[0]} agora é ${beltLabel(to.belt, to.degree)}!`);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      icon={Trophy}
      title={demotion ? 'Corrigir graduação' : 'Promover aluno'}
      subtitle="Escolha a nova faixa e grau. A mudança entra no histórico de graduações."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant={demotion ? 'danger' : 'primary'} icon={demotion ? ShieldAlert : Award} disabled={!canSubmit} onClick={submit}>
            {demotion ? 'Rebaixar mesmo assim' : changesBelt ? 'Trocar faixa' : 'Dar grau'}
          </Button>
        </>
      }
    >
      {!studentId && (
        <Field label="Aluno" className="mb-5">
          <select className="field" value={sid} onChange={(e) => setSid(e.target.value)}>
            {candidates.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {beltLabel(s.belt, s.degree)}
              </option>
            ))}
          </select>
        </Field>
      )}

      {/* De -> Para */}
      <div className="mb-5 flex items-center gap-3 rounded-2xl bg-paper p-4">
        <Avatar name={student.name} src={student.photo} size={44} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{student.name}</div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <div>
              <BeltBar belt={from.belt} degree={from.degree} className="w-24" height={10} />
              <div className="mt-1 text-[11px] text-muted">{beltLabel(from.belt, from.degree)}</div>
            </div>
            <ArrowRight className={clsx('size-4', demotion ? 'text-rose-500' : 'text-brand-500')} />
            <div>
              <BeltBar belt={to.belt} degree={to.degree} className="w-24" height={10} />
              <div className={clsx('mt-1 text-[11px] font-semibold', demotion ? 'text-rose-600' : 'text-ink')}>{beltLabel(to.belt, to.degree)}</div>
            </div>
          </div>
        </div>
      </div>

      <BeltPicker belt={to.belt} degree={to.degree} current={from} onChange={(b, d) => setTo({ belt: b, degree: d })} />

      <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_180px]">
        <Field label="Observação (opcional)">
          <input className="field" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: Ótima evolução nas raspagens" />
        </Field>
        <Field label="Data">
          <input className="field" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>

      {same && <p className="mt-4 rounded-xl bg-paper px-3 py-2.5 text-[13px] text-muted ring-1 ring-line">O aluno já está em {beltLabel(to.belt, to.degree)}. Escolha outra faixa ou grau.</p>}

      {demotion && (
        <div className="mt-5 rounded-2xl bg-rose-50 p-4 ring-1 ring-rose-200">
          <div className="flex gap-3">
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-rose-600" />
            <div className="text-[13px] text-rose-900">
              <p className="font-semibold">Isto é um rebaixamento.</p>
              <p className="mt-0.5 text-rose-800">
                {student.name.split(' ')[0]} passaria de <b>{beltLabel(from.belt, from.degree)}</b> para <b>{beltLabel(to.belt, to.degree)}</b>. Faixa nunca é rebaixada sem confirmação — use só para corrigir um erro de cadastro.
              </p>
              <label className="mt-3 flex items-center gap-2 font-semibold">
                <input type="checkbox" checked={confirmDemote} onChange={(e) => setConfirmDemote(e.target.checked)} className="size-4 accent-rose-600" />
                Entendo e quero corrigir a graduação
              </label>
              {confirmDemote && (
                <input
                  className="field mt-3 border-rose-300 focus:border-rose-400 focus:ring-rose-100"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  placeholder='Digite "REBAIXAR" para confirmar'
                />
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ======================================================================
   Registrar pagamento / renovar plano
   ====================================================================== */

const METHOD_ICON: Record<PayMethod, typeof QrCode> = { pix: QrCode, cartao: CreditCard, dinheiro: Banknote, boleto: Landmark };

export function PaymentModal({ open, onClose, studentId }: { open: boolean; onClose: () => void; studentId?: string | null }) {
  const { db, registerPayment } = useStore();
  const { today } = useNow();
  const toast = useToast();
  const list = db.students.filter((s) => s.role === 'aluno').sort((a, b) => a.name.localeCompare(b.name));
  const [sid, setSid] = useState('');
  const [planId, setPlanId] = useState('mensal');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PayMethod>('pix');
  const [date, setDate] = useState(today);
  const student = db.students.find((s) => s.id === sid);

  useEffect(() => {
    if (!open) return;
    const s = db.students.find((x) => x.id === (studentId ?? '')) ?? list[0];
    setSid(s?.id ?? '');
    setMethod('pix');
    setDate(today);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, studentId]);

  useEffect(() => {
    if (!student) return;
    const p = planOf(db, student) ?? db.plans[0];
    setPlanId(p.id);
    setAmount(String(p.price));
  }, [sid]); // eslint-disable-line react-hooks/exhaustive-deps

  const plan = db.plans.find((p) => p.id === planId);
  const start = student?.dueDate && diffDays(date, student.dueDate) >= 0 ? student.dueDate : date;
  const newDue = plan ? addMonths(start, plan.months) : null;
  const value = Number(String(amount).replace(',', '.'));

  const submit = () => {
    if (!student || !plan) return;
    if (!value || value <= 0) return toast('Informe um valor válido.', 'error');
    const res = registerPayment({ studentId: student.id, planId: plan.id, amount: value, method, date });
    if (!res.ok) return toast(res.error, 'error');
    toast(`Pagamento registrado · novo vencimento ${fmtDate(res.value)}`);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={Receipt}
      title="Registrar pagamento"
      subtitle="O plano é renovado automaticamente a partir do vencimento atual."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button icon={Receipt} onClick={submit} disabled={!student || !plan}>
            Confirmar {value > 0 ? brl(value) : ''}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Aluno">
          <select className="field" value={sid} onChange={(e) => setSid(e.target.value)} disabled={!!studentId}>
            {list.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.dueDate ? ` — vence ${fmtShort(s.dueDate)}` : ''}
              </option>
            ))}
          </select>
        </Field>

        {student && (
          <div className="flex items-center gap-3 rounded-2xl bg-paper p-3">
            <Avatar name={student.name} src={student.photo} size={40} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{student.name}</div>
              <div className="text-[11px] text-muted">
                {student.dueDate ? `Vencimento atual: ${fmtDate(student.dueDate)} (${relativeDue(student.dueDate, today).toLowerCase()})` : 'Sem plano ativo'}
              </div>
            </div>
            <StatusPill status={studentStatus(student, today)} />
          </div>
        )}

        <div>
          <span className="label">Plano</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {db.plans.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setPlanId(p.id);
                  setAmount(String(p.price));
                }}
                className={clsx('rounded-xl p-3 text-left ring-1 transition', p.id === planId ? 'bg-brand-50 ring-brand-300' : 'bg-white ring-line hover:ring-line-strong')}
              >
                <div className="text-[13px] font-medium text-ink">{p.name}</div>
                <div className="tnum text-xs text-muted">{brl(p.price)}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Valor (R$)">
            <input className="field tnum" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="Data do pagamento">
            <input className="field" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>

        <div>
          <span className="label">Forma de pagamento</span>
          <div className="grid grid-cols-4 gap-2">
            {PAY_METHODS.map((m) => {
              const Icon = METHOD_ICON[m.id];
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethod(m.id)}
                  className={clsx(
                    'flex flex-col items-center gap-1.5 rounded-xl py-3 text-xs font-medium ring-1 transition',
                    m.id === method ? 'bg-brand-50 text-brand-700 ring-brand-300' : 'bg-white text-ink-2 ring-line hover:ring-line-strong',
                  )}
                >
                  <Icon className="size-4" />
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {newDue && (
          <div className="flex items-center justify-between rounded-2xl bg-paper px-4 py-3">
            <span className="text-[13px] text-muted">Novo vencimento</span>
            <span className="font-display text-base font-semibold text-ink">{fmtDate(newDue)}</span>
          </div>
        )}
      </div>
    </Modal>
  );
}

