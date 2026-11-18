'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getDb } from '@/lib/db';
import { renderInvoicePdf } from '@/lib/pdf';
import { sendInvoiceEmail } from '@/lib/mail';

const str = (fd, k) => String(fd.get(k) ?? '').trim();
const refresh = () => revalidatePath('/', 'layout');

export async function saveSettings(formData) {
  const sql = await getDb();
  await sql`
    update settings set
      business_name = ${str(formData, 'business_name')},
      address = ${str(formData, 'address')},
      email = ${str(formData, 'email')},
      tax_id = ${str(formData, 'tax_id')},
      payment_details = ${str(formData, 'payment_details')},
      footer_note = ${str(formData, 'footer_note')},
      default_currency = ${str(formData, 'default_currency') || 'GBP'},
      default_terms_days = ${Number(formData.get('default_terms_days')) || 14},
      default_tax_rate = ${Number(formData.get('default_tax_rate')) || 0},
      tax_label = ${str(formData, 'tax_label') || 'VAT'},
      invoice_prefix = ${str(formData, 'invoice_prefix')},
      next_number = ${Math.max(1, Number(formData.get('next_number')) || 1)}
    where id = 1`;
  refresh();
}

export async function saveClient(formData) {
  const sql = await getDb();
  const id = Number(formData.get('id')) || null;
  const v = {
    name: str(formData, 'name'),
    email: str(formData, 'email'),
    cc: str(formData, 'cc'),
    address: str(formData, 'address'),
    tax_id: str(formData, 'tax_id'),
    currency: str(formData, 'currency') || null,
  };
  if (!v.name) throw new Error('Client name is required');
  if (id) {
    await sql`update clients set name=${v.name}, email=${v.email}, cc=${v.cc}, address=${v.address},
              tax_id=${v.tax_id}, currency=${v.currency} where id=${id}`;
  } else {
    await sql`insert into clients (name, email, cc, address, tax_id, currency)
              values (${v.name}, ${v.email}, ${v.cc}, ${v.address}, ${v.tax_id}, ${v.currency})`;
  }
  refresh();
}

function parseItems(raw) {
  let items;
  try {
    items = JSON.parse(raw || '[]');
  } catch {
    items = [];
  }
  items = items
    .map((i) => ({
      description: String(i.description || '').trim(),
      details: String(i.details || '').trim(),
      quantity: Number(i.quantity) || 0,
      unit_price: Number(i.unit_price) || 0,
    }))
    .filter((i) => i.description);
  if (!items.length) throw new Error('Add at least one line item with a description');
  return items;
}

export async function saveInvoice(formData) {
  const sql = await getDb();
  const id = Number(formData.get('id')) || null;
  const clientId = Number(formData.get('client_id'));
  const [client] = await sql`select * from clients where id = ${clientId}`;
  if (!client) throw new Error('Choose a client');

  const snapshot = {
    name: client.name, email: client.email, cc: client.cc, address: client.address, tax_id: client.tax_id,
  };
  const v = {
    issue_date: str(formData, 'issue_date'),
    due_date: str(formData, 'due_date'),
    currency: str(formData, 'currency').toUpperCase() || 'GBP',
    tax_rate: Number(formData.get('tax_rate')) || 0,
    tax_label: str(formData, 'tax_label') || 'VAT',
    notes: str(formData, 'notes'),
    items: parseItems(formData.get('items')),
  };

  let invoiceId = id;
  if (id) {
    await sql`update invoices set
      client_id = ${clientId}, client_snapshot = ${sql.json(snapshot)},
      issue_date = ${v.issue_date}, due_date = ${v.due_date}, currency = ${v.currency},
      tax_rate = ${v.tax_rate}, tax_label = ${v.tax_label}, notes = ${v.notes},
      items = ${sql.json(v.items)}
      where id = ${id}`;
  } else {
    invoiceId = await sql.begin(async (tx) => {
      const [s] = await tx`update settings set next_number = next_number + 1 where id = 1
                           returning invoice_prefix, next_number - 1 as n`;
      const number = `${s.invoice_prefix}${String(s.n).padStart(4, '0')}`;
      const [row] = await tx`insert into invoices
        (number, client_id, client_snapshot, issue_date, due_date, currency, tax_rate, tax_label, notes, items)
        values (${number}, ${clientId}, ${tx.json(snapshot)}, ${v.issue_date}, ${v.due_date}, ${v.currency},
                ${v.tax_rate}, ${v.tax_label}, ${v.notes}, ${tx.json(v.items)})
        returning id`;
      return row.id;
    });
  }
  refresh();
  redirect(`/invoices/${invoiceId}`);
}

export async function sendInvoice(id, formData) {
  const sql = await getDb();
  const [invoice] = await sql`select * from invoices where id = ${id}`;
  const [seller] = await sql`select * from settings where id = 1`;
  if (!invoice) throw new Error('Invoice not found');

  const to = str(formData, 'to');
  if (!to) throw new Error('Recipient email is required');

  const pdf = await renderInvoicePdf({ invoice, seller });
  await sendInvoiceEmail({
    to,
    cc: str(formData, 'cc'),
    subject: str(formData, 'subject') || `Invoice ${invoice.number}`,
    text: String(formData.get('message') ?? ''),
    filename: `${invoice.number.replace(/[^\w.-]+/g, '_')}.pdf`,
    pdf,
    replyTo: seller.email || undefined,
  });
  await sql`update invoices set sent_at = now(),
            status = case when status = 'paid' then status else 'sent' end where id = ${id}`;
  refresh();
  redirect(`/invoices/${id}?sent=1`);
}

export async function markPaid(id) {
  const sql = await getDb();
  await sql`update invoices set status = 'paid', paid_at = now() where id = ${id}`;
  refresh();
}

export async function deleteInvoice(id) {
  const sql = await getDb();
  await sql`delete from invoices where id = ${id}`;
  refresh();
  redirect('/');
}
