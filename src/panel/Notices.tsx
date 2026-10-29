import { useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { BellRing, Megaphone, Pin, PinOff, Send, Trash2, type LucideIcon } from 'lucide-react';
import { useStore } from '../lib/store';
import { fmtAgo } from '../lib/dates';
import { Avatar } from '../components/bits';
import { Button, Card, ConfirmDialog, EmptyState, PageHeader, Segmented, useToast } from '../components/ui';
import type { Notice } from '../lib/types';

const TITLE_MAX = 80;
const BODY_MAX = 500;

export default function Notices() {
  const { db, me, addNotice, togglePin, deleteNotice } = useStore();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [pinned, setPinned] = useState(false);
  const [notify, setNotify] = useState(true);
  const [filter, setFilter] = useState<'todos' | 'fixados'>('todos');
  const [toDelete, setToDelete] = useState<Notice | null>(null);

  // Alunos ativos que ativaram as notificações no app
  const subscribers = db.pushOptIn.filter((id) => db.students.some((s) => s.id === id && s.active)).length;
  const sorted = db.notices.slice().sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt));
  const list = filter === 'fixados' ? sorted.filter((n) => n.pinned) : sorted;
  const canPublish = title.trim().length > 0 && body.trim().length > 0;

  const publish = () => {
    if (!canPublish) return;
    addNotice(title.trim(), body.trim(), pinned, notify);
    setTitle('');
    setBody('');
    setPinned(false);
    toast(notify ? `Aviso publicado e enviado para ${subscribers} ${subscribers === 1 ? 'celular' : 'celulares'}.` : 'Aviso publicado no app.');
  };

  return (
    <>
      <PageHeader
        eyebrow="Recados que aparecem no app do aluno"
        title="Mural de avisos"
        actions={
          <span className="inline-flex h-10 items-center gap-2 rounded-full bg-white/[0.07] px-4 text-[13px] text-white ring-1 ring-white/15">
            <BellRing className="size-4 text-brand-300" />
            {subscribers} {subscribers === 1 ? 'aluno recebe' : 'alunos recebem'} no celular
          </span>
        }
      />

      <div className="mx-auto max-w-3xl space-y-8">
        {/* Escrever aviso, no estilo de uma postagem */}
        <Card className="overflow-hidden">
          <div className="flex gap-4 p-5 @md:p-6">
            {me && <Avatar name={me.name} src={me.photo} size={40} className="hidden bg-brand-500! text-white! @md:inline-grid" />}
            <div className="min-w-0 flex-1">
              <input
                value={title}
                maxLength={TITLE_MAX}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título do aviso"
                className="w-full bg-transparent text-lg font-semibold text-ink outline-none placeholder:text-faint"
              />
              <textarea
                value={body}
                maxLength={BODY_MAX}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Escreva o recado para os alunos…"
                rows={3}
                className="mt-1.5 min-h-20 w-full resize-none bg-transparent text-[15px] leading-relaxed text-ink-2 outline-none field-sizing-content placeholder:text-faint"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-line bg-paper/60 px-5 py-3 @md:px-6">
            <ChipToggle on={pinned} onClick={() => setPinned((v) => !v)} icon={Pin}>
              Fixar no topo
            </ChipToggle>
            <ChipToggle on={notify} onClick={() => setNotify((v) => !v)} icon={BellRing}>
              Notificar no celular
            </ChipToggle>
            <span className="tnum ml-auto text-xs text-faint">
              {body.length}/{BODY_MAX}
            </span>
            <Button icon={Send} disabled={!canPublish} onClick={publish}>
              Publicar
            </Button>
          </div>
        </Card>

        {/* Avisos publicados */}
        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[15px] font-semibold text-ink">Publicados</h2>
            <Segmented
              size="sm"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'todos', label: 'Todos', count: db.notices.length },
                { value: 'fixados', label: 'Fixados', count: db.notices.filter((n) => n.pinned).length },
              ]}
            />
          </div>

          {list.length ? (
            <ul className="space-y-3">
              {list.map((n) => (
                <li key={n.id}>
                  <Card className={clsx('p-5 transition hover:border-line-strong', n.pinned && 'ring-1 ring-brand-200')}>
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {n.pinned && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-600">
                              <Pin className="size-3" /> Fixado
                            </span>
                          )}
                          <h3 className="text-[15px] font-semibold text-ink">{n.title}</h3>
                        </div>
                        <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-line text-ink-2">{n.body}</p>
                      </div>
                      <span className="shrink-0 text-xs text-faint">{fmtAgo(n.createdAt)}</span>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-3">
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                        {n.notify ? (
                          <>
                            <BellRing className="size-3.5 text-emerald-600" /> Notificado no celular
                          </>
                        ) : (
                          <>
                            <Megaphone className="size-3.5" /> Só no mural do app
                          </>
                        )}
                      </span>
                      <div className="ml-auto flex items-center gap-1">
                        <ActionButton
                          icon={n.pinned ? PinOff : Pin}
                          onClick={() => {
                            togglePin(n.id);
                            toast(n.pinned ? 'Aviso desafixado.' : 'Aviso fixado no topo.', 'info');
                          }}
                        >
                          {n.pinned ? 'Desafixar' : 'Fixar'}
                        </ActionButton>
                        <ActionButton icon={Trash2} danger onClick={() => setToDelete(n)}>
                          Apagar
                        </ActionButton>
                      </div>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          ) : (
            <Card>
              <EmptyState icon={Megaphone} title={filter === 'fixados' ? 'Nenhum aviso fixado' : 'Nenhum aviso publicado ainda.'} text="Escreva um recado acima — ele aparece na hora no app do aluno." className="py-14" />
            </Card>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        danger
        title="Apagar aviso?"
        text={
          <>
            “<b>{toDelete?.title}</b>” deixa de aparecer no app dos alunos.
          </>
        }
        confirmLabel="Apagar"
        onConfirm={() => {
          if (toDelete) deleteNotice(toDelete.id);
          toast('Aviso apagado.', 'info');
        }}
      />
    </>
  );
}

function ChipToggle({ on, onClick, icon: Icon, children }: { on: boolean; onClick: () => void; icon: LucideIcon; children: ReactNode }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className={clsx(
        'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium ring-1 transition',
        on ? 'bg-brand-50 text-brand-700 ring-brand-300' : 'bg-white text-muted ring-line hover:text-ink hover:ring-line-strong',
      )}
    >
      <Icon className="size-3.5" />
      {children}
    </button>
  );
}

function ActionButton({ icon: Icon, onClick, danger, children }: { icon: LucideIcon; onClick: () => void; danger?: boolean; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-muted transition',
        danger ? 'hover:bg-rose-50 hover:text-rose-600' : 'hover:bg-paper-2 hover:text-ink',
      )}
    >
      <Icon className="size-3.5" />
      {children}
    </button>
  );
}
