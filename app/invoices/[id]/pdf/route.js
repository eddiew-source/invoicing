import { getDb } from '@/lib/db';
import { renderInvoicePdf } from '@/lib/pdf';

export const dynamic = 'force-dynamic';

export async function GET(_req, { params }) {
  const { id } = await params;
  const sql = await getDb();
  const [invoice] = await sql`select * from invoices where id = ${Number(id)}`;
  if (!invoice) return new Response('Not found', { status: 404 });
  const [seller] = await sql`select * from settings where id = 1`;
  const pdf = await renderInvoicePdf({ invoice, seller });
  return new Response(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${invoice.number.replace(/[^\w.-]+/g, '_')}.pdf"`,
    },
  });
}
