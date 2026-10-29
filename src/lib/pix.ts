/*
 * PIX "copia e cola" (BR Code estático) para a mensalidade.
 * A chave abaixo é fictícia (demonstração): troque pela chave PIX real da academia.
 */
export const ACADEMY_PIX = {
  key: '00000000000100',
  keyLabel: 'CNPJ 00.000.000/0001-00',
  name: 'EASY WRESTLING',
  city: 'FORTALEZA',
};

const field = (id: string, value: string) => id + String(value.length).padStart(2, '0') + value;

/** CRC16-CCITT (0x1021, início 0xFFFF), exigido no fim do BR Code */
function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    crc &= 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/** Código do PIX com valor e identificador (txid: até 25 letras/números) */
export function pixPayload(amount: number, txid: string): string {
  const account = field('00', 'br.gov.bcb.pix') + field('01', ACADEMY_PIX.key);
  const body =
    field('00', '01') +
    field('26', account) +
    field('52', '0000') +
    field('53', '986') +
    field('54', amount.toFixed(2)) +
    field('58', 'BR') +
    field('59', ACADEMY_PIX.name.slice(0, 25)) +
    field('60', ACADEMY_PIX.city.slice(0, 15)) +
    field('62', field('05', txid.replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***')) +
    '6304';
  return body + crc16(body);
}

/** Copia texto; usa o método antigo quando a API de área de transferência não está disponível (http no celular) */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    el.remove();
    return ok;
  }
}
