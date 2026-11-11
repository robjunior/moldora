"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { api("/dashboard").then(setData).catch(e => setError(e.message)); }, []);
  return (
    <main style={{ padding: 32, maxWidth: 1100, margin: "0 auto" }}>
      <h1>Dashboard</h1>
      {error && <p style={{ color: "#f87171" }}>{error}</p>}
      {!data ? <p>Loading...</p> : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
            {Object.entries(data.indicators || {}).map(([k,v]) => (
              <div key={k} style={{ border: "1px solid #333", borderRadius: 8, padding: 12 }}>
                <div style={{ opacity: 0.7, fontSize: 12 }}>{k}</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{String(v)}</div>
              </div>
            ))}
          </div>
          <h3 style={{ marginTop: 24 }}>Recent Quotes</h3>
          <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(data.recent?.quotes || [], null, 2)}</pre>
          <h3>Recent Orders</h3>
          <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(data.recent?.orders || [], null, 2)}</pre>
        </>
      )}
    </main>
  );
}
