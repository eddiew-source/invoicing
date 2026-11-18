'use client';

import { useState } from 'react';
import { saveInvoice } from '@/app/actions';
import { CURRENCIES, calcTotals, formatMoney, addDays, toISODate } from '@/lib/format';

const blankItem = () => ({ description: '', details: '', quantity: 1, unit_price: '' });

export default function InvoiceForm({ id, initial, clients, settings, today }) {
  const startClient = String(initial?.client_id ?? clients[0]?.id ?? '');
  const clientById = (cid) => clients.find((c) => String(c.id) === String(cid));

  const [clientId, setClientId] = useState(startClient);
  const [currency, setCurrency] = useState(
    initial?.currency ?? clientById(startClient)?.currency ?? settings.default_currency
  );
  const [issue, setIssue] = useState(id ? toISODate(initial.issue_date) : today);
  const [due, setDue] = useState(id ? toISODate(initial.due_date) : addDays(today, settings.default_terms_days));
  const [taxRate, setTaxRate] = useState(initial?.tax_rate ?? settings.default_tax_rate);
  const [taxLabel, setTaxLabel] = useState(initial?.tax_label ?? settings.tax_label);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [items, setItems] = useState(
    initial?.items?.length ? initial.items.map((i) => ({ ...i })) : [blankItem()]
  );

  const totals = calcTotals(items, taxRate, currency);
  const setItem = (i, patch) => setItems(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));

  function onClient(e) {
    const next = e.target.value;
    setClientId(next);
    const c = clientById(next);
    if (!id && c?.currency) setCurrency(c.currency);
  }

  return (
    <form action={saveInvoice} className="stack">
      {id ? <input type="hidden" name="id" value={id} /> : null}
      <input type="hidden" name="items" value={JSON.stringify(items)} />

      <div className="card grid2">
        <label>
          Client
          <select name="client_id" required value={clientId} onChange={onClient}>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label>
          Currency
          <select name="currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Issue date
          <input
            type="date" name="issue_date" required value={issue}
            onChange={(e) => {
              setIssue(e.target.value);
              setDue(addDays(e.target.value, settings.default_terms_days));
            }}
          />
        </label>
        <label>
          Due date
          <input type="date" name="due_date" required value={due} onChange={(e) => setDue(e.target.value)} />
        </label>
        <label>
          Tax rate (%)
          <input type="number" name="tax_rate" step="any" min="0" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
        </label>
        <label>
          Tax name
          <input name="tax_label" value={taxLabel} onChange={(e) => setTaxLabel(e.target.value)} />
        </label>
      </div>

      <div className="card stack">
        <strong>Line items</strong>
        {items.map((it, i) => (
          <div className="itemblock" key={i}>
          <div className="item">
            <input
              placeholder="Item" value={it.description}
              onChange={(e) => setItem(i, { description: e.target.value })}
            />
            <input
              type="number" step="any" placeholder="Qty" value={it.quantity}
              onChange={(e) => setItem(i, { quantity: e.target.value })}
            />
            <input
              type="number" step="any" placeholder="Unit price" title="Use a negative number for a deduction or credit" value={it.unit_price}
              onChange={(e) => setItem(i, { unit_price: e.target.value })}
            />
            <span className="amt">{formatMoney(totals.lines[i], currency)}</span>
            <button
              type="button" className="ghost" aria-label="Remove line"
              onClick={() => setItems(items.length > 1 ? items.filter((_, j) => j !== i) : [blankItem()])}
            >
              ×
            </button>
          </div>
          <textarea
            className="details" rows={2} placeholder="Details shown under the item (optional)"
            value={it.details || ''} onChange={(e) => setItem(i, { details: e.target.value })}
          />
          </div>
        ))}
        <div>
          <button type="button" className="ghost" onClick={() => setItems([...items, blankItem()])}>
            Add line
          </button>
        </div>
        <div className="totals">
          <div><span className="muted">Subtotal</span><span>{formatMoney(totals.subtotal, currency)}</span></div>
          {Number(taxRate) > 0 && (
            <div><span className="muted">{taxLabel} ({Number(taxRate)}%)</span><span>{formatMoney(totals.tax, currency)}</span></div>
          )}
          <div><strong>Total</strong><strong>{formatMoney(totals.total, currency)}</strong></div>
        </div>
      </div>

      <label>
        Notes (shown on the invoice)
        <textarea name="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>

      <div>
        <button type="submit">Save invoice</button>
      </div>
    </form>
  );
}
