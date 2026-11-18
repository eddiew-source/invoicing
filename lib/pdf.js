import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { calcTotals, formatMoney, fmtDate } from './format';

const A4 = [595.28, 841.89];
const M = 50;

// Standard PDF fonts only cover Latin-1 + €, so swap anything else for '?'
function clean(s = '') {
  return String(s)
    .replace(/\r/g, '')
    .replace(/\t/g, ' ')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u00A0/g, ' ')
    .replace(/[^\n\u0020-\u007E\u00A1-\u00FF\u20AC]/g, '?');
}

function wrap(text, font, size, maxW) {
  const out = [];
  for (const para of clean(text).split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const test = line ? line + ' ' + word : word;
      if (font.widthOfTextAtSize(test, size) <= maxW) line = test;
      else {
        if (line) out.push(line);
        line = word;
      }
    }
    out.push(line);
  }
  return out;
}

export async function renderInvoicePdf({ invoice, seller }) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Invoice ${invoice.number}`);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const [W, H] = A4;
  let page = pdf.addPage(A4);
  let y = H - M;

  const dark = rgb(0.1, 0.1, 0.12);
  const grey = rgb(0.42, 0.44, 0.48);
  const rule = rgb(0.86, 0.87, 0.89);
  const accent = rgb(0.12, 0.23, 0.41);
  const tint = rgb(0.95, 0.96, 0.98);

  const text = (t, x, yy, { size = 10, f = font, color = dark, align = 'left' } = {}) => {
    const s = clean(t);
    const w = f.widthOfTextAtSize(s, size);
    page.drawText(s, { x: align === 'right' ? x - w : x, y: yy, size, font: f, color });
  };
  const ensure = (h) => {
    if (y - h < M) {
      page = pdf.addPage(A4);
      y = H - M;
    }
  };

  const cur = invoice.currency;
  const money = (n) => formatMoney(n, cur);
  const totals = calcTotals(invoice.items, invoice.tax_rate, cur);
  const client = invoice.client_snapshot || {};

  // --- Header: seller (left), invoice meta (right)
  text(seller.business_name || 'Your business', M, y - 14, { size: 16, f: bold, color: accent });
  let ly = y - 32;
  const sellerLines = wrap(
    [seller.address, seller.email, seller.tax_id && `Tax ID: ${seller.tax_id}`].filter(Boolean).join('\n'),
    font, 9, 250
  );
  for (const l of sellerLines) {
    text(l, M, ly, { size: 9, color: grey });
    ly -= 12;
  }

  text('INVOICE', W - M, y - 16, { size: 24, f: bold, align: 'right' });
  let ry = y - 38;
  for (const [k, v] of [
    ['Invoice no.', invoice.number],
    ['Issue date', fmtDate(invoice.issue_date)],
    ['Due date', fmtDate(invoice.due_date)],
  ]) {
    text(k, W - M - 105, ry, { size: 9, color: grey, align: 'right' });
    text(v, W - M, ry, { size: 10, f: bold, align: 'right' });
    ry -= 14;
  }
  y = Math.min(ly, ry) - 26;

  // --- Bill to
  text('Bill to', M, y, { size: 9, f: bold, color: grey });
  y -= 15;
  text(client.name || '', M, y, { size: 11, f: bold });
  y -= 14;
  for (const l of wrap([client.address, client.tax_id && `Tax ID: ${client.tax_id}`].filter(Boolean).join('\n'), font, 10, 300)) {
    text(l, M, y);
    y -= 13;
  }
  y -= 18;

  // --- Items table
  const colQty = 365;
  const colUnit = 455;
  const colAmt = W - M;

  const tableHeader = () => {
    page.drawRectangle({ x: M, y: y - 6, width: W - 2 * M, height: 20, color: tint });
    text('Description', M + 6, y, { size: 9, f: bold, color: grey });
    text('Qty', colQty, y, { size: 9, f: bold, color: grey, align: 'right' });
    text('Unit price', colUnit, y, { size: 9, f: bold, color: grey, align: 'right' });
    text('Amount', colAmt - 6, y, { size: 9, f: bold, color: grey, align: 'right' });
    y -= 22;
  };
  tableHeader();

  invoice.items.forEach((it, idx) => {
    const lines = wrap(it.description, font, 10, 250);
    const detailLines = it.details ? wrap(it.details, font, 9, 250) : [];
    const h = lines.length * 13 + detailLines.length * 12 + 10;
    if (y - h < M + 40) {
      page = pdf.addPage(A4);
      y = H - M;
      tableHeader();
    }
    lines.forEach((l, i) => text(l, M + 6, y - i * 13));
    detailLines.forEach((l, i) => text(l, M + 6, y - lines.length * 13 + 1 - i * 12, { size: 9, color: grey }));
    text(String(Number(it.quantity)), colQty, y, { align: 'right' });
    text(money(it.unit_price), colUnit, y, { align: 'right' });
    text(money(totals.lines[idx]), colAmt - 6, y, { align: 'right' });
    y -= h;
    page.drawLine({ start: { x: M, y: y + 11 }, end: { x: W - M, y: y + 11 }, thickness: 0.5, color: rule });
  });

  // --- Totals
  ensure(90);
  y -= 6;
  const totalsRow = (label, value, big = false) => {
    const size = big ? 12 : 10;
    const f = big ? bold : font;
    text(label, colUnit, y, { size, f, color: big ? dark : grey, align: 'right' });
    text(value, colAmt - 6, y, { size, f, align: 'right' });
    y -= big ? 20 : 16;
  };
  totalsRow('Subtotal', money(totals.subtotal));
  if (Number(invoice.tax_rate) > 0) {
    totalsRow(`${invoice.tax_label || 'Tax'} (${Number(invoice.tax_rate)}%)`, money(totals.tax));
  }
  page.drawLine({ start: { x: colUnit - 120, y: y + 12 }, end: { x: W - M, y: y + 12 }, thickness: 0.75, color: dark });
  y -= 4;
  totalsRow(`Total ${cur}`, money(totals.total), true);
  y -= 14;

  // --- Text blocks
  const block = (title, body) => {
    if (!body || !String(body).trim()) return;
    const lines = wrap(body, font, 10, W - 2 * M);
    ensure(30 + lines.length * 13);
    text(title, M, y, { size: 9, f: bold, color: grey });
    y -= 15;
    for (const l of lines) {
      text(l, M, y);
      y -= 13;
    }
    y -= 14;
  };
  block('Payment details', seller.payment_details);
  block('Notes', invoice.notes);

  // --- Footer on the last page
  if (seller.footer_note) {
    const lines = wrap(seller.footer_note, font, 8.5, W - 2 * M).slice(0, 2);
    lines.forEach((l, i) => {
      const w = font.widthOfTextAtSize(clean(l), 8.5);
      page.drawText(clean(l), { x: (W - w) / 2, y: 36 - i * 11, size: 8.5, font, color: grey });
    });
  }

  return await pdf.save();
}
