// src/app/login/page.tsx
'use client';

export default function LoginPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'radial-gradient(circle at top left, #d1fae5, transparent), radial-gradient(circle at top right, #bfdbfe, transparent)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          backgroundColor: 'white',
          borderRadius: 16,
          padding: 24,
          boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
        }}
      >
        <h1
          style={{
            fontSize: 20,
            fontWeight: 600,
            marginBottom: 8,
          }}
        >
          EcoScan Giriş
        </h1>
        <p
          style={{
            fontSize: 14,
            color: '#4b5563',
            marginBottom: 16,
          }}
        >
          Şimdilik sadece test ekranı. Bunu görüyorsan routing ve layout ÇALIŞIYOR.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label style={{ fontSize: 14 }}>
            E-posta
            <input
              type="email"
              style={{
                width: '100%',
                marginTop: 4,
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid #d1d5db',
                fontSize: 14,
              }}
              placeholder="ornek@mail.com"
            />
          </label>

          <label style={{ fontSize: 14 }}>
            Şifre
            <input
              type="password"
              style={{
                width: '100%',
                marginTop: 4,
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid #d1d5db',
                fontSize: 14,
              }}
              placeholder="••••••••"
            />
          </label>

          <button
            type="button"
            style={{
              marginTop: 8,
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: '#059669',
              color: 'white',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Giriş yap (test)
          </button>
        </div>
      </div>
    </div>
  );
}
