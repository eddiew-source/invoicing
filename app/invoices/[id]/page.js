import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db';
import { calcTotals, formatMoney, fmtDate, defaultEmailText } from '@/lib/format';
import { sendInvoice, markPaid, deleteInvoice } from '@/app/actions';

export const dynamic = 'force-dynamic';

export default async function InvoicePage({ params, searchParams }) {
  const { id } = await params;
  const sp = await searchParams;
  const sql = await getDb();
  const [inv] = await sql`select * from invoices where id = ${Number(id)}`;
  if (!inv) notFound();
  const [seller] = await sql`select * from settings where id = 1`;

  const t = calcTotals(inv.items, inv.tax_rate, inv.currency);
  const c = inv.client_snapshot;
  const money = (n) => formatMoney(n, inv.currency);

  return (
    <>
      <div className="row">
        <h1>{inv.number} <span className={`badge ${inv.status}`}>{inv.status}</span></h1>
        <div className="row">
          <a className="btn ghost" href={`/invoices/${inv.id}/pdf`} target="_blank">Open PDF</a>
          <Link className="btn ghost" href={`/invoices/${inv.id}/edit`}>Edit</Link>
          <Link className="btn ghost" href={`/invoices/new?from=${inv.id}`}>Copy to new</Link>
        </div>
      </div>

      {sp?.sent && <div className="notice">Invoice emailed.</div>}

      <div className="card stack">
        <div className="grid2">
          <div><span className="muted">Bill to</span><br /><strong>{c.name}</strong><br /><span style={{ whiteSpace: 'pre-line' }}>{c.address}</span></div>
          <div><span className="muted">Issued</span> {fmtDate(inv.issue_date)}<br /><span className="muted">Due</span> {fmtDate(inv.due_date)}<br />{inv.sent_at && <><span className="muted">Last sent</span> {new Date(inv.sent_at).toLocaleDateString('en-GB')}</>}</div>
        </div>
        <div className="scroll">
          <table>
            <thead><tr><th>Description</th><th className="num">Qty</th><th className="num">Unit price</th><th className="num">Amount</th></tr></thead>
            <tbody>
              {inv.items.map((it, i) => (
                <tr key={i}>
                  <td>{it.description}</td>
                  <td className="num">{Number(it.quantity)}</td>
                  <td className="num">{money(it.unit_price)}</td>
                  <td className="num">{money(t.lines[i])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="totals">
          <div><span className="muted">Subtotal</span><span>{money(t.subtotal)}</span></div>
          {Number(inv.tax_rate) > 0 && <div><span className="muted">{inv.tax_label} ({Number(inv.tax_rate)}%)</span><span>{money(t.tax)}</span></div>}
          <div><strong>Total</strong><strong>{money(t.total)}</strong></div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Email invoice</h2>
        <form action={sendInvoice.bind(null, inv.id)} className="stack">
          <div className="grid2">
            <label>To<input name="to" type="email" required defaultValue={c.email} /></label>
            <label>Cc<input name="cc" defaultValue={c.cc} /></label>
          </div>
          <label>Subject<input name="subject" defaultValue={`Invoice ${inv.number} from ${seller.business_name}`} /></label>
          <label>Message<textarea name="message" defaultValue={defaultEmailText(inv, seller)} /></label>
          <div><button type="submit">Send with PDF attached</button></div>
        </form>
      </div>

      <div className="row">
        {inv.status !== 'paid' && (
          <form action={markPaid.bind(null, inv.id)}><button type="submit" className="ghost">Mark as paid</button></form>
        )}
        <details>
          <summary>Delete</summary>
          <form action={deleteInvoice.bind(null, inv.id)}>
            <button type="submit" className="danger">Delete {inv.number} permanently</button>
          </form>
        </details>
      </div>
    </>
  );
}
