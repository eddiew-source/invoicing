import postgres from 'postgres';

const SCHEMA = `
create table if not exists settings (
  id int primary key default 1 check (id = 1),
  business_name text not null default '',
  address text not null default '',
  email text not null default '',
  tax_id text not null default '',
  payment_details text not null default '',
  footer_note text not null default '',
  default_currency text not null default 'GBP',
  default_terms_days int not null default 14,
  default_tax_rate numeric not null default 0,
  tax_label text not null default 'VAT',
  invoice_prefix text not null default 'INV-',
  next_number int not null default 1
);
insert into settings (id) values (1) on conflict do nothing;

create table if not exists clients (
  id serial primary key,
  name text not null,
  email text not null default '',
  cc text not null default '',
  address text not null default '',
  tax_id text not null default '',
  currency text,
  created_at timestamptz not null default now()
);

create table if not exists invoices (
  id serial primary key,
  number text not null unique,
  client_id int references clients(id) on delete set null,
  client_snapshot jsonb not null,
  issue_date date not null,
  due_date date not null,
  currency text not null,
  tax_rate numeric not null default 0,
  tax_label text not null default 'VAT',
  items jsonb not null default '[]',
  notes text not null default '',
  status text not null default 'draft',
  sent_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
`;

function connect() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
  return postgres(process.env.DATABASE_URL, {
    ssl: process.env.DATABASE_SSL === 'false' ? false : 'require',
    max: 1,
    idle_timeout: 20,
    connect_timeout: 15,
    prepare: false, // works with pooled connections (Neon, Supabase)
    types: {
      // return DATE columns as 'YYYY-MM-DD' strings and numeric as numbers
      dateString: { to: 1082, from: [1082], serialize: (x) => x, parse: (x) => x },
      numberNumeric: { to: 1700, from: [1700], serialize: (x) => String(x), parse: (x) => Number(x) },
    },
  });
}

const g = globalThis;

// Returns a ready sql client; creates tables on first use.
export async function getDb() {
  g.__invoiceSql ??= connect();
  g.__invoiceReady ??= g.__invoiceSql
    .unsafe(SCHEMA)
    .then(() => true)
    .catch((e) => {
      g.__invoiceReady = undefined;
      throw e;
    });
  await g.__invoiceReady;
  return g.__invoiceSql;
}
