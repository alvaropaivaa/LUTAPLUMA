import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { Award, BellRing, Cake, Camera, Check, Download, IdCard, LogOut, Mail, Minus, Pencil, Phone, Plus, Wallet, type LucideIcon } from 'lucide-react';
import { useNow, useStore } from '../lib/store';
import { memberNumber, studentStatus } from '../lib/selectors';
import { beltLabel } from '../lib/belts';
import { ageFrom, fmtDate, fmtShort } from '../lib/dates';
import { fileToDataUrl } from '../lib/image';
import { useInstall } from '../lib/install';
import { isIOS, isStandalone } from '../lib/notify';
import { Avatar, BeltBar } from '../components/bits';
import { Button, Field, Toggle, useToast } from '../components/ui';
import type { Student } from '../lib/types';
import { useStudentCtx } from './StudentLayout';
import { useTestNotification } from './Notifications';
import { AppHeader, appPath, BottomSheet, InstallSheet, PHOTOS, SectionTitle, useNotify } from './parts';

export default function Profile() {
  const { db, updateStudent } = useStore();
  const { today } = useNow();
  const { student, signOut } = useStudentCtx();
  const navigate = useNavigate();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);

  const status = studentStatus(student, today);
  const due = student.dueDate;

  const onPhoto = async (file?: File) => {
    if (!file) return;
    try {
      updateStudent(student.id, { photo: await fileToDataUrl(file) });
      toast('Foto atualizada.');
    } catch {
      toast('Não foi possível ler a imagem.', 'error');
    }
  };

  const setGoal = (n: number) => updateStudent(student.id, { weeklyGoal: Math.max(1, Math.min(7, n)) });

  const shortcuts: { to: string; icon: LucideIcon; label: string; sub: string; tone?: string }[] = [
    { to: '/app/carteirinha', icon: IdCard, label: 'Carteirinha', sub: memberNumber(db, student) },
    { to: '/app/graduacao', icon: Award, label: 'Graduação', sub: beltLabel(student.belt, student.degree).replace('º grau', 'º') },
    {
      to: '/app/financeiro',
      icon: Wallet,
      label: 'Financeiro',
      sub: due ? (status === 'atrasado' ? 'Em atraso' : `Vence ${fmtShort(due)}`) : 'Sem plano',
      tone: status === 'atrasado' ? 'text-rose-600' : status === 'vence-logo' ? 'text-amber-600' : undefined,
    },
  ];

  return (
    <div className="animate-fade-in">
      <AppHeader eyebrow="Sua conta" title="Perfil" photo={PHOTOS.hero}>
        <div className="mt-5 flex items-center gap-4">
          <div className="relative shrink-0">
            <Avatar name={student.name} src={student.photo} size={68} className="ring-2 ring-white/15" />
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -right-1 -bottom-1 grid size-7 place-items-center rounded-full bg-brand-500 text-white ring-[3px] ring-navy-900 transition active:scale-95"
              aria-label="Trocar foto"
              title="Trocar foto"
            >
              <Camera className="size-3.5" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onPhoto(e.target.files?.[0])} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xl leading-tight font-medium">{student.name}</p>
            <p className="truncate text-xs text-white/60">{student.email}</p>
            <p className="mt-2 inline-flex items-center gap-2 text-xs text-white/80">
              <BeltBar belt={student.belt} degree={student.degree} className="w-12" height={8} />
              {beltLabel(student.belt, student.degree)}
            </p>
          </div>
        </div>
      </AppHeader>

      <div className="relative -mt-6 space-y-6 rounded-t-[28px] bg-paper px-5 pt-6 pb-2">
        {/* Atalhos */}
        <div className="grid grid-cols-3 gap-2.5">
          {shortcuts.map((s) => (
            <button key={s.to} onClick={() => navigate(appPath(s.to))} className="flex flex-col items-start card-soft p-3.5 text-left transition active:scale-[0.98]">
              <span className="grid size-9 place-items-center rounded-full bg-brand-50 text-brand-500">
                <s.icon className="size-[18px]" />
              </span>
              <span className="mt-3 text-[13px] font-medium text-ink">{s.label}</span>
              <span className={clsx('w-full truncate text-[11px]', s.tone ?? 'text-muted')}>{s.sub}</span>
            </button>
          ))}
        </div>

        {/* Meta semanal */}
        <section className="flex items-center gap-3 card-soft p-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink">Meta semanal</p>
            <p className="text-xs text-muted">Quantos treinos por semana você quer fazer</p>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-paper p-1">
            <button onClick={() => setGoal(student.weeklyGoal - 1)} disabled={student.weeklyGoal <= 1} aria-label="Diminuir meta" className="grid size-8 place-items-center rounded-full bg-white text-ink ring-1 ring-line transition disabled:opacity-40">
              <Minus className="size-4" />
            </button>
            <span className="tnum w-7 text-center text-xl text-ink">{student.weeklyGoal}</span>
            <button onClick={() => setGoal(student.weeklyGoal + 1)} disabled={student.weeklyGoal >= 7} aria-label="Aumentar meta" className="grid size-8 place-items-center rounded-full bg-white text-ink ring-1 ring-line transition disabled:opacity-40">
              <Plus className="size-4" />
            </button>
          </div>
        </section>

        {/* Dados pessoais */}
        <section>
          <SectionTitle
            action={
              <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1 text-xs font-medium text-brand-600">
                <Pencil className="size-3.5" /> Editar
              </button>
            }
          >
            Dados pessoais
          </SectionTitle>
          <ul className="divide-y divide-line overflow-hidden card-soft">
            <Row icon={Phone} label="Telefone" value={student.phone} />
            <Row icon={Cake} label="Nascimento" value={student.birthDate ? `${fmtDate(student.birthDate)} · ${ageFrom(student.birthDate, today)} anos` : ''} />
            <Row icon={Mail} label="E-mail" value={student.email} hint="Para trocar o e-mail, fale com a academia." />
          </ul>
        </section>

        {/* App */}
        <section>
          <SectionTitle>App</SectionTitle>
          <ul className="divide-y divide-line overflow-hidden card-soft">
            <NotifyRow student={student} />
            <InstallRow />
          </ul>
        </section>

        <button onClick={signOut} className="flex w-full items-center gap-3 card-soft p-4 text-left text-sm font-medium text-rose-600 transition active:bg-rose-50">
          <span className="grid size-9 place-items-center rounded-full bg-rose-50">
            <LogOut className="size-4" />
          </span>
          Sair da conta
        </button>

        <p className="pb-2 text-center text-[11px] text-faint">Easy Wrestling · app do aluno</p>
      </div>

      <EditSheet open={editing} onClose={() => setEditing(false)} student={student} />
    </div>
  );
}

