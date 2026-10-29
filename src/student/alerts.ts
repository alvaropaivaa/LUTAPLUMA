/*
 * Notificações do aluno, montadas a partir dos dados do app (sem servidor):
 * avisos do mural, check-in aberto, mensalidade, pagamento confirmado e graduação.
 * A mesma lista alimenta o sininho (central de notificações) e as notificações do sistema.
 */
import { useMemo } from 'react';
import { useNow, useStore } from '../lib/store';
import { classesFor, findCheckin, sessionInfo } from '../lib/selectors';
import { addDays, diffDays, fmtDate } from '../lib/dates';
import { beltLabel, brl } from '../lib/belts';
import type { Student } from '../lib/types';

export type AlertKind = 'aviso' | 'checkin' | 'plano' | 'pagamento' | 'graduacao';

export interface AppAlert {
  /** estável: a mesma situação nunca notifica duas vezes */
  id: string;
  kind: AlertKind;
  title: string;
  body: string;
  /** ISO datetime (ordem e "não lido") */
  at: string;
  /** tela que abre ao tocar */
  url: string;
  /** vira notificação do sistema (avisos só quando o professor marcou "Notificar no celular") */
  push: boolean;
}

/** data local + hora -> ISO (compara com as datas dos avisos) */
const at = (date: string, time = '09:00') => new Date(`${date}T${time}:00`).toISOString();

export function useAlerts(student: Student | null): AppAlert[] {
  const { db } = useStore();
  const { today, nowMin } = useNow();

  return useMemo(() => {
    if (!student) return [];
    const list: AppAlert[] = [];

    for (const n of db.notices) {
      list.push({ id: `n:${n.id}`, kind: 'aviso', title: n.title, body: n.body, at: n.createdAt, url: '/app', push: !!n.notify });
    }

    // Check-in aberto agora (e ainda não feito)
    if (student.active) {
      for (const c of classesFor(db, today, student)) {
        const info = sessionInfo(db, c, today, today, nowMin);
        if (info.status !== 'aberta' || findCheckin(db, student.id, c.id, today)) continue;
        list.push({
          id: `c:${today}|${c.id}`,
          kind: 'checkin',
          title: `Check-in aberto · ${c.name}`,
          body: `Aula das ${c.time}. Confirme sua presença até ${info.endsAt}.`,
          at: at(today, info.opensAt),
          url: '/app',
          push: true,
        });
      }
    }

    // Mensalidade vencendo ou atrasada
    if (student.role === 'aluno' && student.active && student.dueDate) {
      const d = diffDays(today, student.dueDate);
      if (d < 0) {
        list.push({
          id: `p:atraso:${student.dueDate}`,
          kind: 'plano',
          title: 'Mensalidade atrasada',
          body: `Seu plano venceu em ${fmtDate(student.dueDate)}. Pague com PIX pelo app.`,
          at: at(addDays(student.dueDate, 1)),
          url: '/app/financeiro',
          push: true,
        });
      } else if (d <= 3) {
        list.push({
          id: `p:vence:${student.dueDate}`,
          kind: 'plano',
          title: d === 0 ? 'Sua mensalidade vence hoje' : `Sua mensalidade vence em ${d} ${d === 1 ? 'dia' : 'dias'}`,
          body: 'Renove com PIX pelo app e continue treinando.',
          at: at(addDays(student.dueDate, -3)),
          url: '/app/financeiro',
          push: true,
        });
      }
    }

    // Pagamentos confirmados pela academia (últimos 30 dias)
    for (const p of db.payments) {
      if (p.studentId !== student.id || diffDays(p.date, today) > 30) continue;
      const plan = db.plans.find((x) => x.id === p.planId);
      list.push({
        id: `pg:${p.id}`,
        kind: 'pagamento',
        title: 'Pagamento confirmado',
        body: `${plan?.name ?? 'Plano'} · ${brl(p.amount)}. Válido até ${fmtDate(p.periodEnd)}.`,
        at: at(p.date, '08:00'),
        url: '/app/financeiro',
        push: true,
      });
    }

    // Graduações (últimos 60 dias)
    for (const g of db.graduations) {
      if (g.studentId !== student.id || diffDays(g.date, today) > 60) continue;
      list.push({
        id: `g:${g.id}`,
        kind: 'graduacao',
        title: `Parabéns! ${beltLabel(g.toBelt, g.toDegree)}`,
        body: g.note ? `“${g.note}”` : 'Nova graduação registrada pelo professor.',
        at: at(g.date),
        url: '/app/graduacao',
        push: true,
      });
    }

    return list.sort((a, b) => b.at.localeCompare(a.at));
  }, [db, student, today, nowMin]);
}
