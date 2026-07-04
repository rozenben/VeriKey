import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'VeriKey — Biometric Identity Verification',
  description: 'Verify it\'s really them with biometric authentication.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1e3a8a" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="VeriKey" />
        <link rel="apple-touch-icon" href="/icons/icon.svg" />
        {/* Register SW; suppress install prompt globally — main page opts in explicitly */}
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() { navigator.serviceWorker.register('/sw.js'); });
          }
          window.__pwaPrompt = null;
          window.addEventListener('beforeinstallprompt', function(e) {
            e.preventDefault();
            window.__pwaPrompt = e;
            window.dispatchEvent(new Event('pwa-installable'));
          });
        ` }} />
      </head>
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f9fafb', color: '#111827' }}>
        {children}
      </body>
    </html>
  );
}
