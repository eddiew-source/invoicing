import './globals.css';
import { Suspense } from 'react';
import Link from 'next/link';
import Flash from '@/components/Flash';

export const metadata = { title: 'Invoices', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={null}><Flash /></Suspense>
        <header className="nav">
          <Link href="/" className="brand">Invoices</Link>
          <nav>
            <Link href="/">All invoices</Link>
            <Link href="/analytics">Analytics</Link>
            <Link href="/clients">Clients</Link>
            <Link href="/settings">Settings</Link>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
