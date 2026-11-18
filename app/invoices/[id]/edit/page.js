import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db';
import InvoiceForm from '@/components/InvoiceForm';

export const dynamic = 'force-dynamic';

export default async function EditInvoice({ params }) {
  const { id } = await params;
  const sql = await getDb();
  const [invoice] = await sql`select * from invoices where id = ${Number(id)}`;
  if (!invoice) notFound();
  const [settings] = await sql`select * from settings where id = 1`;
  const clients = await sql`select * from clients order by name`;

  return (
    <>
      <h1>Edit {invoice.number}</h1>
      <InvoiceForm
        id={invoice.id}
        initial={invoice}
        clients={clients}
        settings={settings}
        today={new Date().toISOString().slice(0, 10)}
      />
    </>
  );
}
