import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { addDays, addMonths, diffDays, nowTime, timeToMin, todayISO } from './dates';
import { DEFAULT_PLAN_ID, DEMO_PUSH_OPT_IN, emptyDB, seedDB } from './seed';
import { canCheckIn, sessionKey } from './selectors';
import { isDemotion } from './belts';
import type { BeltId, ClassItem, DB, PayMethod, Role, Student } from './types';

const DB_KEY = 'easy-wrestling:db:v1';
const SESSION_KEY = 'easy-wrestling:session';

/** Na prévia do app do aluno (dentro do painel) o professor visualiza como um aluno específico */
const previewAs = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('as') : null;

function load(): DB | null {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as DB;
    // turmas de exemplo da versão antiga (Jiu-Jitsu) ganham os nomes de wrestling
    const renamed: Record<string, [string, string]> = {
      c1: ['Jiu-Jitsu Gi', 'Wrestling Fundamentos'],
      c2: ['Jiu-Jitsu Gi', 'Wrestling'],
      c4: ['Jiu-Jitsu No-Gi', 'Wrestling + Grappling'],
      c5: ['Feminino', 'Wrestling Feminino'],
      c6: ['Wrestling', 'Time Pro'],
    };
    const classes = d.classes.map((c) => (renamed[c.id] && c.name === renamed[c.id][0] ? { ...c, name: renamed[c.id][1] } : c));
    // dados salvos antes das notificações: usa os alunos de exemplo que existirem
    return { ...d, classes, pushOptIn: d.pushOptIn ?? DEMO_PUSH_OPT_IN.filter((id) => d.students.some((s) => s.id === id)), pixClaims: d.pixClaims ?? [] };
  } catch {
    return null;
  }
}

export const uid = (prefix: string) => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

type Result<T = void> = { ok: true; value: T } | { ok: false; error: string };
const ok = <T,>(value: T): Result<T> => ({ ok: true, value });
const fail = (error: string): Result<never> => ({ ok: false, error });

export type StudentInput = Omit<Student, 'id' | 'role' | 'hasAccount' | 'joinedAt'> & { joinedAt?: string };

