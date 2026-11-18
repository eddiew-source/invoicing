// Pure helpers, safe to import from both server and client code.

export const CURRENCIES = [
  'GBP', 'EUR', 'USD', 'CAD', 'AUD', 'NZD', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'RON',
  'TRY', 'AED', 'SAR', 'ZAR', 'INR', 'SGD', 'HKD', 'JPY', 'CNY', 'BRL', 'MXN',
];

export function decimals(currency) {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits;
  } catch {
    return 2;
  }
}

export function round(n, currency = 'GBP') {
  const f = 10 ** decimals(currency);
  return Math.round((Number(n) + Number.EPSILON) * f) / f;
}

export function calcTotals(items, taxRate, currency) {
  const lines = (items || []).map((i) => round((Number(i.quantity) || 0) * (Number(i.unit_price) || 0), currency));
  const subtotal = round(lines.reduce((a, b) => a + b, 0), currency);
  const tax = round((subtotal * (Number(taxRate) || 0)) / 100, currency);
  return { lines, subtotal, tax, total: round(subtotal + tax, currency) };
}

// £ € $ get symbols; everything else shows its ISO code (unambiguous, and safe in PDF fonts)
export function formatMoney(n, currency) {
  const symbolic = ['GBP', 'EUR', 'USD'].includes(currency);
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    currencyDisplay: symbolic ? 'narrowSymbol' : 'code',
  })
    .format(Number(n) || 0)
    .replace(/\u00A0/g, ' ');
}

export function toISODate(v) {
  if (!v) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

export function addDays(iso, days) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00Z');
  if (isNaN(d)) return '';
  d.setUTCDate(d.getUTCDate() + Number(days || 0));
  return d.toISOString().slice(0, 10);
}

export function fmtDate(v) {
  const iso = toISODate(v);
  if (!iso) return '';
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });
}

export function defaultEmailText(invoice, seller) {
  const t = calcTotals(invoice.items, invoice.tax_rate, invoice.currency);
  return `Hi ${invoice.client_snapshot.name},\n\nPlease find attached invoice ${invoice.number} for ${formatMoney(t.total, invoice.currency)}, due on ${fmtDate(invoice.due_date)}.\n\nKind regards,\n${seller.business_name}`;
}
