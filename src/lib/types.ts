export type Role = 'professor' | 'aluno';
export type BeltId = 'branca' | 'cinza' | 'amarela' | 'laranja' | 'verde' | 'azul' | 'roxa' | 'marrom' | 'preta';
export type Modality = 'gi' | 'nogi' | 'kids' | 'wrestling' | 'openmat';
export type PayMethod = 'pix' | 'cartao' | 'dinheiro' | 'boleto';
export type CheckinSource = 'app' | 'professor';

export interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  photo: string | null;
  belt: BeltId;
  degree: number;
  role: Role;
  planId: string | null;
  dueDate: string | null;
  active: boolean;
  joinedAt: string;
  weeklyGoal: number;
  hasAccount: boolean;
  notes?: string;
}

export interface Plan {
  id: string;
  name: string;
  months: number;
  price: number;
}

export interface ClassItem {
  id: string;
  name: string;
  modality: Modality;
  days: number[]; // 0 = domingo ... 6 = sábado
  time: string; // HH:MM
  duration: number; // minutos
  professor: string;
  capacity: number;
  active: boolean;
}

export interface CheckIn {
  id: string;
  studentId: string;
  classId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  source: CheckinSource;
}

export interface Payment {
  id: string;
  studentId: string;
  planId: string;
  amount: number;
  method: PayMethod;
  date: string;
  periodStart: string;
  periodEnd: string;
}

export interface Graduation {
  id: string;
  studentId: string;
  fromBelt: BeltId;
  fromDegree: number;
  toBelt: BeltId;
  toDegree: number;
  date: string;
  note?: string;
}

export interface Notice {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: string; // ISO datetime
  /** Enviado como notificação para os celulares com notificações ativadas */
  notify?: boolean;
}

/** PIX que o aluno avisou ter feito pelo app; a academia confere e confirma no painel */
export interface PixClaim {
  id: string;
  studentId: string;
  planId: string;
  amount: number;
  createdAt: string; // ISO datetime
}

export interface Account {
  email: string;
  password: string;
  studentId: string;
  provider: 'email' | 'google';
}

export interface DB {
  students: Student[];
  plans: Plan[];
  classes: ClassItem[];
  checkins: CheckIn[];
  payments: Payment[];
  graduations: Graduation[];
  notices: Notice[];
  accounts: Account[];
  /** Chamadas encerradas manualmente pelo professor: chave "data|classId" */
  closedSessions: string[];
  /** Relógio de demonstração (HH:MM). null = horário real. */
  demoTime: string | null;
  /** Alunos que ativaram notificações no app do celular */
  pushOptIn: string[];
  /** PIX informados pelos alunos, aguardando confirmação */
  pixClaims: PixClaim[];
}

export type StudentStatus = 'em-dia' | 'vence-logo' | 'atrasado' | 'inativo' | 'sem-plano';
export type SessionStatus = 'agendada' | 'aberta' | 'encerrada';
