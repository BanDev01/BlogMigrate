import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #4f46e5, #2563eb, #06b6d4)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 96, fontWeight: 700, letterSpacing: -2 }}>
          BlogMigrate
        </div>
        <div style={{ marginTop: 24, fontSize: 32, color: "#dbeafe" }}>
          MongoDB → Supabase (PostgreSQL) en direct
        </div>
        <div style={{ marginTop: 40, display: "flex", gap: 16, fontSize: 24 }}>
          <div
            style={{
              padding: "8px 24px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.15)",
            }}
          >
            Next.js
          </div>
          <div
            style={{
              padding: "8px 24px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.15)",
            }}
          >
            Supabase
          </div>
          <div
            style={{
              padding: "8px 24px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.15)",
            }}
          >
            Prisma
          </div>
        </div>
      </div>
    ),
    size
  );
}
