"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";

const transitions: Record<string, string[]> = {
  PENDING: ["AWAITING_PAYMENT", "CANCELLED"],
  AWAITING_PAYMENT: ["PAID", "CANCELLED"],
  PAID: ["IN_PRODUCTION", "CANCELLED"],
  IN_PRODUCTION: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

const statusColor: Record<string, string> = {
  PENDING: "#f59e0b",
  AWAITING_PAYMENT: "#f59e0b",
  PAID: "#22c55e",
  IN_PRODUCTION: "#3b82f6",
  COMPLETED: "#10b981",
  CANCELLED: "#ef4444",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [detail, setDetail] = useState<any>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    try {
      const list = await api<any[]>("/orders");
      setOrders(list);
      if (selectedId) await loadDetail(selectedId);
    } catch (e: any) {
      setError(e.message || "Failed to load orders");
    }
  }

  async function loadDetail(id: string) {
    if (!id) return setDetail(null);
    try { setDetail(await api<any>(`/orders/${id}`)); } catch (e: any) { setError(e.message || "Failed to load order"); }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { loadDetail(selectedId); }, [selectedId]);

  const selected = useMemo(() => orders.find(o => o.id === selectedId) || detail, [orders, selectedId, detail]);
  const pendingPayment = useMemo(() => (detail?.payments || []).find((p: any) => p.status === "PENDING"), [detail]);
  const canCreatePayment = !!selected && !["CANCELLED", "COMPLETED"].includes(selected.status) && !(detail?.payments || []).some((p: any) => p.status === "CONFIRMED");

  async function setStatus(id: string, status: string) {
    setBusy(`${id}:${status}`); setError(null); setNotice(null);
    try {
      await api(`/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status, note: note || undefined }) });
      setNote("");
      setNotice(`Order ${id.slice(0,8)} updated to ${status}`);
      await load();
      await loadDetail(id);
    } catch (e: any) {
      setError(e.message || "Failed to update status");
    } finally {
      setBusy(null);
    }
  }

  async function createPayment(id: string) {
    setBusy(`pay:${id}`); setError(null); setNotice(null);
    try {
      await api(`/payments`, { method: "POST", body: JSON.stringify({ orderId: id }) });
      setNotice(`Mock payment created for order ${id.slice(0,8)}`);
      await load();
      await loadDetail(id);
    } catch (e: any) {
      setError(e.message || "Failed to create payment");
    } finally {
      setBusy(null);
    }
  }

  async function simulateConfirm(paymentId: string) {
    setBusy(`confirm:${paymentId}`); setError(null); setNotice(null);
    try {
      await api(`/payments/${paymentId}/simulate-confirm`, { method: "POST", body: JSON.stringify({}) });
      setNotice("Mock payment confirmed");
      await load();
      if (selectedId) await loadDetail(selectedId);
    } catch (e: any) {
      setError(e.message || "Failed to confirm payment");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main style={{ padding: 32, maxWidth: 1200, margin: "0 auto" }}>
      <h1>Orders</h1>
      <p style={{ opacity: 0.8 }}>Track production status, log status changes, and review order details.</p>
      {error && <p style={{ color: "#f87171" }}>{error}</p>}
      {notice && <p style={{ color: "#4ade80" }}>{notice}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: 16, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 12 }}>
          {orders.map((o) => {
            const next = transitions[o.status] || [];
            return (
              <div key={o.id} onClick={() => setSelectedId(o.id)} style={{ border: selectedId===o.id?"1px solid #60a5fa":"1px solid #333", borderRadius: 8, padding: 12, cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <b>{o.id}</b>
                  <span style={{ color: statusColor[o.status] || "#e5e7eb", fontWeight: 700 }}>{o.status}</span>
                </div>
                <div>{o.customer?.name || o.customerId}</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>Quote: {o.quoteId} · Payments: {o.payments?.length || 0}</div>
                <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {next.length ? next.map((s) => (
                    <button key={s} disabled={busy===`${o.id}:${s}`} onClick={(e) => { e.stopPropagation(); setSelectedId(o.id); setStatus(o.id, s); }}>
                      {busy===`${o.id}:${s}` ? "..." : `Mark ${s}`}
                    </button>
                  )) : <span style={{ fontSize: 12, opacity: 0.7 }}>No further transitions</span>}
                </div>
              </div>
            );
          })}
          {!orders.length && <p>No orders yet.</p>}
        </div>

        <div style={{ border: "1px solid #333", borderRadius: 8, padding: 16 }}>
          {!selected ? <p>Select an order to view details and production logs.</p> : (
            <>
              <h2 style={{ marginTop: 0 }}>Order detail</h2>
              <div><b>{selected.id}</b> — <span style={{ color: statusColor[selected.status] || "#e5e7eb" }}>{selected.status}</span></div>
              <div>Customer: {selected.customer?.name || selected.customerId}</div>
              <div>Quote: {selected.quoteId} · Total: {selected.quote?.total ?? "-"} {selected.quote?.currency || "BRL"}</div>
              <div style={{ marginTop: 12 }}>
                <label style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: 13, opacity: 0.85 }}>Status change note (optional, applied to next action)</span>
                  <input value={note} onChange={e=>setNote(e.target.value)} placeholder="e.g. Payment confirmed manually / printer started" />
                </label>
              </div>
              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(transitions[selected.status] || []).map((s) => (
                  <button key={s} disabled={busy===`${selected.id}:${s}`} onClick={() => setStatus(selected.id, s)}>
                    {busy===`${selected.id}:${s}` ? "Updating..." : `Set ${s}`}
                  </button>
                ))}
                {!(transitions[selected.status] || []).length && <span style={{ opacity: 0.75 }}>Terminal status.</span>}
              </div>

              <h3 style={{ marginTop: 16 }}>Production logs ({detail?.productionLogs?.length || 0})</h3>
              <div style={{ display: "grid", gap: 8 }}>
                {(detail?.productionLogs || []).map((log: any) => (
                  <div key={log.id} style={{ border: "1px solid #222", borderRadius: 6, padding: 8, fontSize: 13 }}>
                    <div><b>{log.status}</b> · {new Date(log.createdAt).toLocaleString()}</div>
                    {log.message && <div style={{ opacity: 0.9, marginTop: 4 }}>{log.message}</div>}
                    {log.actorId && <div style={{ opacity: 0.7, fontSize: 12 }}>Actor: {log.actorId}</div>}
                  </div>
                ))}
                {!detail?.productionLogs?.length && <p style={{ opacity: 0.8 }}>No production logs yet.</p>}
              </div>

              <h3 style={{ marginTop: 16 }}>Payments ({detail?.payments?.length || 0})</h3>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                <button
                  onClick={() => createPayment(selected.id)}
                  disabled={!canCreatePayment || busy===`pay:${selected.id}`}
                >
                  {busy===`pay:${selected.id}` ? "Creating..." : "Create mock payment"}
                </button>
                {pendingPayment && (
                  <button onClick={() => simulateConfirm(pendingPayment.id)} disabled={busy===`confirm:${pendingPayment.id}`}>
                    {busy===`confirm:${pendingPayment.id}` ? "Confirming..." : "Simulate confirmation"}
                  </button>
                )}
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {(detail?.payments || []).map((p: any) => {
                  const rr: any = p.rawResponse || {};
                  const checkoutUrl = rr.checkoutUrl || rr?.providerResponse?.checkoutUrl;
                  const qrCode = rr.qrCode || rr?.providerResponse?.qrCode;
                  return (
                    <div key={p.id} style={{ border: "1px solid #222", borderRadius: 6, padding: 8, fontSize: 13 }}>
                      <div><b>{p.status}</b> · {p.provider} · {p.amount} {p.currency}</div>
                      <div style={{ opacity: 0.8, fontSize: 12 }}>ID: {p.id}{p.providerPaymentId ? ` · Provider: ${p.providerPaymentId}` : ""}</div>
                      {checkoutUrl && <div style={{ fontSize: 12, marginTop: 4 }}>Checkout: <a href={checkoutUrl} target="_blank" rel="noreferrer">{checkoutUrl}</a></div>}
                      {qrCode && <div style={{ fontSize: 12, marginTop: 2, wordBreak: "break-all" }}>PIX/QR: {qrCode}</div>}
                      {p.status === "PENDING" && p.provider === "mock" && (
                        <div style={{ marginTop: 6 }}>
                          <button onClick={() => simulateConfirm(p.id)} disabled={busy===`confirm:${p.id}`}>
                            {busy===`confirm:${p.id}` ? "Confirming..." : "Simulate confirmation"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
                {!detail?.payments?.length && <p style={{ opacity: 0.8 }}>No payments recorded.</p>}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
