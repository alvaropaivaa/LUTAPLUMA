import clsx from 'clsx';
import { ArrowLeft, BadgeCheck, ShieldAlert } from 'lucide-react';
import { useNow, useStore } from '../lib/store';
import { memberNumber, planOf, studentStatus } from '../lib/selectors';
import { belt as beltDef, degreeLabel } from '../lib/belts';
import { fmtDate, MONTHS_SHORT, parseISO } from '../lib/dates';
import { Avatar, BeltBar, Logo } from '../components/bits';
import { QrCode } from '../components/QrCode';
import { useStudentCtx } from './StudentLayout';
import { useBack } from './parts';

/** Carteirinha digital: fundo azul-marinho, foto com anel laranja, fonte Sora */
export default function IdCard() {
  const { db } = useStore();
  const { today } = useNow();
  const { student } = useStudentCtx();
  const goBack = useBack('/app/perfil');
  const def = beltDef(student.belt);
  const plan = planOf(db, student);
  const status = studentStatus(student, today);
  const valid = student.role === 'professor' || status === 'em-dia' || status === 'vence-logo';
  const joined = parseISO(student.joinedAt);
  const number = memberNumber(db, student);

  return (
    <div className="animate-fade-in px-5 pt-5 pb-4">
      <header className="pt-safe mb-5 flex items-center gap-3">
        <button onClick={goBack} className="grid size-10 place-items-center rounded-full bg-white text-ink ring-1 ring-line" aria-label="Voltar">
          <ArrowLeft className="size-5" />
        </button>
        <div>
          <p className="text-xs text-muted">Easy Wrestling</p>
          <h1 className="text-[22px] leading-tight text-ink">Carteirinha digital</h1>
        </div>
      </header>

      <article className="relative overflow-hidden rounded-3xl bg-navy-900 font-sora px-6 pt-6 pb-7 text-white">

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Logo size={36} />
            <div className="leading-tight">
              <div className="text-sm font-semibold">Easy Wrestling</div>
              <div className="text-[11px] text-white/55">Wrestling</div>
            </div>
          </div>
          <span className="text-[11px] text-white/55">Carteirinha</span>
        </div>

        <div className="relative mt-7 flex flex-col items-center text-center">
          <div className="rounded-full bg-brand-500 p-[3px]">
            <div className="rounded-full bg-navy-900 p-[3px]">
              <Avatar name={student.name} src={student.photo} size={116} />
            </div>
          </div>
          <h2 className="mt-4 text-[22px] leading-tight font-semibold tracking-tight">{student.name}</h2>
          <div className="mt-2 inline-flex items-center gap-2 text-[13px] text-white/80">
            <span className="size-2.5 rounded-full ring-1 ring-white/40" style={{ background: def.color }} />
            Faixa {def.label.toLowerCase()} · {degreeLabel(student.degree).toLowerCase()}
          </div>
          {student.role === 'professor' && <span className="mt-2 rounded-full bg-white/10 px-2.5 py-0.5 text-[11px]">Professor</span>}
        </div>

        <BeltBar belt={student.belt} degree={student.degree} height={18} className="relative mt-6 w-full rounded" />

        <dl className="relative mt-6 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-white/10 pt-5">
          <Info label="Matrícula" value={number} />
          <Info label="Aluno desde" value={`${MONTHS_SHORT[joined.getMonth()]}/${joined.getFullYear()}`} />
          <Info label="Plano" value={plan?.name ?? (student.role === 'professor' ? 'Equipe' : 'Sem plano')} />
          <Info label="Válida até" value={student.dueDate ? fmtDate(student.dueDate) : student.role === 'professor' ? 'Indeterminado' : '—'} tone={valid ? undefined : 'bad'} />
        </dl>

        {/* QR para a recepção conferir a matrícula */}
        <div className="relative mt-6 flex items-center gap-4 rounded-2xl bg-white/[0.06] p-3">
          <div className="shrink-0 rounded-xl bg-white p-1.5">
            <QrCode value={`EASYWRESTLING:${number}:${student.id}`} size={84} className="text-navy-900" />
          </div>
          <div className="min-w-0">
            <p className={clsx('inline-flex items-center gap-1.5 text-[13px] font-medium', valid ? 'text-emerald-300' : 'text-rose-300')}>
              {valid ? <BadgeCheck className="size-4" /> : <ShieldAlert className="size-4" />}
              {valid ? 'Matrícula válida' : status === 'inativo' ? 'Matrícula inativa' : 'Mensalidade em atraso'}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-white/55">Mostre o QR code na recepção ou em eventos da academia.</p>
          </div>
        </div>
      </article>

    </div>
  );
}

function Info({ label, value, tone }: { label: string; value: string; tone?: 'bad' }) {
  return (
    <div>
      <dt className="text-[11px] text-white/50">{label}</dt>
      <dd className={clsx('mt-0.5 text-[15px] font-medium', tone === 'bad' ? 'text-rose-300' : 'text-white')}>{value}</dd>
    </div>
  );
}
