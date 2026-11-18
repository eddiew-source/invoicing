import './globals.css';
import Link from 'next/link';

export const metadata = { title: 'Invoices', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header className="nav">
          <Link href="/" className="brand">Invoices</Link>
          <nav>
            <Link href="/">All invoices</Link>
            <Link href="/clients">Clients</Link>
            <Link href="/settings">Settings</Link>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
