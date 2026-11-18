import Link from 'next/link';
import { getDb } from '@/lib/db';
import { calcTotals, formatMoney, fmtDate, toISODate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const sql = await getDb();
  const [settings] = await sql`select * from settings where id = 1`;
  const invoices = await sql`select * from invoices order by issue_date desc, id desc limit 200`;
  const today = new Date().toISOString().slice(0, 10);

  const rows = invoices.map((i) => ({
    ...i,
    total: calcTotals(i.items, i.tax_rate, i.currency).total,
    overdue: i.status === 'sent' && toISODate(i.due_date) < today,
  }));
  const outstanding = {};
  for (const r of rows) if (r.status !== 'paid') outstanding[r.currency] = (outstanding[r.currency] || 0) + r.total;

  return (
    <>
      <div className="row">
        <h1>Invoices</h1>
        <Link className="btn" href="/invoices/new">New invoice</Link>
      </div>

      {!settings.business_name && (
        <div className="notice">
          Add your business name, address and payment details in <Link href="/settings">Settings</Link> so they appear on invoices.
        </div>
      )}

      {Object.keys(outstanding).length > 0 && (
        <div className="card">
          <span className="muted">Outstanding: </span>
          {Object.entries(outstanding).map(([cur, amt], i) => (
            <strong key={cur}>{i > 0 ? ', ' : ''}{formatMoney(amt, cur)}</strong>
          ))}
        </div>
      )}

      <div className="card scroll">
        {rows.length === 0 ? (
          <p className="muted">No invoices yet. Add a client, then create your first invoice.</p>
        ) : (
          <table>
            <thead>
              <tr><th>Number</th><th>Client</th><th>Due</th><th className="num">Total</th><th>Status</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const status = r.overdue ? 'overdue' : r.status;
                return (
                  <tr key={r.id}>
                    <td><Link href={`/invoices/${r.id}`}>{r.number}</Link></td>
                    <td>{r.client_snapshot.name}</td>
                    <td>{fmtDate(r.due_date)}</td>
                    <td className="num">{formatMoney(r.total, r.currency)}</td>
                    <td><span className={`badge ${status}`}>{status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
