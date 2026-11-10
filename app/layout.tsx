import type { Metadata, Viewport } from 'next';
import Footer from '@/components/Footer';
import SiteNav from '@/components/SiteNav';
import { mono, sans, serif } from './fonts';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Lumen Market — Things, considered.', template: '%s · Lumen Market' },
  description: 'Lumen Market: fashion, electronics, kitchenware and daily essentials, for shoppers in India.',
  icons: { icon: '/favicon.svg' },
};

export const viewport: Viewport = { themeColor: '#060608', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${sans.variable} ${serif.variable} ${mono.variable}`}>
      <body>
        {/* Without JS the preloader would never clear; hide it. */}
        <noscript>
          <style>{'.preloader{display:none!important}.scrub__canvas{display:none}'}</style>
        </noscript>
        <SiteNav />
        {children}
        <Footer />
      </body>
    </html>
  );
}
