import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { AlertTriangle, Clock, Pencil, Search, UserCheck, UserPlus, Users, UserX, type LucideIcon } from 'lucide-react';
import { useNow, useStore } from '../lib/store';
import { countInRange, planOf, studentStatus } from '../lib/selectors';
import { BELTS, brl } from '../lib/belts';
import { addDays, diffDays, fmtDate } from '../lib/dates';
import { Avatar, BeltBar, BeltTag, StatusPill } from '../components/bits';
import { Button, Card, EmptyState, PageHeader, Pill, Segmented } from '../components/ui';
import { StudentDrawer } from './shared';
import type { BeltId, StudentStatus } from '../lib/types';

type Filter = 'todos' | 'ativos' | StudentStatus;

export default function Students() {
  const { db } = useStore();
  const { today } = useNow();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [beltFilter, setBeltFilter] = useState<BeltId | ''>('');
  const filter = (params.get('filtro') as Filter) || 'todos';
  const drawerId = params.get('aluno');
  const [creating, setCreating] = useState(false);

  const setFilter = (f: Filter) => setParams(f === 'todos' ? {} : { filtro: f });
  const openStudent = (id: string) => setParams({ ...(filter !== 'todos' ? { filtro: filter } : {}), aluno: id });
  const closeDrawer = () => {
    setCreating(false);
    setParams(filter !== 'todos' ? { filtro: filter } : {});
  };

  const rows = useMemo(() => {
    const from = addDays(today, -29);
    return db.students
      .map((s) => ({
        s,
        st: studentStatus(s, today),
        freq: countInRange(
          db.checkins.filter((k) => k.studentId === s.id),
          from,
          today,
        ),
      }))
      .sort((a, b) => Number(b.s.role === 'professor') - Number(a.s.role === 'professor') || a.s.name.localeCompare(b.s.name));
  }, [db, today]);

  const alunos = rows.filter((r) => r.s.role === 'aluno');
  const count = (f: Filter) => (f === 'todos' ? rows.length : f === 'ativos' ? alunos.filter((r) => r.s.active).length : alunos.filter((r) => r.st === f).length);

  const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const visible = rows
    .filter((r) => (filter === 'todos' ? true : filter === 'ativos' ? r.s.active && r.s.role === 'aluno' : r.st === filter && r.s.role === 'aluno'))
    .filter((r) => !beltFilter || r.s.belt === beltFilter)
    .filter((r) => !q || norm(r.s.name).includes(norm(q)) || norm(r.s.email).includes(norm(q)) || r.s.phone.includes(q));

  const cards: { f: Filter; label: string; icon: LucideIcon; tone: string; ring: string }[] = [
    { f: 'ativos', label: 'Ativos', icon: UserCheck, tone: 'bg-emerald-50 text-emerald-600', ring: 'ring-brand-300' },
    { f: 'vence-logo', label: 'Vencem logo', icon: Clock, tone: 'bg-amber-50 text-amber-600', ring: 'ring-brand-300' },
    { f: 'atrasado', label: 'Atrasados', icon: AlertTriangle, tone: 'bg-rose-50 text-rose-500', ring: 'ring-brand-300' },
    { f: 'inativo', label: 'Inativos', icon: UserX, tone: 'bg-paper-2 text-muted', ring: 'ring-brand-300' },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Gestão da academia"
        title="Alunos"
        subtitle="Cadastro, graduação e mensalidades em um só lugar."
        actions={
          <Button size="lg" icon={UserPlus} onClick={() => setCreating(true)}>
            Novo aluno
          </Button>
        }
      />

      <section className="mb-6 grid grid-cols-2 gap-3 @4xl:grid-cols-4 @4xl:gap-4">
        {cards.map((c) => {
          const sel = filter === c.f;
          return (
            <button
              key={c.f}
              onClick={() => setFilter(sel ? 'todos' : c.f)}
              className={clsx('card flex items-center gap-4 p-4 text-left transition hover:border-line-strong', sel && `ring-2 ${c.ring}`)}
            >
              <span className={clsx('grid size-10 place-items-center rounded-full', c.tone)}>
                <c.icon className="size-[18px]" />
              </span>
              <span className="flex-1">
                <span className="tnum block font-display text-2xl leading-none font-semibold text-ink">{count(c.f)}</span>
                <span className="mt-1 block text-[13px] text-muted">{c.label}</span>
              </span>
              {sel && <span className="text-[11px] font-medium text-brand-600">Filtrando</span>}
            </button>
          );
        })}
      </section>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <div className="flex h-9 min-w-[240px] flex-1 items-center gap-2 rounded-lg bg-white px-3 ring-1 ring-line focus-within:ring-2 focus-within:ring-brand-200 @3xl:max-w-sm">
            <Search className="size-4 text-faint" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, e-mail ou telefone" className="w-full bg-transparent text-sm outline-none placeholder:text-faint" />
          </div>
          <select value={beltFilter} onChange={(e) => setBeltFilter(e.target.value as BeltId | '')} className="field h-9 w-auto rounded-lg py-0 text-[13px]" aria-label="Filtrar por faixa">
            <option value="">Todas as faixas</option>
            {BELTS.map((b) => (
              <option key={b.id} value={b.id}>
                Faixa {b.label.toLowerCase()}
              </option>
            ))}
          </select>
          <Segmented
            className="ml-auto max-w-full overflow-x-auto"
            size="sm"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'todos', label: 'Todos', count: count('todos') },
              { value: 'em-dia', label: 'Em dia', count: count('em-dia') },
              { value: 'vence-logo', label: 'Vencem logo', count: count('vence-logo') },
              { value: 'atrasado', label: 'Atrasados', count: count('atrasado') },
              { value: 'inativo', label: 'Inativos', count: count('inativo') },
            ]}
          />
        </div>

        {visible.length === 0 ? (
          <EmptyState
            icon={Users}
            title={rows.length ? 'Nenhum aluno encontrado' : 'Sem alunos ainda'}
            text={rows.length ? 'Tente outra busca ou filtro.' : 'Cadastre o primeiro aluno para começar.'}
            action={
              !rows.length && (
                <Button icon={UserPlus} onClick={() => setCreating(true)}>
                  Novo aluno
                </Button>
              )
            }
            className="py-16"
          />
        ) : (
          <>
          {/* Celular: lista compacta */}
          <ul className="divide-y divide-line @3xl:hidden">
            {visible.map(({ s, st }) => {
              const plan = planOf(db, s);
              return (
                <li key={s.id}>
                  <button onClick={() => openStudent(s.id)} className={clsx('flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-paper/60', !s.active && 'opacity-60')}>
                    <Avatar name={s.name} src={s.photo} size={40} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">{s.name}</span>
                      <span className="mt-1 block truncate text-xs text-muted">
                        {s.role === 'professor' ? 'Professor' : plan ? `${plan.name}${s.dueDate ? ` · vence ${fmtDate(s.dueDate)}` : ''}` : 'Sem plano'}
                      </span>
                      <BeltBar belt={s.belt} degree={s.degree} className="mt-1.5 w-16" height={6} />
                    </span>
                    {s.role !== 'professor' && <StatusPill status={st} />}
                  </button>
                </li>
              );
            })}
          </ul>
          {/* Tela larga: tabela */}
          <div className="hidden overflow-x-auto @3xl:block">
            <table className="w-full min-w-[820px] text-left">
              <thead>
                <tr className="bg-paper/60 text-[11px] font-medium tracking-wider text-muted uppercase">
                  <th className="px-5 py-3">Aluno</th>
                  <th className="px-4 py-3">Graduação</th>
                  <th className="px-4 py-3">Plano</th>
                  <th className="px-4 py-3">Vencimento</th>
                  <th className="px-4 py-3">Treinos 30d</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visible.map(({ s, st, freq }) => {
                  const plan = planOf(db, s);
                  const dd = s.dueDate ? diffDays(today, s.dueDate) : null;
                  return (
                    <tr key={s.id} onClick={() => openStudent(s.id)} className={clsx('group cursor-pointer transition hover:bg-paper/60', !s.active && 'opacity-60')}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={s.name} src={s.photo} size={40} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-sm font-medium text-ink">{s.name}</span>
                              {s.role === 'professor' && <Pill className="bg-navy-900 text-white ring-transparent">Professor</Pill>}
                              {!s.hasAccount && <Pill className="bg-paper-2 text-muted ring-transparent">Sem conta</Pill>}
                            </div>
                            <div className="truncate text-xs text-muted">{s.email || s.phone || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <BeltTag belt={s.belt} degree={s.degree} />
                      </td>
                      <td className="px-4 py-3.5">
                        {plan ? (
                          <>
                            <div className="text-sm text-ink">{plan.name}</div>
                            <div className="tnum text-xs text-muted">{brl(plan.price)}</div>
                          </>
                        ) : (
                          <span className="text-sm text-muted">Sem plano</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {s.dueDate ? (
                          <>
                            <div className="tnum text-sm text-ink">{fmtDate(s.dueDate)}</div>
                            <div className={clsx('text-xs', dd! < 0 ? 'text-rose-600' : dd! <= 5 ? 'text-amber-600' : 'text-muted')}>
                              {dd! < 0 ? `há ${-dd!} dias` : dd === 0 ? 'hoje' : `em ${dd} dias`}
                            </div>
                          </>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-paper-2">
                            <div className="h-full rounded-full bg-navy-900/70" style={{ width: `${Math.min(1, freq / 16) * 100}%` }} />
                          </div>
                          <span className="tnum text-[13px] text-ink-2">{freq}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">{s.role === 'professor' ? <Pill className="bg-paper-2 text-ink-2 ring-transparent">Administrador</Pill> : <StatusPill status={st} />}</td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted transition group-hover:text-ink">
                          <Pencil className="size-3.5" /> Editar
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
        <div className="border-t border-line px-5 py-3 text-xs text-muted">
          Mostrando {visible.length} de {rows.length} cadastros
        </div>
      </Card>

      <StudentDrawer open={creating || !!drawerId} studentId={creating ? null : drawerId} onClose={closeDrawer} />
    </>
  );
}
