import Link from 'next/link';
import { getDb } from '@/lib/db';
import { calcTotals, formatMoney, toISODate } from '@/lib/format';

export const dynamic = 'force-dynamic';

const RANGES = [
  ['12m', 'Last 12 months'],
  ['year', 'This year'],
  ['taxyear', 'This tax year (UK)'],
  ['lasttaxyear', 'Last tax year'],
  ['all', 'All time'],
];

function rangeBounds(range, today, firstISO) {
  const y = Number(today.slice(0, 4));
  if (range === 'year') return [`${y}-01-01`, `${y}-12-31`];
  if (range === 'taxyear' || range === 'lasttaxyear') {
    const startYear = today >= `${y}-04-06` ? y : y - 1;
    const sy = range === 'taxyear' ? startYear : startYear - 1;
    return [`${sy}-04-06`, `${sy + 1}-04-05`];
  }
  if (range === 'all') return [firstISO || today, today];
  const d = new Date(today + 'T00:00:00Z');
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - 11);
  return [d.toISOString().slice(0, 10), today];
}

function monthsBetween(startISO, endISO) {
  const out = [];
  let [y, m] = startISO.slice(0, 7).split('-').map(Number);
  const [ey, em] = endISO.slice(0, 7).split('-').map(Number);
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return out.slice(-36);
}

const monthName = (ym) =>
  new Date(ym + '-01T00:00:00Z').toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' });
const monthLong = (ym) =>
  new Date(ym + '-01T00:00:00Z').toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });

const compact = (n) => new Intl.NumberFormat('en-GB', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

function niceMax(v) {
  const mag = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * mag >= v) return m * mag;
  return 10 * mag;
}

