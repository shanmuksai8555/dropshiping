import type { ReactNode } from 'react';

const ICONS: Record<string, ReactNode> = {
  fashion: <path d="M9 4l3 2 3-2 5 3-2 4-2-1v10H8V10l-2 1-2-4z" />,
  electronics: (
    <>
      <rect x="4" y="5" width="16" height="11" rx="2" />
      <path d="M9 20h6M12 16v4" />
    </>
  ),
  kitchenware: (
    <>
      <path d="M5 11h14v3a5 5 0 0 1-5 5h-4a5 5 0 0 1-5-5z" />
      <path d="M19 12h2M9 8c0-2 2-2 2-4M13 8c0-2 2-2 2-4" />
    </>
  ),
  'daily-essentials': (
    <>
      <path d="M8 3h8l-1 4H9z" />
      <rect x="7" y="7" width="10" height="14" rx="3" />
      <path d="M10 13h4" />
    </>
  ),
};

export default function CategoryIcon({ slug, className }: { slug: string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      {ICONS[slug]}
    </svg>
  );
}
