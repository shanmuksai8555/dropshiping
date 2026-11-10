import localFont from 'next/font/local';

// Self-hosted (SIL OFL) font files, copied from the Ora homepage build. Nothing is fetched from Google.
export const sans = localFont({ src: './fonts/instrument-sans.woff2', weight: '400 600', variable: '--font-sans', display: 'swap' });
export const serif = localFont({
  src: [
    { path: './fonts/instrument-serif.woff2', weight: '400', style: 'normal' },
    { path: './fonts/instrument-serif-italic.woff2', weight: '400', style: 'italic' },
  ],
  variable: '--font-serif',
  display: 'swap',
});
export const mono = localFont({ src: './fonts/jetbrains-mono.woff2', weight: '400', variable: '--font-mono', display: 'swap', preload: false });
