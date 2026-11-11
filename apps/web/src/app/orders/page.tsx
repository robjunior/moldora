"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/api";

const statuses = ["PENDING", "AWAITING_PAYMENT", "PAID", "IN_PRODUCTION", "COMPLETED", "CANCELLED"];

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setOrders(await api<any[]>("/orders"));
    } catch (e: any) {
      setError(e.message || "Failed to load orders");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function setStatus(id: string, status: string) {
    try {
      await api(`/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      await load();
    } catch (e: any) {
      setError(e.message || "Failed to update status");
    }
  }

  return (
    <main style={{ padding: 32, maxWidth: 1100, margin: "0 auto" }}>
      <h1>Orders</h1>
      {error && <p style={{ color: "#f87171" }}>{error}</p>}
      <div style={{ display: "grid", gap: 12 }}>
        {orders.map((o) => (
          <div key={o.id} style={{ border: "1px solid #333", borderRadius: 8, padding: 12 }}>
            <div>
              <b>{o.id}</b> — {o.status} — {o.customer?.name || o.customerId}
            </div>
            <div>Quote: {o.quoteId}</div>
            <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {statuses.map((s) => (
                <button key={s} disabled={o.status === s} onClick={() => setStatus(o.id, s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ))}
        {!orders.length && <p>No orders yet.</p>}
      </div>
    </main>
  );
}
