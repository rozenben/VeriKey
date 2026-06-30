export default function HomePage() {
  return (
    <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '1rem' }}>VeriKey</h1>
      <p style={{ fontSize: '1.25rem', color: '#6b7280', maxWidth: 480 }}>
        Verify it&apos;s really them — biometric identity verification for the modern age.
      </p>
      <p style={{ marginTop: '2rem', color: '#9ca3af', fontSize: '0.875rem' }}>
        Open the VeriKey mobile app to get started.
      </p>
    </main>
  );
}
