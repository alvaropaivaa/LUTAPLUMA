import { useId, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

/* Tokens de gráfico: grade e eixos recessivos, texto sempre em tinta neutra */
const AXIS = { fontSize: 11, fill: '#9CA3AF', fontFamily: 'Inter Variable' };
const GRID = '#EEF0F3';

/** Mini-gráfico dos cartões de indicador */
export function Sparkline({ data, color, height = 40 }: { data: number[]; color: string; height?: number }) {
  const id = useId().replace(/:/g, '');
  const points = data.map((v, i) => ({ i, v }));
  const last = points.length - 1;
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 6, right: 6, bottom: 2, left: 2 }}>
          <defs>
            <linearGradient id={`sp${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          {/* escala justa nos dados para a tendência aparecer */}
          <YAxis hide domain={[(min: number) => min * 0.8, (max: number) => max * 1.08]} />
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={2}
            fill={`url(#sp${id})`}
            isAnimationActive={false}
            dot={(p: { cx?: number; cy?: number; index?: number }) =>
              p.index === last && p.cx !== undefined && p.cy !== undefined ? (
                <g key="end">
                  <circle cx={p.cx} cy={p.cy} r={6} fill={color} opacity={0.18} />
                  <circle cx={p.cx} cy={p.cy} r={3} fill="#fff" stroke={color} strokeWidth={2} />
                </g>
              ) : (
                <g key={`d${p.index}`} />
              )
            }
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Linha tracejada plana para indicadores sem dados */
export function FlatLine({ height = 40 }: { height?: number }) {
  return (
    <svg width="100%" height={height} className="block">
      <line x1="0" x2="100%" y1={height - 6} y2={height - 6} stroke="#D8DCE3" strokeWidth="1.5" strokeDasharray="4 6" strokeLinecap="round" />
    </svg>
  );
}

function TipBox({ title, value, note }: { title: string; value: string; note?: string }) {
  return (
    <div className="rounded-lg bg-ink px-3 py-2 text-white shadow-lg">
      <div className="text-[11px] text-white/60">{title}</div>
      <div className="text-sm font-semibold">{value}</div>
      {note && <div className="mt-0.5 text-[11px] text-white/60">{note}</div>}
    </div>
  );
}

/**
 * Barras: cor suave em degradê, destaque laranja no item atual e no hover.
 * `track` desenha um trilho atrás de cada barra (dias zerados não viram buracos);
 * `avg` traça a linha tracejada da média.
 */
export function Bars({
  data,
  height = 220,
  format = (v: number) => String(v),
  maxBarSize = 40,
  yWidth = 36,
  yFormat,
  track,
  avg,
  avgLabel,
  note,
}: {
  data: { label: string; tip: string; value: number; highlight?: boolean }[];
  height?: number;
  format?: (v: number) => string;
  maxBarSize?: number;
  yWidth?: number;
  yFormat?: (v: number) => string;
  track?: boolean;
  avg?: number;
  avgLabel?: string;
  note?: (v: number) => string | undefined;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const id = useId().replace(/:/g, '');
  const interval = data.length > 12 ? Math.ceil(data.length / 7) - 1 : 0;
  // Trilho: uma segunda barra empilhada completa cada coluna até o topo (vale também para dias zerados)
  const top = Math.max(4, Math.ceil((Math.max(...data.map((d) => d.value), avg ?? 0) * 1.1) / 4) * 4);
  const rows = track ? data.map((d) => ({ ...d, rest: top - d.value })) : data;
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={rows}
          margin={{ top: 8, right: avg ? 64 : 4, bottom: 0, left: 0 }}
          barCategoryGap={track ? '24%' : '10%'}
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id={`bg${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FDBA8C" />
              <stop offset="100%" stopColor="#FEDCC2" />
            </linearGradient>
          </defs>
          {!track && <CartesianGrid vertical={false} stroke={GRID} />}
          <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} interval={interval} dy={6} />
          <YAxis
            tick={AXIS}
            tickLine={false}
            axisLine={false}
            width={yWidth}
            allowDecimals={false}
            tickFormatter={yFormat}
            domain={track ? [0, top] : undefined}
            ticks={track ? [0, top / 4, top / 2, (top * 3) / 4, top] : undefined}
          />
          <Tooltip
            cursor={false}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <TipBox title={String(payload[0].payload.tip)} value={format(Number(payload[0].value))} note={note?.(Number(payload[0].value))} />
              ) : null
            }
          />
          {avg !== undefined && avg > 0 && (
            <ReferenceLine
              y={avg}
              stroke="#F2701C"
              strokeOpacity={0.55}
              strokeDasharray="5 5"
              label={{ value: avgLabel ?? 'média', position: 'right', fill: '#C2571A', fontSize: 11, fontWeight: 600 }}
            />
          )}
          <Bar
            dataKey="value"
            stackId={track ? 'col' : undefined}
            radius={track ? [0, 0, 6, 6] : [4, 4, 0, 0]}
            maxBarSize={maxBarSize}
            onMouseEnter={(_, i) => setHover(i)}
            animationDuration={600}
          >
            {data.map((d, i) => (
              <Cell key={d.label + i} fill={d.highlight || hover === i ? '#F2701C' : track ? `url(#bg${id})` : '#FAD3B6'} />
            ))}
          </Bar>
          {track && (
            <Bar dataKey="rest" stackId="col" radius={[6, 6, 0, 0]} maxBarSize={maxBarSize} fill="#F1F2F5" isAnimationActive={false} onMouseEnter={(_, i) => setHover(i)}>
              {data.map((d, i) => (
                <Cell key={'r' + d.label + i} fill={hover === i ? '#E7E9EE' : '#F1F2F5'} />
              ))}
            </Bar>
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
