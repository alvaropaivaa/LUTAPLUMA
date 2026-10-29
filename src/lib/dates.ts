export const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const WEEKDAYS_LETTER = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
export const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
/** Ordem de exibição da semana: segunda a domingo */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

const pad = (n: number) => String(n).padStart(2, '0');

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayISO(): string {
  return toISO(new Date());
}

export function addDays(iso: string, n: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export function addMonths(iso: string, n: number): string {
  const d = parseISO(iso);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return toISO(d);
}

/** Diferença em dias (b - a) */
export function diffDays(a: string, b: string): number {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86_400_000);
}

export function weekday(iso: string): number {
  return parseISO(iso).getDay();
}

/** Segunda-feira da semana da data */
export function startOfWeek(iso: string): string {
  const wd = weekday(iso);
  return addDays(iso, wd === 0 ? -6 : 1 - wd);
}

export function startOfMonth(iso: string): string {
  return iso.slice(0, 8) + '01';
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function minToTime(min: number): string {
  const m = ((min % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

export function nowTime(d = new Date()): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Terça-feira, 27 de outubro" */
export function fmtLong(iso: string): string {
  const d = parseISO(iso);
  const wd = d.getDay();
  const name = wd === 0 || wd === 6 ? WEEKDAYS[wd] : `${WEEKDAYS[wd]}-feira`;
  return `${capitalize(name)}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}

/** "27/10" */
export function fmtShort(iso: string): string {
  const d = parseISO(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

/** "27/10/2026" */
export function fmtDate(iso: string): string {
  const d = parseISO(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** "27 out" */
export function fmtDayMonth(iso: string): string {
  const d = parseISO(iso);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()].toLowerCase()}`;
}

export function fmtMonthYear(iso: string): string {
  const d = parseISO(iso);
  return `${capitalize(MONTHS[d.getMonth()])} de ${d.getFullYear()}`;
}

export function monthName(iso: string): string {
  return MONTHS[parseISO(iso).getMonth()];
}

/** "hoje", "amanhã", "em 3 dias", "há 2 dias" */
export function fmtRelative(iso: string, today: string): string {
  const n = diffDays(today, iso);
  if (n === 0) return 'hoje';
  if (n === 1) return 'amanhã';
  if (n === -1) return 'ontem';
  if (n > 0) return `em ${n} dias`;
  return `há ${-n} dias`;
}

export function fmtAgo(isoDateTime: string): string {
  const diff = (Date.now() - new Date(isoDateTime).getTime()) / 60000;
  if (diff < 1) return 'agora mesmo';
  if (diff < 60) return `há ${Math.floor(diff)} min`;
  if (diff < 1440) return `há ${Math.floor(diff / 60)} h`;
  const days = Math.floor(diff / 1440);
  if (days === 1) return 'ontem';
  if (days < 30) return `há ${days} dias`;
  const months = Math.floor(days / 30);
  return months <= 1 ? 'há 1 mês' : `há ${months} meses`;
}

export function monthsBetween(a: string, b: string): number {
  const da = parseISO(a);
  const db = parseISO(b);
  return (db.getFullYear() - da.getFullYear()) * 12 + db.getMonth() - da.getMonth() - (db.getDate() < da.getDate() ? 1 : 0);
}

export function fmtDuration(fromIso: string, toIso: string): string {
  const m = monthsBetween(fromIso, toIso);
  if (m < 1) {
    const d = diffDays(fromIso, toIso);
    return d <= 1 ? '1 dia' : `${d} dias`;
  }
  if (m < 12) return m === 1 ? '1 mês' : `${m} meses`;
  const y = Math.floor(m / 12);
  const r = m % 12;
  const ys = y === 1 ? '1 ano' : `${y} anos`;
  return r ? `${ys} e ${r} ${r === 1 ? 'mês' : 'meses'}` : ys;
}

export function greeting(hhmm: string): string {
  const h = Number(hhmm.slice(0, 2));
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function ageFrom(birth: string, today: string): number {
  const b = parseISO(birth);
  const t = parseISO(today);
  let age = t.getFullYear() - b.getFullYear();
  if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) age--;
  return age;
}