function useStoreValue() {
  const [db, setDb] = useState<DB>(() => load() ?? seedDB());
  const [sessionId, setSessionId] = useState<string | null>(() => localStorage.getItem(SESSION_KEY));

  useEffect(() => {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(db));
    } catch {
      /* fotos grandes podem estourar a cota; ignora */
    }
  }, [db]);

  // Sincroniza abas/iframe (ex.: prévia do app dentro do painel)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === DB_KEY && e.newValue) setDb(JSON.parse(e.newValue));
      if (e.key === SESSION_KEY) setSessionId(e.newValue);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const update = useCallback((fn: (d: DB) => DB) => setDb((d) => fn(d)), []);

  const setSession = useCallback((id: string | null) => {
    if (id) localStorage.setItem(SESSION_KEY, id);
    else localStorage.removeItem(SESSION_KEY);
    setSessionId(id);
  }, []);

  const me = db.students.find((s) => s.id === sessionId) ?? null;
  const viewer = previewAs && me?.role === 'professor' ? (db.students.find((s) => s.id === previewAs) ?? me) : me;

  // ---------- Autenticação (simulada) ----------
  const login = (email: string, password: string): Result<Role> => {
    const acc = db.accounts.find((a) => a.email.toLowerCase() === email.trim().toLowerCase());
    if (!acc) return fail('Não encontramos uma conta com esse e-mail.');
    if (acc.provider === 'google' && !acc.password) return fail('Essa conta usa login com Google.');
    if (acc.password !== password) return fail('Senha incorreta. Tente novamente.');
    const s = db.students.find((x) => x.id === acc.studentId);
    if (!s) return fail('Conta sem cadastro vinculado.');
    setSession(s.id);
    return ok(s.role);
  };

  const signUp = (input: { name: string; email: string; password: string; provider: 'email' | 'google'; photo?: string | null }): Result<Role> => {
    const email = input.email.trim().toLowerCase();
    if (db.accounts.some((a) => a.email.toLowerCase() === email)) return fail('Já existe uma conta com esse e-mail.');
    const today = todayISO();
    const hasProfessor = db.students.some((s) => s.role === 'professor');
    // Aluno cadastrado pelo professor sem conta: vincula pelo e-mail
    const existing = db.students.find((s) => s.email.toLowerCase() === email && !s.hasAccount);
    let student: Student;
    if (existing) {
      student = { ...existing, hasAccount: true, photo: existing.photo ?? input.photo ?? null };
    } else {
      const role: Role = hasProfessor ? 'aluno' : 'professor';
      student = {
        id: uid('s'),
        name: input.name.trim(),
        email,
        phone: '',
        birthDate: '',
        photo: input.photo ?? null,
        belt: 'branca',
        degree: 0,
        role,
        planId: role === 'aluno' ? DEFAULT_PLAN_ID : null,
        dueDate: role === 'aluno' ? addDays(today, 7) : null,
        active: true,
        joinedAt: today,
        weeklyGoal: 3,
        hasAccount: true,
      };
    }
    update((d) => ({
      ...d,
      students: existing ? d.students.map((s) => (s.id === existing.id ? student : s)) : [...d.students, student],
      accounts: [...d.accounts, { email, password: input.password, studentId: student.id, provider: input.provider }],
    }));
    setSession(student.id);
    return ok(student.role);
  };

  const loginWithGoogle = (email: string, name: string): Result<Role> => {
    const acc = db.accounts.find((a) => a.email.toLowerCase() === email.trim().toLowerCase());
    if (acc) {
      const s = db.students.find((x) => x.id === acc.studentId);
      if (!s) return fail('Conta sem cadastro vinculado.');
      setSession(s.id);
      return ok(s.role);
    }
    return signUp({ name, email, password: '', provider: 'google' });
  };

  const logout = () => setSession(null);

  // ---------- Alunos ----------
  const addStudent = (input: StudentInput): Student => {
    const s: Student = { ...input, id: uid('s'), role: 'aluno', hasAccount: false, joinedAt: input.joinedAt ?? todayISO() };
    update((d) => ({ ...d, students: [...d.students, s] }));
    return s;
  };

  const updateStudent = (id: string, patch: Partial<Student>) =>
    update((d) => ({ ...d, students: d.students.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));

  // ---------- Graduação (com proteção contra rebaixamento) ----------
  const promote = (studentId: string, to: { belt: BeltId; degree: number }, opts: { note?: string; date?: string; allowDemotion?: boolean } = {}): Result => {
    const s = db.students.find((x) => x.id === studentId);
    if (!s) return fail('Aluno não encontrado.');
    if (s.belt === to.belt && s.degree === to.degree) return fail('O aluno já está nessa faixa e grau.');
    if (isDemotion(s, to) && !opts.allowDemotion) return fail('Rebaixamento bloqueado. Confirme explicitamente para continuar.');
    update((d) => ({
      ...d,
      students: d.students.map((x) => (x.id === studentId ? { ...x, belt: to.belt, degree: to.degree } : x)),
      graduations: [
        { id: uid('g'), studentId, fromBelt: s.belt, fromDegree: s.degree, toBelt: to.belt, toDegree: to.degree, date: opts.date ?? todayISO(), note: opts.note },
        ...d.graduations,
      ],
    }));
    return ok(undefined);
  };

  // ---------- Check-in ----------
  const now = () => {
    const today = todayISO();
    const time = db.demoTime ?? nowTime();
    return { today, time, nowMin: timeToMin(time) };
  };

  const studentCheckIn = (studentId: string, classId: string): Result => {
    const s = db.students.find((x) => x.id === studentId);
    const c = db.classes.find((x) => x.id === classId);
    if (!s || !c) return fail('Aula não encontrada.');
    const { today, time, nowMin } = now();
    const check = canCheckIn(db, s, c, today, today, nowMin);
    if (!check.ok) return fail(check.reason!);
    update((d) => ({ ...d, checkins: [...d.checkins, { id: uid('k'), studentId, classId, date: today, time, source: 'app' }] }));
    return ok(undefined);
  };

  /** Chamada do professor: marca/desmarca presença manualmente */
  const togglePresence = (studentId: string, classId: string, date: string) => {
    update((d) => {
      const existing = d.checkins.find((k) => k.studentId === studentId && k.classId === classId && k.date === date);
      if (existing) return { ...d, checkins: d.checkins.filter((k) => k !== existing) };
      const cls = d.classes.find((c) => c.id === classId);
      const time = date === todayISO() ? (d.demoTime ?? nowTime()) : (cls?.time ?? '00:00');
      return { ...d, checkins: [...d.checkins, { id: uid('k'), studentId, classId, date, time, source: 'professor' }] };
    });
  };

  const setSessionClosed = (date: string, classId: string, closed: boolean) => {
    const key = sessionKey(date, classId);
    update((d) => ({ ...d, closedSessions: closed ? [...new Set([...d.closedSessions, key])] : d.closedSessions.filter((k) => k !== key) }));
  };

  // ---------- Grade de aulas ----------
  const saveClass = (c: Omit<ClassItem, 'id'> & { id?: string }) => {
    update((d) => {
      if (c.id) return { ...d, classes: d.classes.map((x) => (x.id === c.id ? ({ ...x, ...c } as ClassItem) : x)) };
      return { ...d, classes: [...d.classes, { ...c, id: uid('c') }] };
    });
  };
  const deleteClass = (id: string) => update((d) => ({ ...d, classes: d.classes.filter((c) => c.id !== id) }));

  // ---------- Financeiro ----------
  const registerPayment = (input: { studentId: string; planId: string; amount: number; method: PayMethod; date: string }): Result<string> => {
    const s = db.students.find((x) => x.id === input.studentId);
    const plan = db.plans.find((p) => p.id === input.planId);
    if (!s || !plan) return fail('Selecione aluno e plano.');
    // Renovação: se ainda está em dia, estende a partir do vencimento atual; senão, a partir do pagamento
    const start = s.dueDate && diffDays(input.date, s.dueDate) >= 0 ? s.dueDate : input.date;
    const end = addMonths(start, plan.months);
    update((d) => ({
      ...d,
      payments: [{ id: uid('p'), ...input, periodStart: start, periodEnd: end }, ...d.payments],
      students: d.students.map((x) => (x.id === s.id ? { ...x, planId: plan.id, dueDate: end, active: true } : x)),
      // pagamento registrado resolve o PIX que o aluno tinha avisado
      pixClaims: d.pixClaims.filter((c) => c.studentId !== s.id),
    }));
    return ok(end);
  };

  /** Aluno avisa pelo app que pagou o PIX (um aviso por aluno; o novo substitui o anterior) */
  const claimPix = (studentId: string, planId: string): Result => {
    const plan = db.plans.find((p) => p.id === planId);
    if (!plan) return fail('Plano não encontrado.');
    const claim = { id: uid('x'), studentId, planId, amount: plan.price, createdAt: new Date().toISOString() };
    update((d) => ({ ...d, pixClaims: [...d.pixClaims.filter((c) => c.studentId !== studentId), claim] }));
    return ok(undefined);
  };
  const confirmPixClaim = (id: string): Result<string> => {
    const c = db.pixClaims.find((x) => x.id === id);
    if (!c) return fail('Aviso de PIX não encontrado.');
    return registerPayment({ studentId: c.studentId, planId: c.planId, amount: c.amount, method: 'pix', date: todayISO() });
  };
  const dismissPixClaim = (id: string) => update((d) => ({ ...d, pixClaims: d.pixClaims.filter((x) => x.id !== id) }));

  // ---------- Mural ----------
  const addNotice = (title: string, body: string, pinned: boolean, notify = true) =>
    update((d) => ({ ...d, notices: [{ id: uid('n'), title, body, pinned, notify, createdAt: new Date().toISOString() }, ...d.notices] }));
  /** Aluno ativou/desativou notificações no celular */
  const setPushOptIn = (studentId: string, on: boolean) =>
    update((d) => ({ ...d, pushOptIn: on ? [...new Set([...d.pushOptIn, studentId])] : d.pushOptIn.filter((id) => id !== studentId) }));
  const togglePin = (id: string) => update((d) => ({ ...d, notices: d.notices.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n)) }));
  const deleteNotice = (id: string) => update((d) => ({ ...d, notices: d.notices.filter((n) => n.id !== id) }));

  // ---------- Demonstração ----------
  const setDemoTime = (t: string | null) => update((d) => ({ ...d, demoTime: t }));
  const resetDemo = () => {
    setDb(seedDB());
  };
  const startEmpty = () => {
    setDb(emptyDB());
    setSession(null);
  };

  return {
    db,
    me,
    viewer,
    isPreview: Boolean(previewAs && me?.role === 'professor'),
    now,
    login,
    signUp,
    loginWithGoogle,
    logout,
    addStudent,
    updateStudent,
    promote,
    studentCheckIn,
    togglePresence,
    setSessionClosed,
    saveClass,
    deleteClass,
    registerPayment,
    claimPix,
    confirmPixClaim,
    dismissPixClaim,
    addNotice,
    setPushOptIn,
    togglePin,
    deleteNotice,
    setDemoTime,
    resetDemo,
    startEmpty,
  };
}

export type Store = ReturnType<typeof useStoreValue>;
const StoreCtx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const value = useStoreValue();
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore(): Store {
  const s = useContext(StoreCtx);
  if (!s) throw new Error('useStore fora do StoreProvider');
  return s;
}

/** Data/hora atual, respeitando o relógio de demonstração; atualiza a cada 20s */
export function useNow() {
  const { db } = useStore();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 20_000);
    return () => clearInterval(id);
  }, []);
  return useMemo(() => {
    const today = todayISO();
    const time = db.demoTime ?? nowTime();
    return { today, time, nowMin: timeToMin(time), isDemo: db.demoTime !== null };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db.demoTime, tick]);
}
