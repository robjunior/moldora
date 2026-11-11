export default function Home() {
  return (
    <main style={{ padding: 32, maxWidth: 1100, margin: '0 auto' }}>
      <h1>Print3D Quotes — Admin Panel (MVP)</h1>
      <p>Frontend base initialized. Modules: customers, files, slicing, quotes, orders, payments, and production.</p>
      <ul>
        <li><a href="/dashboard">Dashboard</a></li>
        <li><a href="/customers">Customers</a></li>
        <li><a href="/quotes">Quotes</a></li>
        <li><a href="/orders">Orders</a></li>
      </ul>
      <p style={{opacity:0.7}}>Expected API at <code>{process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}</code></p>
    </main>
  );
}
