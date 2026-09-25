"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8f9fb",
          color: "#141a2e",
          margin: 0,
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 360, padding: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Something went wrong</h1>
          <p style={{ color: "#646b7d", fontSize: 14, marginTop: 8 }}>
            We hit an unexpected problem loading this page. Your data is safe.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 20,
              background: "#252f81",
              color: "#fff",
              border: 0,
              borderRadius: 8,
              padding: "9px 16px",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
