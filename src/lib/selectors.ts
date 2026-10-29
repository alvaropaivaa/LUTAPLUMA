import { addDays, diffDays, minToTime, monthKey, monthsBetween, startOfMonth, startOfWeek, timeToMin, weekday, addMonths } from './dates';
import { BELTS } from './belts';
import type { CheckIn, ClassItem, DB, SessionStatus, Student, StudentStatus } from './types';

/** Janela de check-in: abre 30 min antes do início e fecha ao fim da aula */
export const CHECKIN_OPENS_BEFORE = 30;

export function studentStatus(s: Student, today: string): StudentStatus {
  if (!s.active) return 'inativo';
  if (!s.planId || !s.dueDate) return 'sem-plano';
  const d = diffDays(today, s.dueDate);
  if (d < 0) return 'atrasado';
  if (d <= 5) return 'vence-logo';
  return 'em-dia';
}

export const STATUS_META: Record<StudentStatus, { label: string; cls: string; dot: string }> = {
  'em-dia': { label: 'Em dia', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
  'vence-logo': { label: 'Vence logo', cls: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500' },
  atrasado: { label: 'Atrasado', cls: 'bg-rose-50 text-rose-700 ring-rose-200', dot: 'bg-rose-500' },
  inativo: { label: 'Inativo', cls: 'bg-slate-100 text-slate-600 ring-slate-200', dot: 'bg-slate-400' },
  'sem-plano': { label: 'Sem plano', cls: 'bg-slate-100 text-slate-600 ring-slate-200', dot: 'bg-slate-400' },
};

export const students = (db: DB) => db.students;
export const enrolled = (db: DB) => db.students.filter((s) => s.role === 'aluno');
export const activeStudents = (db: DB) => db.students.filter((s) => s.active && s.role === 'aluno');

export function classesOn(db: DB, date: string, includeInactive = false): ClassItem[] {
  const wd = weekday(date);
  return db.classes
    .filter((c) => (includeInactive || c.active) && c.days.includes(wd))
    .sort((a, b) => a.time.localeCompare(b.time) || a.name.localeCompare(b.name));
}

export const sessionKey = (date: string, classId: string) => `${date}|${classId}`;

export interface SessionInfo {
  status: SessionStatus;
  opensAt: string;
  endsAt: string;
  manualClosed: boolean;
}

export function sessionInfo(db: DB, cls: ClassItem, date: string, today: string, nowMin: number): SessionInfo {
  const start = timeToMin(cls.time);
  const opens = start - CHECKIN_OPENS_BEFORE;
  const ends = start + cls.duration;
  const manualClosed = db.closedSessions.includes(sessionKey(date, cls.id));
  const base = { opensAt: minToTime(opens), endsAt: minToTime(ends), manualClosed };
  if (date < today) return { ...base, status: 'encerrada' };
  if (date > today) return { ...base, status: 'agendada' };
  if (nowMin < opens) return { ...base, status: 'agendada' };
  if (nowMin > ends || manualClosed) return { ...base, status: 'encerrada' };
  return { ...base, status: 'aberta' };
}

export function findCheckin(db: DB, studentId: string, classId: string, date: string): CheckIn | undefined {
  return db.checkins.find((k) => k.studentId === studentId && k.classId === classId && k.date === date);
}

export function canCheckIn(db: DB, student: Student, cls: ClassItem, date: string, today: string, nowMin: number): { ok: boolean; reason?: string } {
  if (!student.active) return { ok: false, reason: 'Sua matrícula está inativa. Fale com o professor.' };
  if (findCheckin(db, student.id, cls.id, date)) return { ok: false, reason: 'Você já fez check-in nesta aula.' };
  const info = sessionInfo(db, cls, date, today, nowMin);
  if (info.status === 'agendada') return { ok: false, reason: date === today ? `O check-in abre às ${info.opensAt}.` : 'Check-in só no dia da aula.' };
  if (info.status === 'encerrada') return { ok: false, reason: info.manualClosed ? 'O professor encerrou a chamada.' : 'O horário desta aula já passou.' };
  return { ok: true };
}

export function checkinsOf(db: DB, studentId: string): CheckIn[] {
  return db.checkins.filter((k) => k.studentId === studentId).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
}

export function countInRange(list: CheckIn[], from: string, to: string): number {
  return list.filter((k) => k.date >= from && k.date <= to).length;
}

/** Semanas seguidas (até a atual) com pelo menos um treino */
export function streakWeeks(list: CheckIn[], today: string): number {
  const weeks = new Set(list.map((k) => startOfWeek(k.date)));
  let w = startOfWeek(today);
  if (!weeks.has(w)) w = addDays(w, -7); // semana atual ainda pode estar em andamento
  let n = 0;
  while (weeks.has(w)) {
    n++;
    w = addDays(w, -7);
  }
  return n;
}

export function dailySeries(db: DB, days: number, today: string) {
  const counts = new Map<string, number>();
  const from = addDays(today, -(days - 1));
  for (const k of db.checkins) if (k.date >= from && k.date <= today) counts.set(k.date, (counts.get(k.date) ?? 0) + 1);
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(from, i);
    return { date, value: counts.get(date) ?? 0 };
  });
}

