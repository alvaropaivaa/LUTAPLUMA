import type { BeltId, Modality, PayMethod } from './types';

export interface BeltDef {
  id: BeltId;
  label: string;
  color: string;
  /** Cor da ponteira onde ficam os graus */
  tip: string;
  kids: boolean;
}

export const BELTS: BeltDef[] = [
  { id: 'branca', label: 'Branca', color: '#F3F1EA', tip: '#141821', kids: false },
  { id: 'cinza', label: 'Cinza', color: '#A3A9B4', tip: '#141821', kids: true },
  { id: 'amarela', label: 'Amarela', color: '#F5C518', tip: '#141821', kids: true },
  { id: 'laranja', label: 'Laranja', color: '#F57C1F', tip: '#141821', kids: true },
  { id: 'verde', label: 'Verde', color: '#1E9E55', tip: '#141821', kids: true },
  { id: 'azul', label: 'Azul', color: '#1F5FD6', tip: '#141821', kids: false },
  { id: 'roxa', label: 'Roxa', color: '#6D35C9', tip: '#141821', kids: false },
  { id: 'marrom', label: 'Marrom', color: '#6B4226', tip: '#141821', kids: false },
  { id: 'preta', label: 'Preta', color: '#16181D', tip: '#D62F2F', kids: false },
];

const BY_ID = Object.fromEntries(BELTS.map((b, i) => [b.id, { ...b, index: i }])) as Record<BeltId, BeltDef & { index: number }>;

export const belt = (id: BeltId) => BY_ID[id];
export const maxDegree = (id: BeltId) => (id === 'preta' ? 6 : 4);
export const beltRank = (id: BeltId, degree: number) => BY_ID[id].index * 10 + degree;
export const isDemotion = (from: { belt: BeltId; degree: number }, to: { belt: BeltId; degree: number }) =>
  beltRank(to.belt, to.degree) < beltRank(from.belt, from.degree);

export function degreeLabel(degree: number): string {
  return degree === 0 ? 'Sem grau' : `${degree}º grau`;
}

export function beltLabel(id: BeltId, degree: number): string {
  return `${BY_ID[id].label} · ${degreeLabel(degree)}`;
}

/** Próximo passo natural: +1 grau, ou próxima faixa adulta ao completar os graus */
export function nextStep(id: BeltId, degree: number): { belt: BeltId; degree: number } {
  if (degree < maxDegree(id)) return { belt: id, degree: degree + 1 };
  const def = BY_ID[id];
  const pool = BELTS.filter((b) => b.kids === def.kids || b.id === 'azul');
  const after = pool.find((b) => BY_ID[b.id].index > def.index);
  return after ? { belt: after.id, degree: 0 } : { belt: id, degree };
}

export interface ModalityDef {
  id: Modality;
  label: string;
  /** cor sólida (pontos, bordas) */
  solid: string;
  /** fundo suave */
  soft: string;
  /** texto sobre o fundo suave */
  text: string;
}

export const MODALITIES: ModalityDef[] = [
  { id: 'gi', label: 'Wrestling', solid: '#F2701C', soft: '#FFF1E5', text: '#B4470D' },
  { id: 'nogi', label: 'Grappling', solid: '#2F6FE4', soft: '#EBF2FF', text: '#1F4FB0' },
  { id: 'wrestling', label: 'Time Pro', solid: '#7A45D8', soft: '#F3EDFE', text: '#5B2EAF' },
  { id: 'kids', label: 'Kids', solid: '#1E9E55', soft: '#E7F6EC', text: '#157A41' },
  { id: 'openmat', label: 'Open Mat', solid: '#0C2150', soft: '#E9EDF6', text: '#0C2150' },
];

const MOD_BY_ID = Object.fromEntries(MODALITIES.map((m) => [m.id, m])) as Record<Modality, ModalityDef>;
export const modality = (id: Modality) => MOD_BY_ID[id];

export const PAY_METHODS: { id: PayMethod; label: string }[] = [
  { id: 'pix', label: 'Pix' },
  { id: 'cartao', label: 'Cartão' },
  { id: 'dinheiro', label: 'Dinheiro' },
  { id: 'boleto', label: 'Boleto' },
];

export const payMethodLabel = (m: PayMethod) => PAY_METHODS.find((p) => p.id === m)?.label ?? m;

export const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });

export const brlShort = (v: number) =>
  v >= 1000 ? `R$ ${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : brl(v);

/** Moeda sem centavos, para números grandes em cartões */
export const brlInt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
