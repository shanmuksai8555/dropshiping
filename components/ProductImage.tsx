import Image from 'next/image';
import type { ProductImage as Img } from '@/lib/types';

/** next/image for Woo images; local SVG placeholders are served as-is. */
export default function ProductImage({ image, sizes, preload, className }: { image: Img | undefined; sizes: string; preload?: boolean; className?: string }) {
  if (!image) return <div className={className} aria-hidden="true" />;
  const svg = image.src.endsWith('.svg');
  return <Image className={className} src={image.src} alt={image.alt} width={image.width ?? 1200} height={image.height ?? 1200} sizes={sizes} preload={preload} unoptimized={svg} />;
}
