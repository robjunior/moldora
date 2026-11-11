export const metadata = { title: 'Print3D Quotes', description: 'Sistema de Orçamentos de Impressão 3D' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0, background: '#0b0f14', color: '#e6edf3' }}>
        {children}
      </body>
    </html>
  );
}
