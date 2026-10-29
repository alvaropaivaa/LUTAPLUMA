import { Fragment, useEffect, useState } from 'react';
import clsx from 'clsx';
import { CalendarDays, CalendarPlus, Clock, Info, Layers, Pencil, Plus, Power, Trash2, User, Users } from 'lucide-react';
import { useNow, useStore } from '../lib/store';
import { MODALITIES, modality } from '../lib/belts';
import { minToTime, timeToMin, weekday, WEEK_ORDER, WEEKDAYS, WEEKDAYS_SHORT } from '../lib/dates';
import { PROFESSORS } from '../lib/seed';
import { ModalityTag } from '../components/bits';
import { Button, Card, ConfirmDialog, EmptyState, Field, IconButton, Modal, PageHeader, Pill, Toggle, useToast } from '../components/ui';
import type { ClassItem, Modality } from '../lib/types';

type Draft = Omit<ClassItem, 'id'> & { id?: string };

const blank = (patch: Partial<Draft> = {}): Draft => ({
  name: '',
  modality: 'gi',
  days: [],
  time: '19:00',
  duration: 60,
  professor: PROFESSORS[0],
  capacity: 25,
  active: true,
  ...patch,
});

export default function Schedule() {
  const { db, saveClass, deleteClass } = useStore();
  const { today, nowMin } = useNow();
  const toast = useToast();
  const [editing, setEditing] = useState<Draft | null>(null);
  const [toDelete, setToDelete] = useState<ClassItem | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const todayWd = weekday(today);
  const [mobileDay, setMobileDay] = useState(todayWd);

  const active = db.classes.filter((c) => c.active);
  const shown = db.classes.filter((c) => c.active || showInactive);
  const slots = [...new Set(shown.map((c) => c.time))].sort();
  const perWeek = active.reduce((n, c) => n + c.days.length, 0);
  const profs = new Set(active.map((c) => c.professor)).size;

  const sorted = [...db.classes].sort((a, b) => Number(b.active) - Number(a.active) || a.time.localeCompare(b.time));

  return (
    <>
      <PageHeader
        eyebrow={
          <>
            Agenda semanal
          </>
        }
        title="Grade de aulas"
        actions={
          <Button size="lg" icon={Plus} onClick={() => setEditing(blank())}>
            Nova aula
          </Button>
        }
      />

      <div className="card mb-6 grid grid-cols-3 gap-3 px-5 py-5 @3xl:flex @3xl:flex-wrap @3xl:items-center @3xl:gap-x-8 @3xl:px-6">
        <HeadStat icon={Layers} value={active.length} label="turmas ativas" />
        <HeadStat icon={CalendarDays} value={perWeek} label="aulas / semana" />
        <HeadStat icon={Users} value={profs} label={profs === 1 ? 'professor' : 'professores'} />
        <div className="col-span-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-line pt-3 @3xl:ml-auto @3xl:border-0 @3xl:pt-0">
          {MODALITIES.map((m) => (
            <span key={m.id} className="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
              <span className="size-2.5 rounded-full" style={{ background: m.solid }} />
              {m.label}
            </span>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-4 @md:px-5">
          <div>
            <h2 className="text-sm font-medium text-ink">Calendário de treinos</h2>
            <p className="text-xs text-muted">Clique numa aula para editar, ou num espaço vazio para criar.</p>
          </div>
          {db.classes.some((c) => !c.active) && (
            <div className="w-56">
              <Toggle checked={showInactive} onChange={setShowInactive} label={<span className="text-xs">Mostrar desativadas</span>} />
            </div>
          )}
        </div>

        {slots.length === 0 ? (
          <EmptyState
            icon={CalendarPlus}
            title="Nenhuma aula cadastrada"
            text="Monte a grade da academia: crie as turmas com dia, horário e professor."
            action={
              <Button icon={Plus} onClick={() => setEditing(blank())}>
                Criar primeira aula
              </Button>
            }
            className="py-16"
          />
        ) : (
          <>
          {/* Celular / tablet estreito: um dia por vez */}
          <div className="@3xl:hidden">
            <div className="scrollbar-none flex gap-1 overflow-x-auto border-b border-line px-3 py-3">
              {WEEK_ORDER.map((wd) => (
                <button
                  key={wd}
                  onClick={() => setMobileDay(wd)}
                  className={clsx('relative min-w-10 flex-1 rounded-full px-1 py-1.5 text-[13px] font-medium transition', mobileDay === wd ? 'bg-brand-50 text-brand-600' : 'text-muted hover:text-ink')}
                >
                  {WEEKDAYS_SHORT[wd]}
                  {wd === todayWd && <span className="absolute top-1 right-1.5 size-1.5 rounded-full bg-brand-500" />}
                </button>
              ))}
            </div>
            {(() => {
              const list = shown.filter((c) => c.days.includes(mobileDay)).sort((a, b) => a.time.localeCompare(b.time));
              return list.length ? (
                <ul className="divide-y divide-line">
                  {list.map((c) => {
                    const m = modality(c.modality);
                    return (
                      <li key={c.id}>
                        <button onClick={() => setEditing({ ...c })} className={clsx('flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-paper/60', !c.active && 'opacity-50')}>
                          <span className="tnum w-12 font-display text-sm font-semibold text-ink">{c.time}</span>
                          <span className="h-9 w-1 shrink-0 rounded-full" style={{ background: m.solid }} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-ink">{c.name}</span>
                            <span className="block truncate text-xs text-muted">
                              {m.label} · {c.professor} · {c.duration}min
                            </span>
                          </span>
                          <Pencil className="size-4 text-faint" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="px-4 py-10 text-center">
                  <p className="text-sm text-muted">Sem aulas na {WEEKDAYS[mobileDay].toLowerCase()}.</p>
                  <Button size="sm" variant="secondary" icon={Plus} className="mt-3" onClick={() => setEditing(blank({ days: [mobileDay] }))}>
                    Criar aula
                  </Button>
                </div>
              );
            })()}
          </div>

          {/* Tela larga: semana inteira */}
          <div className="hidden overflow-x-auto @3xl:block">
            <div className="grid min-w-[760px]" style={{ gridTemplateColumns: '64px repeat(7, minmax(0, 1fr))' }}>
              {/* Cabeçalho */}
              <div className="grid place-items-center border-b border-line py-4 text-faint">
                <Clock className="size-4" />
              </div>
              {WEEK_ORDER.map((wd) => (
                <div
                  key={wd}
                  className={clsx(
                    'flex items-center justify-center gap-2 border-b border-l border-line py-4 text-[13px] font-medium',
                    wd === todayWd ? 'bg-brand-50 text-brand-600' : 'text-ink',
                  )}
                >
                  {WEEKDAYS[wd]}
                  {wd === todayWd && <span className="rounded bg-brand-500 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-white">HOJE</span>}
                </div>
              ))}

              {/* Linhas por horário */}
              {slots.map((time) => (
                <Fragment key={time}>
                  <div className="border-b border-line px-3 py-3 text-right">
                    <div className="font-display text-xs font-medium text-muted">{time}</div>
                  </div>
                  {WEEK_ORDER.map((wd) => {
                    const here = shown.filter((c) => c.time === time && c.days.includes(wd));
                    const isToday = wd === todayWd;
                    return (
                      <div key={wd} className={clsx('group/cell flex min-h-[96px] gap-1.5 border-b border-l border-line p-1.5', isToday && 'bg-brand-50/40')}>
                        {here.length ? (
                          here.map((c) => {
                            const m = modality(c.modality);
                            const live = isToday && nowMin >= timeToMin(c.time) && nowMin <= timeToMin(c.time) + c.duration;
                            return (
                              <button
                                key={c.id}
                                onClick={() => setEditing({ ...c })}
                                className={clsx(
                                  'relative flex min-w-0 flex-1 flex-col rounded-xl p-2.5 text-left transition hover:brightness-[0.98]',
                                  !c.active && 'opacity-50 grayscale',
                                )}
                                style={{ background: m.soft }}
                              >
                                <span className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: m.text }}>
                                  {c.time}
                                  {live && <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />}
                                </span>
                                <span className={clsx('mt-1 font-medium text-ink', here.length > 1 ? 'text-[11px] leading-tight' : 'text-[13px]')}>{c.name}</span>
                                <span className="mt-auto truncate pt-1 text-[10px] text-muted">
                                  {here.length > 1 ? m.label : `${c.professor.split(' ')[0]} · ${c.duration}min`}
                                </span>
                              </button>
                            );
                          })
                        ) : (
                          <button
                            onClick={() => setEditing(blank({ days: [wd], time }))}
                            className="grid flex-1 place-items-center rounded-xl text-faint transition hover:bg-paper hover:text-brand-500"
                            aria-label={`Criar aula ${WEEKDAYS[wd]} ${time}`}
                          >
                            <span className="text-lg leading-none group-hover/cell:hidden">–</span>
                            <Plus className="hidden size-4 group-hover/cell:block" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>
          </>
        )}
      </Card>

      <div className="mt-8 mb-3 flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-ink">Turmas cadastradas</h2>
        <span className="text-xs text-muted">
          {db.classes.length} {db.classes.length === 1 ? 'turma' : 'turmas'}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 @4xl:grid-cols-2">
        {sorted.map((c) => (
          <Card key={c.id} className={clsx('flex items-center gap-4 p-4', !c.active && 'bg-paper/60')}>
            <div className={clsx('flex w-[76px] shrink-0 flex-col items-center border-r border-line pr-4', !c.active && 'opacity-50')}>
              <Clock className="size-3.5 text-faint" />
              <span className="mt-1 font-display text-xl font-semibold text-ink">{c.time}</span>
              <span className="text-[10px] text-muted">até {minToTime(timeToMin(c.time) + c.duration)}</span>
            </div>
            <div className={clsx('min-w-0 flex-1', !c.active && 'opacity-60')}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate text-[15px] font-medium text-ink">{c.name}</span>
                <ModalityTag modality={c.modality} />
                {!c.active && <Pill className="bg-paper-2 text-muted ring-transparent">Desativada</Pill>}
              </div>
              <div className="mt-1 text-xs text-muted">{WEEK_ORDER.filter((wd) => c.days.includes(wd)).map((wd) => WEEKDAYS_SHORT[wd]).join(' · ')}</div>
              <div className="mt-1.5 flex flex-wrap gap-x-3 text-xs text-faint">
                <span className="inline-flex items-center gap-1">
                  <User className="size-3" /> {c.professor}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3" /> até {c.capacity} alunos
                </span>
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-1 @lg:flex-row">
              <IconButton icon={Pencil} label="Editar" onClick={() => setEditing({ ...c })} />
              <IconButton
                icon={Power}
                label={c.active ? 'Desativar' : 'Reativar'}
                tone={c.active ? 'default' : 'brand'}
                onClick={() => {
                  saveClass({ ...c, active: !c.active });
                  toast(c.active ? `${c.name} das ${c.time} desativada.` : `${c.name} das ${c.time} reativada.`, 'info');
                }}
              />
              <IconButton icon={Trash2} label="Excluir" tone="danger" onClick={() => setToDelete(c)} />
            </div>
          </Card>
        ))}
      </div>

      <ClassModal draft={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        danger
        title="Excluir turma?"
        text={
          <>
            A turma <b>{toDelete?.name}</b> das {toDelete?.time} sai da grade. O histórico de check-ins é mantido. Se for só uma pausa, prefira <b>desativar</b>.
          </>
        }
        confirmLabel="Excluir"
        onConfirm={() => {
          if (toDelete) deleteClass(toDelete.id);
          toast('Turma excluída.', 'info');
        }}
      />
    </>
  );
}

function HeadStat({ icon: Icon, value, label }: { icon: typeof Layers; value: number; label: string }) {
  return (
    <div className="flex flex-col gap-1 @3xl:flex-row @3xl:items-center @3xl:gap-2.5">
      <span className="flex items-center gap-2">
        <Icon className="size-[18px] text-brand-500" />
        <span className="font-display text-xl font-semibold text-ink">{value}</span>
      </span>
      <span className="text-xs text-muted @3xl:text-[13px]">{label}</span>
    </div>
  );
}

function ClassModal({ draft, onClose }: { draft: Draft | null; onClose: () => void }) {
  const { db, saveClass } = useStore();
  const toast = useToast();
  const [d, setD] = useState<Draft>(blank());
  const [error, setError] = useState('');

  useEffect(() => {
    if (draft) {
      setD(draft);
      setError('');
    }
  }, [draft]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const toggleDay = (wd: number) => set('days', d.days.includes(wd) ? d.days.filter((x) => x !== wd) : [...d.days, wd].sort());
  const sideBySide = db.classes.filter((c) => c.id !== d.id && c.active && c.time === d.time && c.days.some((x) => d.days.includes(x)));

  const submit = () => {
    if (!d.name.trim()) return setError('Dê um nome para a aula.');
    if (!d.days.length) return setError('Escolha pelo menos um dia da semana.');
    if (!d.time) return setError('Informe o horário.');
    saveClass({ ...d, name: d.name.trim() });
    toast(d.id ? 'Aula atualizada.' : 'Aula criada na grade.');
    onClose();
  };

  const presets: { label: string; days: number[] }[] = [
    { label: 'Seg a Sex', days: [1, 2, 3, 4, 5] },
    { label: 'Seg · Qua · Sex', days: [1, 3, 5] },
    { label: 'Ter · Qui', days: [2, 4] },
  ];

  return (
    <Modal
      open={!!draft}
      onClose={onClose}
      icon={CalendarPlus}
      title={d.id ? 'Editar aula' : 'Nova aula'}
      subtitle="Nome, modalidade, dias, horário e professor."
      size="lg"
      footer={
        <>
          {d.id && (
            <Button variant="ghost" className="mr-auto" icon={Power} onClick={() => set('active', !d.active)}>
              {d.active ? 'Desativar' : 'Reativar'}
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit}>{d.id ? 'Salvar aula' : 'Criar aula'}</Button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Nome da aula">
          <input className="field" value={d.name} onChange={(e) => set('name', e.target.value)} placeholder="Ex.: Wrestling Iniciantes" autoFocus />
        </Field>

        <div>
          <span className="label">Modalidade</span>
          <div className="flex flex-wrap gap-2">
            {MODALITIES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => set('modality', m.id as Modality)}
                className={clsx('inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-medium ring-1 transition', d.modality === m.id ? 'ring-1' : 'bg-white ring-line hover:ring-line-strong')}
                style={d.modality === m.id ? { background: m.soft, color: m.text, ['--tw-ring-color' as string]: m.solid } : undefined}
              >
                <span className="size-2.5 rounded-full" style={{ background: m.solid }} />
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="label mb-0">Dias da semana</span>
            <div className="flex gap-1">
              {presets.map((p) => (
                <button key={p.label} type="button" onClick={() => set('days', p.days)} className="rounded-lg px-2 py-1 text-[11px] font-medium text-brand-600 hover:bg-brand-50">
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {WEEK_ORDER.map((wd) => (
              <button
                key={wd}
                type="button"
                onClick={() => toggleDay(wd)}
                className={clsx('h-10 rounded-lg text-[13px] font-medium ring-1 transition', d.days.includes(wd) ? 'bg-brand-50 text-brand-700 ring-brand-300' : 'bg-white text-ink-2 ring-line hover:ring-line-strong')}
              >
                {WEEKDAYS_SHORT[wd]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Horário de início">
            <input className="field" type="time" value={d.time} onChange={(e) => set('time', e.target.value)} />
          </Field>
          <Field label="Duração">
            <select className="field" value={d.duration} onChange={(e) => set('duration', Number(e.target.value))}>
              {[45, 60, 75, 90, 120].map((m) => (
                <option key={m} value={m}>
                  {m} minutos
                </option>
              ))}
            </select>
          </Field>
          <Field label="Capacidade">
            <input className="field" type="number" min={1} value={d.capacity} onChange={(e) => set('capacity', Math.max(1, Number(e.target.value)))} />
          </Field>
        </div>

        <Field label="Professor">
          <input className="field" list="profs" value={d.professor} onChange={(e) => set('professor', e.target.value)} />
          <datalist id="profs">
            {PROFESSORS.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </Field>

        <div className="rounded-2xl p-4 ring-1 ring-line">
          <Toggle checked={d.active} onChange={(v) => set('active', v)} label="Aula ativa" description="Aulas desativadas saem da grade e do app do aluno, mas ficam salvas." />
        </div>

        {sideBySide.length > 0 && (
          <p className="flex items-start gap-2 rounded-xl bg-paper px-3 py-2.5 text-[13px] text-ink-2">
            <Info className="mt-0.5 size-4 shrink-0" />
            Mesmo horário de {sideBySide.map((c) => c.name).join(', ')} — as aulas aparecem lado a lado no calendário.
          </p>
        )}
        {error && <p className="rounded-xl bg-rose-50 px-3 py-2.5 text-[13px] font-medium text-rose-700 ring-1 ring-rose-200">{error}</p>}
      </div>
    </Modal>
  );
}
