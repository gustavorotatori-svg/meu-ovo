const MAX_DIMENSION = 1600;
const WEBP_QUALITY = 0.82;
const SKIP_TYPES = ['image/gif', 'image/svg+xml'];

function loadImageFromBitmap(file: File): Promise<ImageBitmap> {
  return createImageBitmap(file, { imageOrientation: 'from-image' });
}

function loadImageFromElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Não foi possível ler a imagem.')); };
    img.src = url;
  });
}

function getDimensions(source: ImageBitmap | HTMLImageElement): { width: number; height: number } {
  return { width: source.width, height: source.height };
}

export async function processImageFile(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) {
    throw new Error('O arquivo deve ser uma imagem.');
  }

  if (SKIP_TYPES.includes(file.type)) {
    return file;
  }

  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await loadImageFromBitmap(file);
  } catch {
    source = await loadImageFromElement(file);
  }

  try {
    const { width, height } = getDimensions(source);
    if (!width || !height) throw new Error('Dimensões de imagem inválidas.');

    const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Não foi possível processar a imagem.');

    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', WEBP_QUALITY)
    );
    if (!blob) throw new Error('Falha ao comprimir a imagem.');

    const baseName = file.name.replace(/\.[^.]+$/, '');
    return new File([blob], `${baseName}.webp`, { type: 'image/webp' });
  } finally {
    if ('close' in source) source.close();
  }
}
