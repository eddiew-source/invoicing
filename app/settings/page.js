import { getDb } from '@/lib/db';
import { saveSettings } from '@/app/actions';
import { CURRENCIES } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function Settings() {
  const sql = await getDb();
  const [s] = await sql`select * from settings where id = 1`;
  return (
    <>
      <h1>Settings</h1>
      <form action={saveSettings} className="stack">
        <div className="card stack">
          <strong>Your business</strong>
          <div className="grid2">
            <label>Business name<input name="business_name" defaultValue={s.business_name} /></label>
            <label>Contact email (reply-to)<input name="email" type="email" defaultValue={s.email} /></label>
            <label>Tax / VAT number<input name="tax_id" defaultValue={s.tax_id} /></label>
          </div>
          <label>Address<textarea name="address" defaultValue={s.address} /></label>
          <label>Payment details (bank account, IBAN, SWIFT, etc.)
            <textarea name="payment_details" defaultValue={s.payment_details} />
          </label>
          <label>Footer line on invoice<input name="footer_note" defaultValue={s.footer_note} /></label>
        </div>

        <div className="card grid2">
          <label>Default currency
            <select name="default_currency" defaultValue={s.default_currency}>
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label>Payment terms (days)<input name="default_terms_days" type="number" min="0" defaultValue={s.default_terms_days} /></label>
          <label>Default tax rate (%)<input name="default_tax_rate" type="number" step="any" min="0" defaultValue={s.default_tax_rate} /></label>
          <label>Tax name<input name="tax_label" defaultValue={s.tax_label} /></label>
          <label>Invoice prefix<input name="invoice_prefix" defaultValue={s.invoice_prefix} /></label>
          <label>Next invoice number<input name="next_number" type="number" min="1" defaultValue={s.next_number} /></label>
        </div>
        <div><button type="submit">Save settings</button></div>
      </form>
    </>
  );
}
