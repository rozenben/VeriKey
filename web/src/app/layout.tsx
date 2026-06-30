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
      </head>
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f9fafb', color: '#111827' }}>
        {children}
      </body>
    </html>
  );
}
