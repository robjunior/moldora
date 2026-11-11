"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";

type Customer = { id: string; name: string; email?: string | null; phone?: string | null; company?: string | null };

export default function CustomersPage() {
  const [items, setItems] = useState<Customer[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try { setLoading(true); setError(null); setItems(await api<Customer[]>("/customers")); }
    catch (e: any) { setError(e.message || "Failed to load customers"); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await api("/customers", { method: "POST", body: JSON.stringify({ name, email: email || undefined, phone: phone || undefined }) });
      setName(""); setEmail(""); setPhone(""); await load();
    } catch (e: any) { setError(e.message || "Failed to create customer"); }
  }

  async function archive(id: string) {
    try { await api(`/customers/${id}`, { method: "DELETE" }); await load(); } catch (e: any) { setError(e.message || "Failed to archive"); }
  }

  return (
    <main style={{ padding: 32, maxWidth: 1100, margin: "0 auto" }}>
      <h1>Customers</h1>
      {error && <p style={{ color: "#f87171" }}>{error}</p>}
      <form onSubmit={create} style={{ display: "flex", gap: 8, margin: "16px 0", flexWrap: "wrap" }}>
        <input placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
        <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input placeholder="Phone" value={phone} onChange={e => setPhone(e.target.value)} />
        <button type="submit">Create</button>
      </form>
      {loading ? <p>Loading...</p> : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th align="left">Name</th><th align="left">Email</th><th align="left">Phone</th><th></th></tr></thead>
          <tbody>
            {items.map(c => (
              <tr key={c.id}>
                <td>{c.name}</td><td>{c.email || "-"}</td><td>{c.phone || "-"}</td>
                <td><button onClick={() => archive(c.id)}>Archive</button></td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan={4}>No customers yet.</td></tr>}
          </tbody>
        </table>
      )}
    </main>
  );
}
