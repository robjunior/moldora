export default function Home() {
  return (
    <main style={{ padding: 32, maxWidth: 1100, margin: '0 auto' }}>
      <h1>Print3D Quotes — Painel Administrativo (MVP)</h1>
      <p>Base do frontend inicializada. Módulos: clientes, arquivos, slicing, orçamentos, pedidos, pagamentos e produção.</p>
      <ul>
        <li><a href="/dashboard">Dashboard</a></li>
        <li><a href="/customers">Clientes</a></li>
        <li><a href="/quotes">Orçamentos</a></li>
        <li><a href="/orders">Pedidos</a></li>
      </ul>
      <p style={{opacity:0.7}}>API esperada em <code>{process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}</code></p>
    </main>
  );
}
