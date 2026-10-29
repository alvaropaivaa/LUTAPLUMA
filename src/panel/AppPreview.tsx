import { useMemo, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { AlertTriangle, BatteryFull, CircleCheck, Clock, ExternalLink, Lock, Share, Signal, SquarePlus, Wifi, type LucideIcon } from 'lucide-react';
import { useNow, useStore } from '../lib/store';
import { classesOn, sessionInfo, studentStatus } from '../lib/selectors';
import { minToTime, timeToMin } from '../lib/dates';
import { beltLabel } from '../lib/belts';
import { Avatar, StatusPill } from '../components/bits';
import { Button, Card, PageHeader } from '../components/ui';
import type { Student, StudentStatus } from '../lib/types';

type Scenario = { key: string; title: string; icon: LucideIcon; tone: string; student: Student | undefined };

export default function AppPreview() {
  const { db, setDemoTime } = useStore();
  const { today, time, nowMin, isDemo } = useNow();
  const people = useMemo(() => db.students.filter((s) => s.role === 'aluno' && s.hasAccount).sort((a, b) => a.name.localeCompare(b.name)), [db.students]);
  const withStatus = (st: StudentStatus) => people.filter((s) => studentStatus(s, today) === st);

  // Cenários prontos para testar as regras do app
  const scenarios: Scenario[] = [
    { key: 'ok', title: 'Aluno em dia', icon: CircleCheck, tone: 'bg-emerald-50 text-emerald-600', student: people.find((s) => s.id === 's1' && studentStatus(s, today) === 'em-dia') ?? withStatus('em-dia')[0] },
    { key: 'late', title: 'Mensalidade atrasada', icon: AlertTriangle, tone: 'bg-rose-50 text-rose-500', student: withStatus('atrasado')[0] },
    { key: 'off', title: 'Matrícula inativa', icon: Lock, tone: 'bg-paper-2 text-muted', student: withStatus('inativo')[0] },
  ];

  const [sid, setSid] = useState(scenarios[0].student?.id ?? people[0]?.id ?? '');
  const student = db.students.find((s) => s.id === sid);

  // Relógio: um atalho por aula de hoje (10 min depois do início)
  const todays = classesOn(db, today);
  const shortcuts = todays.map((c) => ({ cls: c, at: minToTime(timeToMin(c.time) + 10) }));
  const openNow = todays.filter((c) => sessionInfo(db, c, today, today, nowMin).status === 'aberta');

  return (
    <>
      <PageHeader
        eyebrow="Celular · instalável na tela inicial"
        title="App do aluno"
        subtitle="Veja e teste o app exatamente como o aluno vê. O que acontecer aqui aparece no painel na hora."
        actions={
          <Button variant="secondary" icon={ExternalLink} onClick={() => window.open(`/app?as=${sid}`, '_blank')}>
            Abrir em nova aba
          </Button>
        }
      />

      <div className="grid grid-cols-1 items-start gap-6 @4xl:grid-cols-[auto_minmax(0,1fr)] @4xl:gap-10">
        {/* Celular (moldura clara, aparece bem no azul e no claro) */}
        <div className="mx-auto @4xl:sticky @4xl:top-6">
          <div className="rounded-[46px] bg-white p-2.5 shadow-[0_30px_60px_-24px_rgb(16_24_40/0.4)] ring-1 ring-line">
            <div className="flex h-[min(760px,78vh)] w-[360px] max-w-[calc(100vw-4.5rem)] flex-col overflow-hidden rounded-[38px] bg-paper">
              <div className="relative flex h-10 shrink-0 items-center justify-between bg-navy-900 px-7 text-[12px] font-semibold text-white">
                <span className="tnum">{time}</span>
                <span className="absolute top-2 left-1/2 h-[22px] w-[88px] -translate-x-1/2 rounded-full bg-black" />
                <span className="flex items-center gap-1">
                  <Signal className="size-3.5" strokeWidth={2.6} />
                  <Wifi className="size-3.5" strokeWidth={2.6} />
                  <BatteryFull className="size-4" strokeWidth={2.2} />
                </span>
              </div>
              {student && <iframe key={sid} title="App do aluno" src={`/app?as=${sid}`} className="w-full flex-1 border-0" />}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Quem está usando */}
          <Card className="p-5 @md:p-6">
            <h3 className="text-[15px] font-semibold text-ink">Quem está usando</h3>
            <p className="text-[13px] text-muted">Escolha um cenário para testar as regras do app.</p>

            <div className="mt-4 grid grid-cols-1 gap-2 @2xl:grid-cols-3">
              {scenarios.map((sc) => {
                const sel = !!sc.student && sc.student.id === sid;
                return (
                  <button
                    key={sc.key}
                    disabled={!sc.student}
                    onClick={() => sc.student && setSid(sc.student.id)}
                    className={clsx(
                      'flex items-start gap-3 rounded-2xl p-3.5 text-left ring-1 transition disabled:opacity-40',
                      sel ? 'bg-brand-50 ring-brand-300' : 'bg-white ring-line hover:ring-line-strong',
                    )}
                  >
                    <span className={clsx('grid size-9 shrink-0 place-items-center rounded-full', sc.tone)}>
                      <sc.icon className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold text-ink">{sc.title}</span>
                      <span className="block truncate text-xs text-muted">{sc.student ? sc.student.name : 'Nenhum aluno nesse caso'}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4">
              {student && (
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar name={student.name} src={student.photo} size={40} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-ink">{student.name}</div>
                    <div className="truncate text-xs text-muted">{beltLabel(student.belt, student.degree)}</div>
                  </div>
                  <StatusPill status={studentStatus(student, today)} />
                </div>
              )}
              <select value={sid} onChange={(e) => setSid(e.target.value)} className="field h-10 w-full rounded-full py-0 text-[13px] @xl:w-56" aria-label="Escolher outro aluno">
                {people.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </Card>

          {/* Relógio */}
          <Card className="p-5 @md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-[15px] font-semibold text-ink">Relógio de demonstração</h3>
                <p className="text-[13px] text-muted">O check-in abre 30 min antes da aula e fecha no fim. Simule um horário:</p>
              </div>
              <span className={clsx('rounded-full px-3 py-1 text-xs font-medium', isDemo ? 'bg-brand-50 text-brand-600' : 'bg-paper-2 text-ink-2')}>
                {isDemo ? `Simulando ${time}` : `Agora ${time}`}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <TimeChip active={!isDemo} onClick={() => setDemoTime(null)}>
                <Clock className="size-3.5" /> Horário real
              </TimeChip>
              {shortcuts.map(({ cls, at }) => (
                <TimeChip key={cls.id} active={isDemo && time === at} onClick={() => setDemoTime(at)}>
                  <span className="tnum font-semibold">{at}</span>
                  <span className="text-muted">{cls.name}</span>
                </TimeChip>
              ))}
              <input
                type="time"
                value={time}
                onChange={(e) => e.target.value && setDemoTime(e.target.value)}
                className="field h-9 w-[7.5rem] rounded-full py-0 text-[13px]"
                aria-label="Outro horário"
              />
            </div>

            <div className={clsx('mt-4 flex items-center gap-2.5 rounded-xl px-4 py-3 text-[13px]', openNow.length ? 'bg-emerald-50 text-emerald-800' : 'bg-paper text-ink-2')}>
              <span className={clsx('size-2 shrink-0 rounded-full', openNow.length ? 'bg-emerald-500' : 'bg-faint')} />
              {openNow.length
                ? `Às ${time}, check-in aberto em: ${openNow.map((c) => c.name).join(', ')}.`
                : `Às ${time} nenhuma aula está aberta — o check-in fica bloqueado.`}
            </div>
          </Card>

          {/* Instalação */}
          <Card className="p-5 @md:p-6">
            <h3 className="text-[15px] font-semibold text-ink">Instalar no celular</h3>
            <p className="text-[13px] text-muted">Funciona como aplicativo, sem loja.</p>
            <div className="mt-4 grid grid-cols-1 gap-3 @2xl:grid-cols-2">
              <Steps
                title="Android · Chrome"
                steps={[
                  'Abra o endereço do app no Chrome',
                  'Toque no menu ⋮',
                  <>
                    <SquarePlus className="inline size-3.5 align-[-2px]" /> Adicionar à tela inicial
                  </>,
                ]}
              />
              <Steps
                title="iPhone · Safari"
                steps={[
                  'Abra o endereço do app no Safari',
                  <>
                    Toque em <Share className="inline size-3.5 align-[-2px]" /> Compartilhar
                  </>,
                  'Adicionar à Tela de Início',
                ]}
              />
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

function TimeChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] ring-1 transition',
        active ? 'bg-brand-50 text-brand-700 ring-brand-300' : 'bg-white text-ink ring-line hover:ring-line-strong',
      )}
    >
      {children}
    </button>
  );
}

function Steps({ title, steps }: { title: string; steps: ReactNode[] }) {
  return (
    <div className="rounded-2xl bg-paper p-4">
      <p className="text-[13px] font-semibold text-ink">{title}</p>
      <ol className="mt-3 space-y-2.5">
        {steps.map((s, i) => (
          <li key={i} className="flex items-center gap-3 text-[13px] text-ink-2">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white text-[11px] font-semibold text-ink ring-1 ring-line">{i + 1}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
