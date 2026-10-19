import sharp from 'sharp';
import { unlink } from 'node:fs/promises';

// Decode real image pixels, apply camera orientation, and strip EXIF metadata.
// The pixel ceiling also prevents a small compressed file exhausting memory.
export async function compressAvatar(file) {
  const output = file.path + '.webp';
  try {
    const input = sharp(file.path, { limitInputPixels: 40_000_000, failOn: 'error' });
    const metadata = await input.metadata();
    if (!['jpeg', 'png', 'webp'].includes(metadata.format) || (metadata.pages || 1) > 1)
      throw Error('Unsupported image');
    const info = await input
      .rotate()
      .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(output);
    return {
      path: output,
      filename: file.filename + '.webp',
      size: info.size,
      width: info.width,
      height: info.height,
    };
  } catch {
    await unlink(output).catch(() => {});
    throw Object.assign(
      Error(
        'Imagem inválida ou muito grande em dimensões. Envie uma foto estática JPG, PNG ou WebP de até 5 MB e 40 megapixels.',
      ),
      { status: 400 },
    );
  }
}
