import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { AlertTriangle, CalendarClock, CalendarDays, ChevronRight, ClipboardCheck, Megaphone, QrCode, UserCheck, UserPlus, Users, Wallet, type LucideIcon } from 'lucide-react';
import { useNow, useStore } from '../lib/store';
import { activeStudents, classesOn, enrolled, nextClassFor, planOf, sessionInfo, studentStatus } from '../lib/selectors';
import { addDays, diffDays, fmtLong, fmtShort, greeting, monthKey, timeToMin, WEEKDAYS } from '../lib/dates';
import { brlInt } from '../lib/belts';
import { Avatar } from '../components/bits';
import { Button, Card, PageHeader, ProgressBar } from '../components/ui';
import { PaymentModal, StudentDrawer } from './shared';

const fmtMins = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, '0') : ''}`);

/** Início do painel no celular: aula de agora, números do dia, pendências e atalhos */
export default function MobileHome() {
  const { db, me } = useStore();
  const { today, nowMin, time } = useNow();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [payFor, setPayFor] = useState<string | null | undefined>(undefined);

  const todays = classesOn(db, today).map((c) => ({
    cls: c,
    info: sessionInfo(db, c, today, today, nowMin),
    present: db.checkins.filter((k) => k.classId === c.id && k.date === today).length,
  }));
  const live = todays.find((t) => t.info.status === 'aberta');
  const next = live ? null : nextClassFor(db, today, nowMin);

  const people = enrolled(db);
  const late = people.filter((s) => studentStatus(s, today) === 'atrasado').sort((a, b) => a.dueDate!.localeCompare(b.dueDate!));
  const soon = people.filter((s) => s.active && s.dueDate && diffDays(today, s.dueDate) >= 0 && diffDays(today, s.dueDate) <= 7).sort((a, b) => a.dueDate!.localeCompare(b.dueDate!));
  const owed = late.reduce((n, s) => n + (planOf(db, s)?.price ?? 0), 0);
  const monthPays = db.payments.filter((p) => monthKey(p.date) === monthKey(today));
  const received = monthPays.reduce((n, p) => n + p.amount, 0);
  const presencesToday = db.checkins.filter((k) => k.date === today).length;
  const pix = db.pixClaims.length;
  const pending = pix + late.length + soon.length;

  return (
    <>
      <PageHeader eyebrow={fmtLong(today)} title={`${greeting(time)}, ${me?.name.split(' ')[0] ?? ''}`} subtitle="O que importa hoje na academia." />

      <div className="space-y-4">
        {/* Aula de agora / próxima */}
        <Card className="p-5">
          {live ? (
            <>
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                  </span>
                  Em chamada agora
                </p>
                <span className="text-xs text-muted">até {live.info.endsAt}</span>
              </div>
              <ClassLine time={live.cls.time} name={live.cls.name} sub={`${live.cls.professor.split(' ')[0]} · ${live.present}/${live.cls.capacity} presentes`} />
              <ProgressBar value={live.present / live.cls.capacity} barClass="bg-emerald-500" className="mt-4" />
              <Button size="lg" icon={ClipboardCheck} className="mt-4 w-full" onClick={() => navigate('/painel/chamada')}>
                Abrir chamada
              </Button>
            </>
          ) : next ? (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted">Próxima aula</p>
                <span className="text-xs text-muted">
                  {next.date === today
                    ? timeToMin(next.cls.time) > nowMin
                      ? `começa em ${fmtMins(timeToMin(next.cls.time) - nowMin)}`
                      : 'começando'
                    : next.date === addDays(today, 1)
                      ? 'amanhã'
                      : WEEKDAYS[new Date(next.date + 'T00:00').getDay()].toLowerCase()}
                </span>
              </div>
              <ClassLine time={next.cls.time} name={next.cls.name} sub={`${next.cls.professor.split(' ')[0]} · ${next.cls.capacity} vagas`} />
              <Button size="lg" variant="secondary" icon={ClipboardCheck} className="mt-4 w-full" onClick={() => navigate('/painel/chamada')}>
                Ver chamada do dia
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted">Sem aulas nos próximos dias. Cadastre aulas na grade.</p>
          )}
        </Card>

        {/* Números */}
        <div className="grid grid-cols-2 gap-3">
          <Stat to="/painel/chamada" icon={UserCheck} tone="bg-emerald-50 text-emerald-600" value={String(presencesToday)} label="Presenças hoje" sub={`${todays.length} ${todays.length === 1 ? 'aula' : 'aulas'} hoje`} />
          <Stat to="/painel/alunos" icon={Users} tone="bg-brand-50 text-brand-500" value={String(activeStudents(db).length)} label="Alunos ativos" sub={`${people.length} cadastrados`} />
          <Stat to="/painel/financeiro" icon={Wallet} tone="bg-navy-50 text-navy-700" value={brlInt(received)} label="Recebido no mês" sub={`${monthPays.length} ${monthPays.length === 1 ? 'pagamento' : 'pagamentos'}`} />
          <Stat to="/painel/financeiro" icon={AlertTriangle} tone="bg-rose-50 text-rose-600" value={brlInt(owed)} label="Em atraso" sub={`${late.length} ${late.length === 1 ? 'aluno' : 'alunos'}`} />
        </div>

        {/* Pendências */}
        {pending > 0 && (
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <h3 className="text-[15px] font-semibold text-ink">Pendências</h3>
              <span className="tnum rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-600">{pending}</span>
            </div>
            <ul className="divide-y divide-line">
              {pix > 0 && (
                <LinkRow to="/painel/financeiro" icon={QrCode} tone="bg-brand-50 text-brand-500" title={`${pix} ${pix === 1 ? 'PIX informado' : 'PIX informados'}`} sub="Confira no banco e confirme" />
              )}
              {late.slice(0, 3).map((s) => {
                const d = -diffDays(today, s.dueDate!);
                return (
                  <li key={s.id} className="flex items-center gap-3 px-5 py-3">
                    <Avatar name={s.name} src={s.photo} size={36} />
                    <Link to={`/painel/alunos?aluno=${s.id}`} className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-ink">{s.name}</span>
                      <span className="block text-[11px] text-rose-600">
                        Atrasado há {d} {d === 1 ? 'dia' : 'dias'} · {planOf(db, s)?.name}
                      </span>
                    </Link>
                    <Button size="sm" variant="secondary" onClick={() => setPayFor(s.id)}>
                      Renovar
                    </Button>
                  </li>
                );
              })}
              {late.length > 3 && <LinkRow to="/painel/financeiro" icon={AlertTriangle} tone="bg-rose-50 text-rose-600" title={`Mais ${late.length - 3} em atraso`} sub="Ver no financeiro" />}
              {soon.length > 0 && (
                <LinkRow to="/painel/financeiro" icon={CalendarClock} tone="bg-amber-50 text-amber-600" title={`${soon.length} ${soon.length === 1 ? 'plano vence' : 'planos vencem'} em 7 dias`} sub={`Próximo: ${soon[0].name.split(' ')[0]}, ${fmtShort(soon[0].dueDate!)}`} />
              )}
            </ul>
          </Card>
        )}

        {/* Atalhos */}
        <div className="grid grid-cols-4 gap-2">
          <Shortcut icon={UserPlus} label="Novo aluno" onClick={() => setCreating(true)} />
          <Shortcut icon={Wallet} label="Pagamento" onClick={() => setPayFor(null)} />
          <Shortcut icon={Megaphone} label="Aviso" onClick={() => navigate('/painel/avisos')} />
          <Shortcut icon={CalendarDays} label="Grade" onClick={() => navigate('/painel/grade')} />
        </div>

        {/* Aulas de hoje */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <h3 className="text-[15px] font-semibold text-ink">Aulas de hoje</h3>
            <Link to="/painel/chamada" className="text-xs font-medium text-brand-600">
              Chamada
            </Link>
          </div>
          {todays.length ? (
            <ul className="divide-y divide-line">
              {todays.map(({ cls, info, present }) => (
                <li key={cls.id}>
                  <Link to="/painel/chamada" className={clsx('flex items-center gap-3 px-5 py-3', info.status === 'encerrada' && 'opacity-60')}>
                    <span className="tnum w-12 shrink-0 font-display text-[15px] font-semibold text-ink">{cls.time}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-ink">{cls.name}</span>
                      <span className={clsx('block text-[11px]', info.status === 'aberta' ? 'text-emerald-600' : 'text-muted')}>
                        {info.status === 'aberta' ? 'Aberta agora' : info.status === 'encerrada' ? 'Encerrada' : `Check-in abre às ${info.opensAt}`}
                      </span>
                    </span>
                    <span className="tnum text-xs text-muted">
                      <b className="font-semibold text-ink">{present}</b>/{cls.capacity}
                    </span>
                    <ChevronRight className="size-4 text-faint" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 pb-5 text-[13px] text-muted">Nenhuma aula hoje.</p>
          )}
        </Card>
      </div>

      <StudentDrawer open={creating} studentId={null} onClose={() => setCreating(false)} />
      <PaymentModal open={payFor !== undefined} onClose={() => setPayFor(undefined)} studentId={payFor ?? null} />
    </>
  );
}

function ClassLine({ time, name, sub }: { time: string; name: string; sub: string }) {
  return (
    <div className="mt-3 flex items-center gap-4">
      <span className="tnum font-display text-[34px] leading-none font-semibold tracking-tight text-ink">{time}</span>
      <div className="min-w-0 flex-1 border-l border-line pl-4">
        <p className="truncate text-[15px] font-semibold text-ink">{name}</p>
        <p className="truncate text-xs text-muted">{sub}</p>
      </div>
    </div>
  );
}

function Stat({ to, icon: Icon, tone, value, label, sub }: { to: string; icon: LucideIcon; tone: string; value: string; label: string; sub: string }) {
  return (
    <Link to={to} className="card block p-4 transition active:scale-[0.98]">
      <span className={clsx('grid size-9 place-items-center rounded-full', tone)}>
        <Icon className="size-[18px]" />
      </span>
      <p className="tnum mt-3 truncate font-display text-[22px] leading-none font-semibold tracking-tight text-ink">{value}</p>
      <p className="mt-1.5 text-xs font-medium text-ink-2">{label}</p>
      <p className="text-[11px] text-muted">{sub}</p>
    </Link>
  );
}

function LinkRow({ to, icon: Icon, tone, title, sub }: { to: string; icon: LucideIcon; tone: string; title: string; sub: ReactNode }) {
  return (
    <li>
      <Link to={to} className="flex items-center gap-3 px-5 py-3">
        <span className={clsx('grid size-9 shrink-0 place-items-center rounded-full', tone)}>
          <Icon className="size-[18px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-ink">{title}</span>
          <span className="block truncate text-[11px] text-muted">{sub}</span>
        </span>
        <ChevronRight className="size-4 text-faint" />
      </Link>
    </li>
  );
}

function Shortcut({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="card flex flex-col items-center gap-2 px-1 py-3.5 text-center transition active:scale-[0.97]">
      <span className="grid size-10 place-items-center rounded-full bg-brand-50 text-brand-500">
        <Icon className="size-[18px]" />
      </span>
      <span className="text-[11px] font-medium text-ink-2">{label}</span>
    </button>
  );
}
