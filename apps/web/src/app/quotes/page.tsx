"use client";
import { useEffect, useState } from "react";
import { api, API_BASE } from "../../lib/api";

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const [q, c] = await Promise.all([api<any[]>("/quotes"), api<any[]>("/customers")]);
      setQuotes(q); setCustomers(c);
    } catch (e: any) { setError(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!customerId) return setError("Select a customer");
    try { await api("/quotes", { method: "POST", body: JSON.stringify({ customerId, notes }) }); setNotes(""); await load(); }
    catch (e: any) { setError(e.message); }
  }
  async function action(id: string, act: string) { try { await api(`/quotes/${id}/${act}`, { method: "POST", body: JSON.stringify({}) }); await load(); } catch (e:any){ setError(e.message);} }
  async function createOrder(quoteId: string) { try { await api(`/orders`, { method: "POST", body: JSON.stringify({ quoteId }) }); await load(); } catch(e:any){ setError(e.message);} }

  return (
    <main style={{ padding: 32, maxWidth: 1100, margin: "0 auto" }}>
      <h1>Quotes</h1>
      {error && <p style={{ color: "#f87171" }}>{error}</p>}
      <form onSubmit={create} style={{ display: "flex", gap: 8, margin: "16px 0", flexWrap: "wrap" }}>
        <select value={customerId} onChange={e=>setCustomerId(e.target.value)}>
          <option value="">Select customer</option>
          {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input placeholder="Notes" value={notes} onChange={e=>setNotes(e.target.value)} style={{ minWidth: 260 }} />
        <button type="submit">Create Quote</button>
      </form>
      <div style={{ display: "grid", gap: 12 }}>
        {quotes.map(q => (
          <div key={q.id} style={{ border: "1px solid #333", borderRadius: 8, padding: 12 }}>
            <div><b>{q.id}</b> — {q.status} — {q.customer?.name || q.customerId}</div>
            <div>Total: {q.total ?? "-"} {q.currency}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              <button onClick={() => action(q.id, "recalc")}>Recalc</button>
              <button onClick={() => action(q.id, "send")}>Send</button>
              <button onClick={() => action(q.id, "approve")}>Approve</button>
              <button onClick={() => action(q.id, "reject")}>Reject</button>
              <button onClick={() => createOrder(q.id)}>Create Order</button>
              <a href={`${API_BASE}/quotes/${q.id}/proposal`} target="_blank" rel="noreferrer">Proposal</a>
            </div>
          </div>
        ))}
        {!quotes.length && <p>No quotes yet.</p>}
      </div>
    </main>
  );
}
