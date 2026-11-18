import { getDb } from '@/lib/db';
import { saveClient } from '@/app/actions';
import { CURRENCIES } from '@/lib/format';

export const dynamic = 'force-dynamic';

function ClientForm({ client }) {
  return (
    <form action={saveClient} className="stack">
      {client && <input type="hidden" name="id" value={client.id} />}
      <div className="grid2">
        <label>Name<input name="name" required defaultValue={client?.name ?? ''} /></label>
        <label>Invoice currency
          <select name="currency" defaultValue={client?.currency ?? ''}>
            <option value="">Use my default</option>
            {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label>Email<input name="email" type="email" defaultValue={client?.email ?? ''} /></label>
        <label>Cc (comma separated)<input name="cc" defaultValue={client?.cc ?? ''} /></label>
        <label>Tax / VAT number<input name="tax_id" defaultValue={client?.tax_id ?? ''} /></label>
      </div>
      <label>Billing address<textarea name="address" defaultValue={client?.address ?? ''} /></label>
      <div><button type="submit">{client ? 'Save client' : 'Add client'}</button></div>
    </form>
  );
}

export default async function Clients() {
  const sql = await getDb();
  const clients = await sql`select * from clients order by name`;
  return (
    <>
      <h1>Clients</h1>
      <div className="card">
        <details open={clients.length === 0}>
          <summary>Add a client</summary>
          <div style={{ marginTop: 12 }}><ClientForm /></div>
        </details>
      </div>
      {clients.map((c) => (
        <div className="card" key={c.id}>
          <details>
            <summary>{c.name} <span className="muted">{c.email}</span></summary>
            <div style={{ marginTop: 12 }}><ClientForm client={c} /></div>
          </details>
        </div>
      ))}
    </>
  );
}
