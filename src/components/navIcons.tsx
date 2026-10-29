import clsx from 'clsx';
import type { ReactNode } from 'react';

/*
 * Ícones do menu com partes animadas (estilo traço do Lucide).
 * A animação dispara no hover do item pai (classe "group"); as regras ficam em index.css (.ni-*).
 */

export type NavIconProps = { className?: string; strokeWidth?: number };

function Svg({ className, strokeWidth = 1.8, kind, children }: NavIconProps & { kind: string; children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      overflow="visible"
      aria-hidden
      className={clsx('ni', `ni-${kind}`, className)}
    >
      {children}
    </svg>
  );
}

/** Visão geral: os quatro blocos "respiram" em sequência */
export const GridIcon = (p: NavIconProps) => (
  <Svg {...p} kind="grid">
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
  </Svg>
);

/** Chamada: o prendedor sobe e o check se desenha */
export const AttendanceIcon = (p: NavIconProps) => (
  <Svg {...p} kind="attendance">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect className="ni-clip" x="8" y="2" width="8" height="4" rx="1" />
    <path className="ni-draw" pathLength={1} d="m9 14 2 2 4-4" />
  </Svg>
);

/** Alunos: a pessoa da frente acena com a cabeça e a de trás dá um passo */
export const StudentsIcon = (p: NavIconProps) => (
  <Svg {...p} kind="students">
    <g className="ni-back">
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </g>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle className="ni-head" cx="9" cy="7" r="4" />
  </Svg>
);

/** Grade: as argolas pulam e os dias acendem um a um */
export const ScheduleIcon = (p: NavIconProps) => (
  <Svg {...p} kind="schedule">
    <path className="ni-ring" d="M8 2v4" />
    <path className="ni-ring" d="M16 2v4" />
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M3 10h18" />
    <path className="ni-dot" d="M8 14h.01" />
    <path className="ni-dot" d="M12 14h.01" />
    <path className="ni-dot" d="M16 14h.01" />
    <path className="ni-dot" d="M8 18h.01" />
    <path className="ni-dot" d="M12 18h.01" />
    <path className="ni-dot" d="M16 18h.01" />
  </Svg>
);

/** Graduação: a taça balança e solta um brilho */
export const TrophyIcon = (p: NavIconProps) => (
  <Svg {...p} kind="trophy">
    <g className="ni-cup">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </g>
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M4 22h16" />
    <path className="ni-spark" d="M21.5 -1.5v3M20 0h3" strokeWidth={1.6} />
  </Svg>
);

/** Financeiro: uma moeda sobe de dentro da carteira */
export const WalletIcon = (p: NavIconProps) => (
  <Svg {...p} kind="wallet">
    <circle className="ni-coin" cx="12" cy="5.5" r="2.5" />
    <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
    <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
  </Svg>
);

/** Mural: o megafone inclina e saem ondas de som */
export const NoticesIcon = (p: NavIconProps) => (
  <Svg {...p} kind="notices">
    <g className="ni-horn">
      <path d="m3 11 15-5v12L3 14v-3z" />
      <path d="M10.6 16.6a3 3 0 1 1-5.8-1.6" />
    </g>
    <path className="ni-wave" d="M21 10a2.5 2.5 0 0 1 0 4" />
    <path className="ni-wave" d="M23 8a5.5 5.5 0 0 1 0 8" />
  </Svg>
);

/** App do aluno: o celular vibra */
export const PhoneIcon = (p: NavIconProps) => (
  <Svg {...p} kind="phone">
    <g className="ni-handset">
      <rect x="6" y="2" width="12" height="20" rx="2" />
      <path d="M12 18h.01" />
    </g>
    <path className="ni-vib" d="M2.5 9v6" />
    <path className="ni-vib" d="M21.5 9v6" />
  </Svg>
);

/** Sair: a seta sai pela porta */
export const LogoutIcon = (p: NavIconProps) => (
  <Svg {...p} kind="logout">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <g className="ni-arrow">
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </g>
  </Svg>
);
