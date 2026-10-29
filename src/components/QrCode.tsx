import { useMemo } from 'react';
import qrcode from 'qrcode-generator';

/** QR code em SVG (nítido em qualquer tamanho); a cor vem de `currentColor` */
export function QrCode({ value, size = 180, className }: { value: string; size?: number; className?: string }) {
  const { n, path } = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(value);
    qr.make();
    const count = qr.getModuleCount();
    let d = '';
    for (let r = 0; r < count; r++) for (let c = 0; c < count; c++) if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
    return { n: count, path: d };
  }, [value]);

  return (
    <svg viewBox={`-2 -2 ${n + 4} ${n + 4}`} width={size} height={size} className={className} shapeRendering="crispEdges" role="img" aria-label="QR code">
      <path d={path} fill="currentColor" />
    </svg>
  );
}
