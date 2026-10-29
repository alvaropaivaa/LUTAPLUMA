/** Lê uma imagem e reduz para no máximo `max` px (cabe no localStorage) */
export function fileToDataUrl(file: File, max = 320): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const side = Math.min(img.width, img.height);
        const canvas = document.createElement('canvas');
        const out = Math.round(side * scale);
        canvas.width = out;
        canvas.height = out;
        const ctx = canvas.getContext('2d')!;
        // recorte quadrado central
        ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, out, out);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
