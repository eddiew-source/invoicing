# Simple Invoices

Create invoices in any currency, download them as PDF, and email them with the PDF attached.
Next.js + Postgres + SMTP. Tables are created automatically on first load.

## 1. Database (free)

**Neon (easiest with Vercel):** create a free project at neon.tech, copy the connection string
(the pooled one is fine) into `DATABASE_URL`.

**Home server instead:** run Postgres, e.g.

    docker run -d --name invoices-db --restart unless-stopped \
      -e POSTGRES_PASSWORD=change-me -e POSTGRES_DB=invoices \
      -v invoices-data:/var/lib/postgresql/data -p 5432:5432 postgres:16

and set `DATABASE_URL=postgres://postgres:change-me@HOST:5432/invoices` and `DATABASE_SSL=false`.
Vercel can only reach it if it is exposed to the internet, so for a home DB it is simpler to run
the app there too: `npm install && npm run build && npm start` (or put it behind a reverse proxy).

## 2. Email

Any SMTP account works: your own mailbox, Gmail/Workspace app password, or Resend's SMTP
(host `smtp.resend.com`, port 465, user `resend`, password = API key; free tier is plenty).

## 3. Deploy to Vercel

1. Push this folder to a Git repo and import it in Vercel (framework: Next.js).
2. Add the environment variables from `.env.example` in Project Settings > Environment Variables.
3. Deploy, open the site, sign in with `APP_USER` / `APP_PASSWORD`.
4. Go to **Settings** (your business and bank details), then **Clients**, then **New invoice**.

## Local run

    cp .env.example .env.local   # fill it in
    npm install
    npm run dev

## Notes

- Each month: open last month's invoice and press **Copy to new**, change the description/dates, save, send.
- Invoice numbers are assigned on save (prefix + counter, editable in Settings).
- Invoices keep a snapshot of the client details at save time.
- PDFs use standard fonts, so £ € $ show as symbols and other currencies show as their code (CHF 1,234.50).
  Non-Latin text in descriptions will show as "?".
- The whole app sits behind a basic-auth prompt (middleware.js). Use a long password and keep HTTPS on.
