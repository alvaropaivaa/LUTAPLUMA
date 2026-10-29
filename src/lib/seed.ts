import { addDays, addMonths, diffDays, nowTime, timeToMin, todayISO, weekday } from './dates';
import { nextStep } from './belts';
import type { Account, BeltId, CheckIn, ClassItem, DB, Graduation, Notice, Payment, PayMethod, Plan, Student } from './types';

export const PROFESSORS = ['Álvaro Paiva', 'Rafael Duarte', 'Camila Rocha', 'Equipe Easy'];

export const PLANS: Plan[] = [
  { id: 'mensal', name: 'Mensal', months: 1, price: 180 },
  { id: 'trimestral', name: 'Trimestral', months: 3, price: 480 },
  { id: 'semestral', name: 'Semestral', months: 6, price: 900 },
  { id: 'anual', name: 'Anual', months: 12, price: 1680 },
  { id: 'kids', name: 'Kids Mensal', months: 1, price: 150 },
];

export const DEFAULT_PLAN_ID = 'mensal';

/** Alunos de exemplo que já ativaram as notificações no celular */
export const DEMO_PUSH_OPT_IN = ['s1', 's2', 's4', 's6', 's7', 's9', 's10', 's12', 's14', 's19', 's20', 's22'];

const CLASSES: ClassItem[] = [
  { id: 'c1', name: 'Wrestling Fundamentos', modality: 'gi', days: [1, 2, 3, 4, 5], time: '07:00', duration: 60, professor: 'Álvaro Paiva', capacity: 25, active: true },
  { id: 'c2', name: 'Wrestling', modality: 'gi', days: [1, 2, 3, 4, 5], time: '12:00', duration: 60, professor: 'Álvaro Paiva', capacity: 25, active: true },
  { id: 'c3', name: 'Kids', modality: 'kids', days: [1, 3, 5], time: '17:30', duration: 60, professor: 'Camila Rocha', capacity: 20, active: true },
  { id: 'c4', name: 'Wrestling + Grappling', modality: 'nogi', days: [1, 2, 3, 4, 5], time: '19:00', duration: 90, professor: 'Rafael Duarte', capacity: 30, active: true },
  { id: 'c5', name: 'Wrestling Feminino', modality: 'gi', days: [2, 4], time: '19:00', duration: 60, professor: 'Camila Rocha', capacity: 16, active: true },
  { id: 'c6', name: 'Time Pro', modality: 'wrestling', days: [1, 3], time: '20:30', duration: 60, professor: 'Álvaro Paiva', capacity: 20, active: true },
  { id: 'c7', name: 'Open Mat', modality: 'openmat', days: [6], time: '10:00', duration: 120, professor: 'Equipe Easy', capacity: 40, active: true },
];

type Scenario = 'ok' | 'soon' | 'late' | 'inactive';
// nome, gênero (foto), faixa, grau, plano, cenário, treinos/semana, foto (índice) | null
type Person = [string, 'm' | 'f', BeltId, number, string, Scenario, number, number | null];

const PEOPLE: Person[] = [
  ['Lucas Martins', 'm', 'azul', 2, 'mensal', 'ok', 4, 32],
  ['Mariana Costa', 'f', 'roxa', 1, 'trimestral', 'ok', 3, 44],
  ['Pedro Henrique Alves', 'm', 'branca', 3, 'mensal', 'soon', 3, 75],
  ['Beatriz Lima', 'f', 'azul', 0, 'semestral', 'ok', 3, 68],
  ['Gabriel Souza', 'm', 'branca', 1, 'mensal', 'late', 2, 22],
  ['Rafaela Nunes', 'f', 'branca', 2, 'mensal', 'ok', 3, 21],
  ['Thiago Ribeiro', 'm', 'marrom', 1, 'anual', 'ok', 4, 46],
  ['Juliana Ferreira', 'f', 'branca', 0, 'mensal', 'ok', 2, 65],
  ['Felipe Carvalho', 'm', 'azul', 4, 'trimestral', 'ok', 5, 11],
  ['Larissa Mendes', 'f', 'azul', 1, 'mensal', 'soon', 3, 90],
  ['Bruno Oliveira', 'm', 'roxa', 3, 'mensal', 'late', 2, 52],
  ['Ana Clara Rocha', 'f', 'branca', 4, 'mensal', 'ok', 3, 33],
  ['Matheus Araújo', 'm', 'branca', 0, 'mensal', 'ok', 2, 41],
  ['Carolina Dias', 'f', 'roxa', 0, 'semestral', 'ok', 3, 12],
  ['Diego Santos', 'm', 'preta', 0, 'anual', 'ok', 3, 85],
  ['Fernanda Gomes', 'f', 'branca', 1, 'mensal', 'inactive', 0, 50],
  ['Rodrigo Barbosa', 'm', 'azul', 3, 'mensal', 'late', 1, 67],
  ['Isabela Moreira', 'f', 'branca', 2, 'trimestral', 'ok', 2, null],
  ['Vinícius Teixeira', 'm', 'branca', 3, 'mensal', 'soon', 4, 18],
  ['Letícia Cardoso', 'f', 'azul', 2, 'mensal', 'ok', 3, 79],
  ['Eduardo Pires', 'm', 'marrom', 0, 'mensal', 'inactive', 0, 60],
  ['Gustavo Rezende', 'm', 'branca', 0, 'mensal', 'ok', 3, null],
  ['Miguel Andrade', 'm', 'cinza', 2, 'kids', 'ok', 2, null],
  ['Helena Martins', 'f', 'amarela', 1, 'kids', 'ok', 2, null],
  ['Arthur Costa', 'm', 'laranja', 0, 'kids', 'soon', 2, null],
  ['Laura Ribeiro', 'f', 'cinza', 0, 'kids', 'ok', 2, null],
  ['Davi Nogueira', 'm', 'verde', 1, 'kids', 'late', 1, null],
  ['Sofia Almeida', 'f', 'branca', 2, 'kids', 'ok', 2, null],
];