function Row({ icon: Icon, label, value, hint, right }: { icon: LucideIcon; label: string; value?: ReactNode; hint?: string; right?: ReactNode }) {
  return (
    <li className="flex items-center gap-3 px-4 py-3.5">
      <Icon className="size-[18px] shrink-0 text-faint" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-muted">{label}</p>
        <p className={clsx('truncate text-sm', value ? 'text-ink' : 'text-faint')}>{value || 'Não informado'}</p>
        {hint && <p className="mt-0.5 text-[11px] text-faint">{hint}</p>}
      </div>
      {right}
    </li>
  );
}

function NotifyRow({ student }: { student: Student }) {
  const { perm, on, enable, disable } = useNotify(student);
  const test = useTestNotification();
  const [steps, setSteps] = useState(false);
  const iosBrowser = perm === 'unsupported' && isIOS() && !isStandalone();
  const text = on
    ? 'Ativadas neste aparelho'
    : perm === 'denied'
      ? 'Bloqueadas no navegador — libere nas configurações'
      : iosBrowser
        ? 'No iPhone, instale o app para ativar'
        : perm === 'unsupported'
          ? 'Este navegador não aceita notificações'
          : 'Avisos, check-in aberto e lembrete da mensalidade';
  return (
    <li className="flex items-center gap-3 px-4 py-3.5">
      <BellRing className="size-[18px] shrink-0 text-faint" />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-ink">Notificações no celular</p>
        <p className={clsx('text-[11px]', on ? 'text-emerald-600' : 'text-muted')}>
          {text}
          {on && (
            <>
              {' · '}
              <button onClick={test} className="font-medium text-brand-600">
                Testar
              </button>
            </>
          )}
        </p>
      </div>
      {perm === 'default' || perm === 'granted' ? (
        <Toggle checked={on} onChange={(v) => (v ? enable() : disable())} />
      ) : iosBrowser ? (
        <Button size="sm" variant="secondary" onClick={() => setSteps(true)}>
          Como
        </Button>
      ) : null}
      <InstallSheet open={steps} onClose={() => setSteps(false)} />
    </li>
  );
}

function InstallRow() {
  const install = useInstall();
  const toast = useToast();
  const [steps, setSteps] = useState(false);
  // sem pedido de instalação disponível (ex.: navegador do computador) a linha não aparece
  if (!install.installed && !install.canPrompt && !install.iosSteps) return null;

  const onInstall = async () => {
    if (install.iosSteps) return setSteps(true);
    if (await install.prompt()) toast('App instalado na tela inicial.');
  };

  return (
    <li className="flex items-center gap-3 px-4 py-3.5">
      <Download className="size-[18px] shrink-0 text-faint" />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-ink">Instalar na tela inicial</p>
        <p className={clsx('text-[11px]', install.installed ? 'text-emerald-600' : 'text-muted')}>{install.installed ? 'App instalado' : 'Abre direto, como um aplicativo'}</p>
      </div>
      {install.installed ? (
        <Check className="size-4 text-emerald-600" strokeWidth={2.5} />
      ) : (
        <Button size="sm" onClick={onInstall}>
          Instalar
        </Button>
      )}
      <InstallSheet open={steps} onClose={() => setSteps(false)} />
    </li>
  );
}

/** (85) 99999-9999 enquanto digita */
function maskPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function EditSheet({ open, onClose, student }: { open: boolean; onClose: () => void; student: Student }) {
  const { updateStudent } = useStore();
  const toast = useToast();
  const [phone, setPhone] = useState(student.phone);
  const [birth, setBirth] = useState(student.birthDate);

  useEffect(() => {
    if (!open) return;
    setPhone(student.phone);
    setBirth(student.birthDate);
  }, [open, student.phone, student.birthDate]);

  const save = () => {
    if (phone && phone.replace(/\D/g, '').length < 10) return toast('Confira o telefone com DDD.', 'error');
    updateStudent(student.id, { phone, birthDate: birth });
    toast('Dados atualizados.');
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="pt-2 pb-6">
        <h3 className="text-[22px] leading-tight text-ink">Dados pessoais</h3>
        <p className="text-[13px] text-muted">Mantenha seu contato atualizado.</p>
        <div className="mt-5 space-y-4">
          <Field label="Telefone (WhatsApp)">
            <input className="field" type="tel" inputMode="numeric" value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} placeholder="(85) 90000-0000" />
          </Field>
          <Field label="Data de nascimento">
            <input className="field" type="date" value={birth} onChange={(e) => setBirth(e.target.value)} />
          </Field>
        </div>
        <Button size="lg" className="mt-6 w-full" onClick={save}>
          Salvar
        </Button>
      </div>
    </BottomSheet>
  );
}
