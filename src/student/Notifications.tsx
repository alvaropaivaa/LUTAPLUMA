import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { Award, BellOff, BellRing, CalendarClock, CircleCheck, Fingerprint, Megaphone, type LucideIcon } from 'lucide-react';
import { fmtAgo } from '../lib/dates';
import { isIOS, isStandalone, showNotification } from '../lib/notify';
import { Button, Toggle, useToast } from '../components/ui';
import type { Student } from '../lib/types';
import { useAlerts, type AlertKind } from './alerts';
import { appPath, BottomSheet, InstallSheet, useNotify } from './parts';

const KIND: Record<AlertKind, { icon: LucideIcon; tone: string }> = {
  aviso: { icon: Megaphone, tone: 'bg-brand-50 text-brand-500' },
  checkin: { icon: Fingerprint, tone: 'bg-emerald-50 text-emerald-600' },
  plano: { icon: CalendarClock, tone: 'bg-amber-50 text-amber-600' },
  pagamento: { icon: CircleCheck, tone: 'bg-emerald-50 text-emerald-600' },
  graduacao: { icon: Award, tone: 'bg-navy-50 text-navy-700' },
};

/** Manda uma notificação de exemplo para o aluno ver como chega no celular */
export function useTestNotification() {
  const toast = useToast();
  return async () => {
    const ok = await showNotification('Easy Wrestling', 'Notificações funcionando! Os avisos da academia chegam por aqui.', 'ew-teste');
    if (!ok) toast('Não foi possível enviar. Confira a permissão de notificações do navegador.', 'error');
  };
}

/** Sininho: lista de notificações + liga/desliga das notificações do celular */
export function NotificationsSheet({ open, onClose, student, seen }: { open: boolean; onClose: () => void; student: Student; seen: string }) {
  const alerts = useAlerts(student);
  const navigate = useNavigate();

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="pt-2 pb-6">
        <h3 className="text-[22px] leading-tight text-ink">Notificações</h3>
        <p className="text-[13px] text-muted">Avisos, check-in, mensalidade e graduação.</p>

        <PushCard student={student} />

        {alerts.length ? (
          <ul className="mt-3 divide-y divide-line">
            {alerts.slice(0, 25).map((a) => {
              const k = KIND[a.kind];
              const unread = a.at > seen;
              return (
                <li key={a.id}>
                  <button
                    onClick={() => {
                      onClose();
                      navigate(appPath(a.url));
                    }}
                    className="flex w-full items-start gap-3 py-3.5 text-left"
                  >
                    <span className={clsx('grid size-10 shrink-0 place-items-center rounded-full', k.tone)}>
                      <k.icon className="size-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className={clsx('truncate text-[15px] text-ink', unread ? 'font-medium' : '')}>{a.title}</span>
                        {unread && <span className="size-2 shrink-0 rounded-full bg-brand-500" aria-label="Não lida" />}
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-[13px] leading-snug text-muted">{a.body}</span>
                      <span className="mt-1 block text-[11px] text-faint">{fmtAgo(a.at)}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-6 text-center text-[13px] text-muted">Nenhuma notificação por enquanto.</p>
        )}
      </div>
    </BottomSheet>
  );
}

/** Situação das notificações neste aparelho, com o botão certo para cada caso */
function PushCard({ student }: { student: Student }) {
  const { perm, on, enable, disable } = useNotify(student);
  const test = useTestNotification();
  const [steps, setSteps] = useState(false);
  const iosBrowser = perm === 'unsupported' && isIOS() && !isStandalone();

  const text = on
    ? 'Avisos, check-in e lembretes chegam como notificação do celular.'
    : perm === 'insecure'
      ? 'O navegador só libera notificações quando o app é aberto por um endereço https://.'
      : perm === 'denied'
      ? 'Bloqueadas no navegador. Libere nas configurações do site.'
      : iosBrowser
        ? 'No iPhone, instale o app na tela inicial para ativar.'
        : perm === 'unsupported'
          ? 'Este navegador não aceita notificações.'
          : 'Ative para receber avisos, check-in e lembretes.';

  return (
    <div className="mt-4 rounded-3xl bg-paper p-4">
      <div className="flex items-center gap-3">
        <span className={clsx('grid size-10 shrink-0 place-items-center rounded-full bg-white', on ? 'text-emerald-600' : 'text-brand-500')}>
          {perm === 'denied' ? <BellOff className="size-[18px]" /> : <BellRing className="size-[18px]" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium text-ink">{on ? 'Notificações ativadas' : 'Notificações no celular'}</p>
          <p className="text-xs text-muted">{text}</p>
        </div>
        {perm === 'default' || perm === 'granted' ? (
          <Toggle checked={on} onChange={(v) => (v ? enable() : disable())} />
        ) : iosBrowser ? (
          <Button size="sm" variant="secondary" onClick={() => setSteps(true)}>
            Como
          </Button>
        ) : null}
      </div>
      {on && (
        <button onClick={test} className="mt-3 ml-[52px] text-[13px] font-medium text-brand-600">
          Enviar notificação de teste
        </button>
      )}
      <InstallSheet open={steps} onClose={() => setSteps(false)} />
    </div>
  );
}
