import { useState } from 'react';
import clsx from 'clsx';
import logoUrl from '../assets/logo.png';
import { belt as beltDef, maxDegree, modality as modalityDef } from '../lib/belts';
import { STATUS_META } from '../lib/selectors';
import type { BeltId, Modality, StudentStatus } from '../lib/types';
import { Pill } from './ui';

export { logoUrl };

/* ---------------- Logo ---------------- */

export function Logo({ size = 40, className }: { size?: number; className?: string }) {
  return <img src={logoUrl} alt="Easy Wrestling" width={size} height={size} className={clsx('shrink-0 rounded-full object-cover', className)} style={{ width: size, height: size }} />;
}

/* ---------------- Avatar ---------------- */



export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function Avatar({ name, src, size = 40, ring, className }: { name: string; src?: string | null; size?: number; ring?: 'brand' | 'white' | 'line'; className?: string }) {
  const [failed, setFailed] = useState(false);
  const ringCls = ring === 'brand' ? 'ring-2 ring-brand-500 ring-offset-2' : ring === 'white' ? 'ring-2 ring-white' : ring === 'line' ? 'ring-1 ring-line' : '';
  const style = { width: size, height: size, fontSize: Math.max(10, size * 0.36) };
  if (src && !failed) {
    return <img src={src} alt={name} onError={() => setFailed(true)} className={clsx('shrink-0 rounded-full object-cover', ringCls, className)} style={style} />;
  }
  return (
    <span className={clsx('inline-grid shrink-0 place-items-center rounded-full bg-paper-2 font-display font-semibold text-ink-2', ringCls, className)} style={style} aria-label={name}>
      {initials(name)}
    </span>
  );
}

/* ---------------- Faixa ---------------- */

/** Faixa desenhada: cor da faixa + ponteira com os graus */
export function BeltBar({ belt, degree, className, height = 10 }: { belt: BeltId; degree: number; className?: string; height?: number }) {
  const def = beltDef(belt);
  const slots = maxDegree(belt);
  // graus como fitas brancas na ponteira (tamanho proporcional à altura da faixa)
  const stripe = Math.max(2, Math.round(height * 0.3));
  const stripeGap = Math.max(1, Math.round(height * 0.22));
  return (
    <span
      className={clsx('relative flex overflow-hidden rounded-[3px] shadow-[inset_0_0_0_1px_rgb(12_26_51/0.14)]', className)}
      style={{ height, background: def.color }}
      aria-label={`Faixa ${def.label}, ${degree} grau(s)`}
    >
      <span className="ml-auto flex h-full items-stretch justify-center" style={{ background: def.tip, width: `${18 + slots * 5}%`, gap: stripeGap, minWidth: slots * (stripe + stripeGap) + 4 }}>
        {Array.from({ length: slots }, (_, i) => (
          <span key={i} className={clsx('shrink-0 rounded-[1px]', i < degree ? 'bg-white' : 'bg-white/0')} style={{ width: stripe }} />
        ))}
      </span>
      
    </span>
  );
}

export function BeltDot({ belt, size = 10 }: { belt: BeltId; size?: number }) {
  return <span className="inline-block shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgb(12_26_51/0.18)]" style={{ width: size, height: size, background: beltDef(belt).color }} />;
}

export function BeltTag({ belt, degree, compact }: { belt: BeltId; degree: number; compact?: boolean }) {
  const def = beltDef(belt);
  return (
    <span className="inline-flex flex-col gap-1">
      <BeltBar belt={belt} degree={degree} className={compact ? 'w-20' : 'w-24'} height={compact ? 8 : 10} />
      <span className="text-[11px] font-medium text-muted">
        {def.label} · {degree === 0 ? 'sem grau' : `${degree}º grau`}
      </span>
    </span>
  );
}

/* ---------------- Status / modalidade ---------------- */

export function StatusPill({ status }: { status: StudentStatus }) {
  const m = STATUS_META[status];
  return (
    <Pill className={m.cls} dot={m.dot}>
      {m.label}
    </Pill>
  );
}

export function ModalityTag({ modality, className }: { modality: Modality; className?: string }) {
  const m = modalityDef(modality);
  return (
    <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold', className)} style={{ background: m.soft, color: m.text }}>
      <span className="size-1.5 rounded-full" style={{ background: m.solid }} />
      {m.label}
    </span>
  );
}
