import Link from 'next/link';
import { getDb } from '@/lib/db';
import InvoiceForm from '@/components/InvoiceForm';

export const dynamic = 'force-dynamic';

export default async function NewInvoice({ searchParams }) {
  const sp = await searchParams;
  const sql = await getDb();
  const [settings] = await sql`select * from settings where id = 1`;
  const clients = await sql`select * from clients order by name`;
  const from = Number(sp?.from) || null;
  const [initial] = from ? await sql`select * from invoices where id = ${from}` : [];

  if (clients.length === 0) {
    return (
      <>
        <h1>New invoice</h1>
        <div className="notice">You need a client first. <Link href="/clients">Add a client</Link></div>
      </>
    );
  }

  return (
    <>
      <h1>{initial ? `New invoice (copied from ${initial.number})` : 'New invoice'}</h1>
      <p className="muted">
        The number is assigned when you save: {settings.invoice_prefix}{String(settings.next_number).padStart(4, '0')}
      </p>
      <InvoiceForm
        initial={initial ?? null}
        clients={clients}
        settings={settings}
        today={new Date().toISOString().slice(0, 10)}
      />
    </>
  );
}
