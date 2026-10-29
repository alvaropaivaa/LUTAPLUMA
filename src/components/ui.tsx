import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { AlertTriangle, CheckCircle2, Info, X, type LucideIcon } from 'lucide-react';

/* ---------------- Botões ---------------- */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'navy';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-500 text-white shadow-(--shadow-brand) hover:bg-brand-600 active:bg-brand-700 disabled:bg-brand-200 disabled:shadow-none',
  secondary: 'bg-white text-ink ring-1 ring-line hover:bg-paper disabled:text-faint',
  ghost: 'text-ink-2 hover:bg-paper-2 hover:text-ink disabled:text-faint',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-300',
  navy: 'bg-navy-900 text-white hover:bg-navy-800 disabled:bg-navy-300',
};
const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3.5 text-xs gap-1.5 rounded-full',
  md: 'h-10 px-4 text-sm gap-2 rounded-full',
  lg: 'h-11 px-5 text-sm gap-2 rounded-full',
};

export function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; icon?: LucideIcon; iconRight?: LucideIcon }) {
  return (
    <button
      {...rest}
      className={clsx(
        'inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition duration-150 select-none focus-visible:ring-4 focus-visible:ring-brand-200 focus-visible:outline-none',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
    >
      {Icon && <Icon className={size === 'sm' ? 'size-3.5' : size === 'lg' ? 'size-[18px]' : 'size-4'} strokeWidth={2.2} />}
      {children}
      {IconRight && <IconRight className={size === 'sm' ? 'size-3.5' : 'size-4'} strokeWidth={2.2} />}
    </button>
  );
}

export function IconButton({
  icon: Icon,
  label,
  className,
  tone = 'default',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon: LucideIcon; label: string; tone?: 'default' | 'danger' | 'brand' }) {
  return (
    <button
      aria-label={label}
      title={label}
      {...rest}
      className={clsx(
        'inline-flex size-9 shrink-0 items-center justify-center rounded-xl transition focus-visible:ring-4 focus-visible:ring-brand-200 focus-visible:outline-none',
        tone === 'default' && 'text-muted hover:bg-paper-2 hover:text-ink',
        tone === 'danger' && 'text-muted hover:bg-rose-50 hover:text-rose-600',
        tone === 'brand' && 'text-brand-600 hover:bg-brand-50',
        className,
      )}
    >
      <Icon className="size-[18px]" strokeWidth={2} />
    </button>
  );
}

/* ---------------- Superfícies ---------------- */

export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} className={clsx('card', className)}>
      {children}
    </div>
  );
}

