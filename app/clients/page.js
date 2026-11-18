import { getDb } from '@/lib/db';
import { saveClient } from '@/app/actions';
import SubmitButton from '@/components/SubmitButton';
import { CURRENCIES } from '@/lib/format';

export const dynamic = 'force-dynamic';

function ClientForm({ client, defaultCurrency }) {
  return (
    <form action={saveClient} className="stack">
      {client && <input type="hidden" name="id" value={client.id} />}
      <div className="grid2">
        <label>Name<input name="name" required defaultValue={client?.name ?? ''} /></label>
        <label>Invoice currency
          <select name="currency" defaultValue={client ? client.currency ?? '' : defaultCurrency}>
            <option value="">Follow my default ({defaultCurrency})</option>
            {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label>Email<input name="email" type="email" defaultValue={client?.email ?? ''} /></label>
        <label>Cc (comma separated)<input name="cc" defaultValue={client?.cc ?? ''} /></label>
        <label>Tax / VAT number<input name="tax_id" defaultValue={client?.tax_id ?? ''} /></label>
      </div>
      <label>Billing address<textarea name="address" defaultValue={client?.address ?? ''} /></label>
      <div><SubmitButton>{client ? 'Save client' : 'Add client'}</SubmitButton></div>
    </form>
  );
}

export default async function Clients() {
  const sql = await getDb();
  const clients = await sql`select * from clients order by name`;
  const [settings] = await sql`select default_currency from settings where id = 1`;
  const defaultCurrency = settings.default_currency;
  return (
    <>
      <h1>Clients</h1>
      <div className="card">
        <details open={clients.length === 0}>
          <summary>Add a client</summary>
          <div style={{ marginTop: 12 }}><ClientForm defaultCurrency={defaultCurrency} /></div>
        </details>
      </div>
      {clients.map((c) => (
        <div className="card" key={c.id}>
          <details>
            <summary>{c.name} <span className="muted">{c.email}</span></summary>
            <div style={{ marginTop: 12 }}><ClientForm client={c} defaultCurrency={defaultCurrency} /></div>
          </details>
        </div>
      ))}
    </>
  );
}