/** PRNG determinístico (mulberry32) para os dados serem estáveis entre recarregamentos */
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const slug = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(' ')
    .filter((_, i, arr) => i === 0 || i === arr.length - 1)
    .join('.');

export function emptyDB(): DB {
  return {
    students: [],
    plans: PLANS,
    classes: [],
    checkins: [],
    payments: [],
    graduations: [],
    notices: [],
    accounts: [],
    closedSessions: [],
    demoTime: null,
    pushOptIn: [],
    pixClaims: [],
  };
}

export function seedDB(): DB {
  const today = todayISO();
  const nowMin = timeToMin(nowTime());
  const r = rng(20261027);
  const pick = <T,>(arr: T[]) => arr[Math.floor(r() * arr.length)];
  const int = (a: number, b: number) => a + Math.floor(r() * (b - a + 1));

  const students: Student[] = [];
  const accounts: Account[] = [];
  const checkins: CheckIn[] = [];
  const payments: Payment[] = [];
  const graduations: Graduation[] = [];

  // Professor (administrador)
  students.push({
    id: 's0',
    name: 'Álvaro Paiva',
    email: 'professor@easywrestling.com.br',
    phone: '(85) 98812-4410',
    birthDate: '1990-03-14',
    photo: null,
    belt: 'preta',
    degree: 1,
    role: 'professor',
    planId: null,
    dueDate: null,
    active: true,
    joinedAt: addDays(today, -1460),
    weeklyGoal: 5,
    hasAccount: true,
  });
  accounts.push({ email: 'professor@easywrestling.com.br', password: '123456', studentId: 's0', provider: 'email' });

  const methods: PayMethod[] = ['pix', 'pix', 'pix', 'cartao', 'cartao', 'dinheiro', 'boleto'];

  PEOPLE.forEach(([name, g, belt, degree, planId, scenario, freq, photoIdx], i) => {
    const id = `s${i + 1}`;
    const plan = PLANS.find((p) => p.id === planId)!;
    const isKid = planId === 'kids';
    const joinedAt = name === 'Gustavo Rezende' ? addDays(today, -23) : addDays(today, -int(90, 900));

    let dueDate: string;
    if (scenario === 'late') dueDate = addDays(today, -int(3, 18));
    else if (scenario === 'soon') dueDate = addDays(today, int(0, 5));
    else if (scenario === 'inactive') dueDate = addDays(today, -int(40, 75));
    else dueDate = addDays(today, int(7, plan.months * 30 - 2));

    const email = `${slug(name)}@email.com`;
    const hasAccount = !isKid && i !== 17;
    const birthYear = isKid ? int(2014, 2019) : int(1985, 2005);

    students.push({
      id,
      name,
      email,
      phone: `(85) 9${int(8100, 9899)}-${int(1000, 9999)}`,
      birthDate: `${birthYear}-${String(int(1, 12)).padStart(2, '0')}-${String(int(1, 28)).padStart(2, '0')}`,
      photo: photoIdx === null ? null : `https://randomuser.me/api/portraits/${g === 'm' ? 'men' : 'women'}/${photoIdx}.jpg`,
      belt,
      degree,
      role: 'aluno',
      planId,
      dueDate,
      active: scenario !== 'inactive',
      joinedAt,
      weeklyGoal: isKid ? 2 : Math.max(2, Math.min(5, freq)),
      hasAccount,
    });
    if (hasAccount) accounts.push({ email, password: '123456', studentId: id, provider: 'email' });

    // Pagamentos: anda para trás a partir do vencimento atual
    let end = dueDate;
    for (let k = 0; k < 8; k++) {
      const start = addMonths(end, -plan.months);
      const payDate = addDays(start, -int(0, 3));
      if (diffDays(joinedAt, payDate) < -5 || diffDays(payDate, today) < 0 || diffDays(payDate, today) > 220) {
        if (diffDays(payDate, today) < 0) {
          end = start;
          continue;
        }
        break;
      }
      payments.push({
        id: `p${id}-${k}`,
        studentId: id,
        planId,
        amount: plan.price,
        method: pick(methods),
        date: payDate,
        periodStart: start,
        periodEnd: end,
      });
      end = start;
    }

    // Graduações: último grau/faixa recebido
    const lastGrad = addDays(today, -int(20, 300));
    if (belt !== 'branca' || degree > 0) {
      let fromBelt = belt;
      let fromDegree = degree - 1;
      if (degree === 0) {
        const order: BeltId[] = isKid ? ['branca', 'cinza', 'amarela', 'laranja', 'verde'] : ['branca', 'azul', 'roxa', 'marrom', 'preta'];
        fromBelt = order[Math.max(0, order.indexOf(belt) - 1)];
        fromDegree = 4;
      }
      graduations.push({ id: `g${id}`, studentId: id, fromBelt, fromDegree, toBelt: belt, toDegree: degree, date: lastGrad });
      if (degree >= 2 && r() > 0.4) {
        graduations.push({
          id: `g${id}b`,
          studentId: id,
          fromBelt: belt,
          fromDegree: degree - 2,
          toBelt: belt,
          toDegree: degree - 1,
          date: addDays(lastGrad, -int(120, 220)),
        });
      }
    }

    // Check-ins
    if (freq === 0 && scenario !== 'inactive') return;
    const myClasses = isKid
      ? ['c3']
      : [...new Set([pick(['c1', 'c2']), 'c4', pick(['c2', 'c4', 'c6', 'c7']), g === 'f' ? 'c5' : pick(['c6', 'c7', 'c1'])])];
    const sessionsPerWeek = CLASSES.filter((c) => myClasses.includes(c.id)).reduce((n, c) => n + c.days.length, 0);
    const realFreq = scenario === 'inactive' ? 2 : freq;
    const p = Math.min(0.92, realFreq / sessionsPerWeek);
    const from = Math.max(-120, diffDays(today, joinedAt));
    const stopAt = scenario === 'inactive' ? -int(55, 80) : 0;
    for (let d = from; d <= stopAt; d++) {
      const date = addDays(today, d);
      const wd = weekday(date);
      for (const c of CLASSES) {
        if (!myClasses.includes(c.id) || !c.days.includes(wd)) continue;
        if (d === 0 && timeToMin(c.time) > nowMin) continue;
        // hoje um pouco mais cheio, para a chamada do dia ter movimento
        if (r() > (d === 0 ? Math.min(0.95, p * 2.2) : p)) continue;
        const t = timeToMin(c.time) - int(-5, 25);
        checkins.push({
          id: `k${id}-${d}-${c.id}`,
          studentId: id,
          classId: c.id,
          date,
          time: `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`,
          source: r() > 0.18 ? 'app' : 'professor',
        });
      }
    }
  });

  // Uma graduação extra recente para o histórico ficar vivo
  const lucas = students.find((s) => s.id === 's1')!;
  const step = nextStep('azul', 1);
  graduations.push({ id: 'g-recent', studentId: lucas.id, fromBelt: 'azul', fromDegree: 1, toBelt: step.belt, toDegree: step.degree, date: addDays(today, -9), note: 'Ótima evolução na guarda.' });
  graduations.sort((a, b) => b.date.localeCompare(a.date));
  // garante que a graduação gerada para s1 não conflite com a recente
  const dup = graduations.findIndex((g) => g.studentId === 's1' && g.id !== 'g-recent' && g.toDegree === 2 && g.toBelt === 'azul');
  if (dup >= 0) graduations.splice(dup, 1);

  const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();
  const notices: Notice[] = [
    {
      id: 'n1',
      title: 'Seminário de passagem de guarda',
      body: 'No próximo sábado, depois do Open Mat, teremos seminário com faixa-preta convidado. Vagas limitadas — confirme com o professor.',
      pinned: true,
      notify: true,
      createdAt: hoursAgo(30),
    },
    {
      id: 'n2',
      title: 'Feriado de Finados (02/11)',
      body: 'A academia estará fechada na segunda-feira, dia 2. O Open Mat de sábado acontece normalmente.',
      pinned: false,
      notify: true,
      createdAt: hoursAgo(20),
    },
    {
      id: 'n3',
      title: 'Time Pro às segundas e quartas',
      body: 'O Time Pro agora treina às 20h30, logo depois da turma da noite. Tragam sapatilha e garrafinha!',
      pinned: false,
      createdAt: hoursAgo(24 * 6),
    },
    {
      id: 'n4',
      title: 'Graduação de fim de ano',
      body: 'Nossa cerimônia de graduação será em dezembro. Fique de olho na sua frequência e na sua meta semanal.',
      pinned: false,
      notify: true,
      createdAt: hoursAgo(24 * 12),
    },
  ];

  return {
    students,
    plans: PLANS,
    classes: CLASSES,
    checkins,
    payments: payments.sort((a, b) => b.date.localeCompare(a.date)),
    graduations,
    notices,
    accounts,
    closedSessions: [],
    demoTime: null,
    // alguns alunos já ativaram notificações no celular
    pushOptIn: [...DEMO_PUSH_OPT_IN],
    // um aluno atrasado avisou pelo app que pagou o PIX
    pixClaims: [{ id: 'x1', studentId: 's5', planId: 'mensal', amount: 180, createdAt: hoursAgo(3) }],
  };
}