export function CardHeader({
  icon: Icon,
  title,
  subtitle,
  action,
  tone = 'brand',
}: {
  icon?: LucideIcon;
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  tone?: 'brand' | 'navy' | 'green' | 'red' | 'violet';
}) {
  const tones = {
    brand: 'bg-brand-50 text-brand-500',
    navy: 'bg-paper-2 text-ink-2',
    green: 'bg-emerald-50 text-emerald-600',
    red: 'bg-rose-50 text-rose-500',
    violet: 'bg-violet-50 text-violet-600',
  };
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        {Icon && (
          <span className={clsx('grid size-9 shrink-0 place-items-center rounded-full', tones[tone])}>
            <Icon className="size-4" strokeWidth={2} />
          </span>
        )}
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold text-ink">{title}</h3>
          {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

/** O layout do painel recebe daqui onde a faixa azul termina (logo abaixo do cabeçalho da página) */
export const BandCtx = createContext<((px: number) => void) | null>(null);

/** Quanto a faixa azul avança sobre a primeira linha de cartões, abaixo do cabeçalho */
const BAND_OVERLAP = 72;

export function PageHeader({ eyebrow, title, subtitle, actions, meta, dot = true }: { eyebrow?: ReactNode; title: string; subtitle?: ReactNode; actions?: ReactNode; meta?: ReactNode; dot?: boolean }) {
  const setBand = useContext(BandCtx);
  const ref = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    const main = el?.closest('main');
    if (!el || !main || !setBand) return;
    // soma os offsets até o <main> (não é afetado pela animação de entrada)
    const update = () => {
      let y = el.offsetTop + el.offsetHeight;
      let p = el.offsetParent as HTMLElement | null;
      while (p && p !== main) {
        y += p.offsetTop;
        p = p.offsetParent as HTMLElement | null;
      }
      setBand(y + BAND_OVERLAP);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [setBand]);

  return (
    <header ref={ref} className="mb-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-5 text-white animate-fade-in sm:min-h-[96px]">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1 flex items-center gap-2 text-[13px] text-white/60">{eyebrow}</div>}
        <h1 className="font-display text-[26px] leading-tight font-semibold tracking-tight sm:text-[28px]">
          {title}
          {dot && <span className="text-brand-400">.</span>}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-white/60">{subtitle}</p>}
        {meta && <div className="mt-4 flex flex-wrap gap-2">{meta}</div>}
      </div>
      {actions && <div className="flex w-full flex-wrap items-center gap-2.5 sm:w-auto">{actions}</div>}
    </header>
  );
}

/* ---------------- Pílulas / segmentado ---------------- */

export function Pill({ className, children, dot }: { className?: string; children: ReactNode; dot?: string }) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] leading-none font-semibold whitespace-nowrap ring-1 ring-inset', className)}>
      {dot && <span className={clsx('size-1.5 rounded-full', dot)} />}
      {children}
    </span>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = 'md',
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; count?: number }[];
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <div className={clsx('scrollbar-none inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full bg-paper-2 p-1', className)} role="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={clsx(
              'inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap transition',
              size === 'sm' ? 'px-3 py-1 text-xs' : 'px-3.5 py-1.5 text-[13px]',
              active ? 'bg-white text-ink shadow-[0_1px_2px_rgb(16_24_40/0.08)]' : 'text-muted hover:text-ink',
            )}
          >
            {o.label}
            {o.count !== undefined && (
              <span className={clsx('tnum rounded-md px-1.5 py-0.5 text-[10px] leading-none', active ? 'bg-brand-50 text-brand-600' : 'text-faint')}>
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode; description?: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      {(label || description) && (
        <span className="min-w-0">
          {label && <span className="block text-sm font-semibold text-ink">{label}</span>}
          {description && <span className="block text-xs text-muted">{description}</span>}
        </span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={clsx('relative h-6 w-11 shrink-0 rounded-full transition', checked ? 'bg-brand-500' : 'bg-line-strong')}
      >
        <span className={clsx('absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition', checked && 'translate-x-5')} />
      </button>
    </label>
  );
}

/* ---------------- Estado vazio ---------------- */

export function EmptyState({ icon: Icon, title, text, action, dashed, className }: { icon: LucideIcon; title: string; text?: ReactNode; action?: ReactNode; dashed?: boolean; className?: string }) {
  return (
    <div className={clsx('flex flex-col items-center justify-center px-6 py-10 text-center', dashed && 'dashed-box rounded-2xl', className)}>
      <span className="mb-3 grid size-12 place-items-center rounded-full bg-paper-2 text-faint">
        <Icon className="size-5" strokeWidth={1.8} />
      </span>
      <p className="text-sm font-semibold text-ink">{title}</p>
      {text && <p className="mt-1 max-w-xs text-[13px] leading-relaxed text-muted">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function NoData({ className }: { className?: string }) {
  return <span className={clsx('shrink-0 rounded-full bg-paper-2 px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap text-muted ring-1 ring-line', className)}>Sem dados</span>;
}

/* ---------------- Overlays ---------------- */

function useOverlay(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
  icon: Icon,
  tone = 'brand',
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  tone?: 'brand' | 'red' | 'navy';
}) {
  useOverlay(open, onClose);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-ink/30 animate-fade-in" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={clsx(
          'relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-(--shadow-lift) animate-pop sm:rounded-2xl',
          size === 'sm' && 'sm:max-w-md',
          size === 'md' && 'sm:max-w-lg',
          size === 'lg' && 'sm:max-w-2xl',
        )}
      >
        <div className="flex items-start gap-3 border-b border-line px-6 pt-5 pb-4">
          {Icon && (
            <span
              className={clsx(
                'grid size-10 shrink-0 place-items-center rounded-full',
                tone === 'brand' && 'bg-brand-50 text-brand-500',
                tone === 'red' && 'bg-rose-50 text-rose-600',
                tone === 'navy' && 'bg-paper-2 text-ink-2',
              )}
            >
              <Icon className="size-5" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
          </div>
          <IconButton icon={X} label="Fechar" onClick={onClose} className="-mt-1 -mr-2" />
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-6 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function Drawer({ open, onClose, children, width = 'max-w-xl' }: { open: boolean; onClose: () => void; children: ReactNode; width?: string }) {
  useOverlay(open, onClose);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-ink/30 animate-fade-in" onClick={onClose} />
      <aside className={clsx('relative flex h-full w-full flex-col bg-white shadow-(--shadow-lift) animate-slide-left', width)}>{children}</aside>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  text,
  confirmLabel = 'Confirmar',
  danger,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  text: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      icon={danger ? AlertTriangle : Info}
      tone={danger ? 'red' : 'brand'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm leading-relaxed text-ink-2">{text}</div>
    </Modal>
  );
}

/* ---------------- Popover simples ---------------- */

export function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return { open, setOpen, ref };
}

/* ---------------- Toasts ---------------- */

type Toast = { id: number; text: string; tone: 'success' | 'error' | 'info' };
const ToastCtx = createContext<(text: string, tone?: Toast['tone']) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: Toast['tone'] = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4">
          {toasts.map((t) => {
            const Icon = t.tone === 'success' ? CheckCircle2 : t.tone === 'error' ? AlertTriangle : Info;
            return (
              <div key={t.id} className="pointer-events-auto flex max-w-md items-center gap-2.5 rounded-xl bg-ink px-4 py-3 text-sm font-medium text-white shadow-(--shadow-lift) animate-pop">
                <Icon className={clsx('size-[18px] shrink-0', t.tone === 'success' && 'text-emerald-400', t.tone === 'error' && 'text-rose-400', t.tone === 'info' && 'text-brand-300')} />
                {t.text}
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);

/* ---------------- Formulário ---------------- */

export function Field({ label, hint, children, className }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={clsx('block', className)}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-muted">{hint}</span>}
    </label>
  );
}

export function ProgressBar({ value, className, barClass = 'bg-brand-500', track = 'bg-paper-2' }: { value: number; className?: string; barClass?: string; track?: string }) {
  return (
    <div className={clsx('h-2 w-full overflow-hidden rounded-full', track, className)}>
      <div className={clsx('h-full rounded-full transition-[width] duration-700', barClass)} style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
    </div>
  );
}