export function beltDistribution(db: DB) {
  const act = activeStudents(db);
  return BELTS.map((b) => ({ belt: b, count: act.filter((s) => s.belt === b.id).length }));
}

/** Média de presentes por aula nos últimos N dias */
export function topClasses(db: DB, today: string, days = 30) {
  const from = addDays(today, -(days - 1));
  return db.classes
    .filter((c) => c.active)
    .map((c) => {
      let sessions = 0;
      for (let d = from; d <= today; d = addDays(d, 1)) if (c.days.includes(weekday(d))) sessions++;
      const total = db.checkins.filter((k) => k.classId === c.id && k.date >= from && k.date <= today).length;
      const avg = sessions ? total / sessions : 0;
      return { cls: c, sessions, total, avg, fill: c.capacity ? avg / c.capacity : 0 };
    })
    .filter((x) => x.total > 0)
    .sort((a, b) => b.avg - a.avg);
}

export function revenueByMonth(db: DB, months: number, today: string) {
  const out: { key: string; date: string; value: number; count: number }[] = [];
  const first = startOfMonth(today);
  for (let i = months - 1; i >= 0; i--) {
    const date = addMonths(first, -i);
    const key = monthKey(date);
    const list = db.payments.filter((p) => monthKey(p.date) === key);
    out.push({ key, date, value: list.reduce((n, p) => n + p.amount, 0), count: list.length });
  }
  return out;
}

/** Receita recorrente mensal estimada a partir dos planos ativos */
export function monthlyRecurring(db: DB): number {
  return activeStudents(db).reduce((n, s) => {
    const p = db.plans.find((x) => x.id === s.planId);
    return p ? n + p.price / p.months : n;
  }, 0);
}

export function planOf(db: DB, s: Student) {
  return db.plans.find((p) => p.id === s.planId) ?? null;
}

export function lastGraduation(db: DB, studentId: string) {
  return db.graduations.filter((g) => g.studentId === studentId).sort((a, b) => b.date.localeCompare(a.date))[0];
}

/** Turma combina com o aluno: plano kids vai para aulas kids, adultos para as demais */
export const fitsStudent = (s: Student, c: ClassItem) => (s.planId === 'kids') === (c.modality === 'kids');

/** Aulas do dia que servem para o aluno (adulto não vê Kids e vice-versa) */
export const classesFor = (db: DB, date: string, s: Student) => classesOn(db, date).filter((c) => fitsStudent(s, c));

/** Critério simples de sugestão de graduação: 40+ treinos e 4+ meses desde a última graduação */
export const READY_TRAININGS = 40;
export const READY_MONTHS = 4;

export function gradProgress(db: DB, s: Student, today: string) {
  const g = lastGraduation(db, s.id);
  const since = g?.date ?? s.joinedAt;
  const trainingsSince = db.checkins.filter((k) => k.studentId === s.id && k.date >= since).length;
  const months = monthsBetween(since, today);
  return { since, trainingsSince, months, ready: trainingsSince >= READY_TRAININGS && months >= READY_MONTHS };
}

/** Número da carteirinha: EW-0001, EW-0002... (ordem de cadastro) */
export const memberNumber = (db: DB, s: Student) => `EW-${String(db.students.findIndex((x) => x.id === s.id) + 1).padStart(4, '0')}`;

/** Planos que o aluno pode contratar: kids só o kids, adultos os demais */
export const plansFor = (db: DB, s: Student) => db.plans.filter((p) => (p.id === 'kids') === (s.planId === 'kids'));

export function nextClassFor(db: DB, today: string, nowMin: number, student?: Student, daysAhead = 7): { cls: ClassItem; date: string } | null {
  for (let i = 0; i <= daysAhead; i++) {
    const date = addDays(today, i);
    const list = classesOn(db, date).filter((c) => (i > 0 || timeToMin(c.time) + c.duration >= nowMin) && (!student || fitsStudent(student, c)));
    if (!list.length) continue;
    // no mesmo horário, prefere a turma que o aluno mais frequenta
    const first = list.filter((c) => c.time === list[0].time);
    const freq = (c: ClassItem) => (student ? db.checkins.filter((k) => k.studentId === student.id && k.classId === c.id).length : 0);
    return { cls: first.sort((a, b) => freq(b) - freq(a))[0], date };
  }
  return null;
}
