'use client';

export default function ErrorPage({ error, reset }) {
  return (
    <div className="card stack">
      <h1>Something went wrong</h1>
      <p className="muted">
        {error?.message || 'Unexpected error.'} If this keeps happening, check the logs in Vercel.
      </p>
      <div><button type="button" onClick={() => reset()}>Try again</button></div>
    </div>
  );
}