function MonthlyChart({ months, data, currency }) {
  const W = 760, H = 230, L = 46, R = 8, T = 10, B = 30;
  const totals = months.map((m) => Math.max(0, (data[m]?.paid || 0)) + Math.max(0, (data[m]?.open || 0)));
  const top = niceMax(Math.max(1, ...totals));
  const iw = W - L - R, ih = H - T - B;
  const bw = iw / months.length;
  const barW = Math.min(38, bw * 0.7);
  const y = (v) => T + ih - (v / top) * ih;
  const every = months.length > 24 ? 3 : months.length > 14 ? 2 : 1;

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Invoiced per month in ${currency}`}>
      {[0, top / 2, top].map((v) => (
        <g key={v}>
          <line className="grid" x1={L} x2={W - R} y1={y(v)} y2={y(v)} />
          <text className="axis" x={L - 6} y={y(v) + 3} textAnchor="end">{compact(v)}</text>
        </g>
      ))}
      {months.map((m, i) => {
        const paid = Math.max(0, data[m]?.paid || 0);
        const open = Math.max(0, data[m]?.open || 0);
        const x = L + i * bw + (bw - barW) / 2;
        const label = i % every === 0
          ? i === 0 || m.endsWith('-01') ? `${monthName(m)} ’${m.slice(2, 4)}` : monthName(m)
          : '';
        return (
          <g key={m}>
            <title>{`${monthLong(m)}: ${formatMoney((data[m]?.paid || 0) + (data[m]?.open || 0), currency)} invoiced`}</title>
            <rect className="b-paid" x={x} y={y(paid)} width={barW} height={Math.max(0, (paid / top) * ih)} rx="2" />
            <rect className="b-open" x={x} y={y(paid + open)} width={barW} height={Math.max(0, (open / top) * ih)} rx="2" />
            <text className="axis" x={x + barW / 2} y={H - 10} textAnchor="middle">{label}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default async function Analytics({ searchParams }) {
  const sp = await searchParams;
  const sql = await getDb();
  const rows = await sql`select id, client_id, client_snapshot, issue_date, due_date, currency,
                                tax_rate, items, status, paid_at from invoices order by issue_date`;
  const today = new Date().toISOString().slice(0, 10);
  const active = rows.filter((r) => r.status !== 'draft');
  const draftCount = rows.length - active.length;

  if (active.length === 0) {
    return (
      <>
        <h1>Analytics</h1>
        <div className="notice">
          Nothing to show yet. Invoices count here once they are emailed or marked as paid
          {draftCount ? ` (${draftCount} draft${draftCount > 1 ? 's' : ''} excluded)` : ''}.
        </div>
      </>
    );
  }

  // Currency: most-used first; figures are never mixed across currencies
  const counts = {};
  for (const r of active) counts[r.currency] = (counts[r.currency] || 0) + 1;
  const currencies = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  const currency = currencies.includes(sp?.currency) ? sp.currency : currencies[0];
  const range = RANGES.some(([k]) => k === sp?.range) ? sp.range : '12m';

  const firstISO = toISODate(active.filter((r) => r.currency === currency)[0]?.issue_date);
  const [start, end] = rangeBounds(range, today, firstISO);

  const inv = active
    .filter((r) => r.currency === currency)
    .filter((r) => {
      const d = toISODate(r.issue_date);
      return d >= start && d <= end;
    })
    .map((r) => {
      const t = calcTotals(r.items, r.tax_rate, r.currency);
      const paid = r.status === 'paid';
      const overdue = r.status === 'sent' && toISODate(r.due_date) < today;
      const days = paid && r.paid_at
        ? Math.max(0, Math.round((new Date(r.paid_at) - new Date(toISODate(r.issue_date) + 'T00:00:00Z')) / 86400000))
        : null;
      return { ...r, total: t.total, tax: t.tax, paid, overdue, days, month: toISODate(r.issue_date).slice(0, 7) };
    });

  const sum = (list, f = (x) => x.total) => list.reduce((a, b) => a + f(b), 0);
  const invoiced = sum(inv);
  const paidAmt = sum(inv.filter((i) => i.paid));
  const outstanding = sum(inv.filter((i) => !i.paid));
  const overdueAmt = sum(inv.filter((i) => i.overdue));
  const taxAmt = sum(inv, (i) => i.tax);
  const dayList = inv.map((i) => i.days).filter((d) => d !== null);
  const avgDays = dayList.length ? Math.round(dayList.reduce((a, b) => a + b, 0) / dayList.length) : null;
  const money = (n) => formatMoney(n, currency);

  // Monthly
  const months = monthsBetween(start, end);
  const monthly = {};
  for (const i of inv) {
    monthly[i.month] ??= { paid: 0, open: 0 };
    monthly[i.month][i.paid ? 'paid' : 'open'] += i.total;
  }

  // Per client
  const byClient = {};
  for (const i of inv) {
    const key = i.client_id ?? `n:${i.client_snapshot?.name}`;
    const c = (byClient[key] ??= { name: i.client_snapshot?.name || 'Unknown', count: 0, invoiced: 0, paid: 0, open: 0, days: [] });
    c.count++;
    c.invoiced += i.total;
    if (i.paid) c.paid += i.total; else c.open += i.total;
    if (i.days !== null) c.days.push(i.days);
  }
  const clients = Object.values(byClient).sort((a, b) => b.invoiced - a.invoiced);
  const maxClient = Math.max(1, ...clients.map((c) => Math.max(0, c.invoiced)));

  const href = (r, c) => `/analytics?range=${r}&currency=${c}`;

  return (
    <>
      <h1>Analytics</h1>

      <div className="pills">
        {RANGES.map(([k, label]) => (
          <Link key={k} href={href(k, currency)} className={`pill ${k === range ? 'active' : ''}`}>{label}</Link>
        ))}
      </div>
      {currencies.length > 1 && (
        <div className="pills">
          {currencies.map((c) => (
            <Link key={c} href={href(range, c)} className={`pill ${c === currency ? 'active' : ''}`}>{c}</Link>
          ))}
        </div>
      )}

      {inv.length === 0 ? (
        <div className="notice">No {currency} invoices in this period.</div>
      ) : (
        <>
          <div className="kpis">
            <div className="kpi"><div className="label">Invoiced</div><div className="value">{money(invoiced)}</div></div>
            <div className="kpi"><div className="label">Paid</div><div className="value">{money(paidAmt)}</div></div>
            <div className="kpi"><div className="label">Outstanding</div><div className="value">{money(outstanding)}</div></div>
            <div className={`kpi ${overdueAmt > 0 ? 'warn' : ''}`}><div className="label">Overdue</div><div className="value">{money(overdueAmt)}</div></div>
            <div className="kpi"><div className="label">Invoices</div><div className="value">{inv.length}</div></div>
            <div className="kpi"><div className="label">Average invoice</div><div className="value">{money(invoiced / inv.length)}</div></div>
          </div>

          <div className="card">
            <h2 style={{ marginTop: 0 }}>Invoiced per month</h2>
            <div className="legend"><span><i />Paid</span><span><i className="open" />Not yet paid</span></div>
            <MonthlyChart months={months} data={monthly} currency={currency} />
          </div>

          <div className="card">
            <h2 style={{ marginTop: 0 }}>By client</h2>
            {clients.slice(0, 10).map((c) => (
              <div className="cbar" key={c.name}>
                <div className="cname" title={c.name}>{c.name}</div>
                <div className="track">
                  <div className="seg-paid" style={{ width: `${(Math.max(0, c.paid) / maxClient) * 100}%` }} />
                  <div className="seg-open" style={{ width: `${(Math.max(0, c.open) / maxClient) * 100}%` }} />
                </div>
                <div className="cval">{money(c.invoiced)}</div>
              </div>
            ))}
            <div className="scroll" style={{ marginTop: 12 }}>
              <table>
                <thead>
                  <tr>
                    <th>Client</th><th className="num">Invoices</th><th className="num">Invoiced</th>
                    <th className="num">Paid</th><th className="num">Outstanding</th>
                    <th className="num" title="Days from issue date to when it was marked as paid">Avg days to pay</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c) => (
                    <tr key={c.name}>
                      <td>{c.name}</td>
                      <td className="num">{c.count}</td>
                      <td className="num">{money(c.invoiced)}</td>
                      <td className="num">{money(c.paid)}</td>
                      <td className="num">{money(c.open)}</td>
                      <td className="num">{c.days.length ? Math.round(c.days.reduce((a, b) => a + b, 0) / c.days.length) : '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="muted" style={{ fontSize: 13 }}>
            Figures include tax{taxAmt ? ` (${money(taxAmt)} in this period)` : ''} and are grouped by invoice issue date.
            {avgDays !== null ? ` Average ${avgDays} days from issue to marked paid.` : ''}
            {draftCount ? ` ${draftCount} draft${draftCount > 1 ? 's' : ''} excluded.` : ''}
            {currencies.length > 1 ? ' Currencies are never added together; switch currency above.' : ''}
          </p>
        </>
      )}
    </>
  );
}
