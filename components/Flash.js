'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';

const OK = {
  settings: 'Settings saved',
  client: 'Client saved',
  'client-added': 'Client added',
  invoice: 'Invoice saved',
  sent: 'Invoice emailed',
  paid: 'Marked as paid',
  deleted: 'Invoice deleted',
};
const ERR = { send: 'Email could not be sent' };

// Reads ?ok=… / ?err=… set by server actions, shows a bar, then cleans the URL
export default function Flash() {
  const sp = useSearchParams();
  const ok = sp.get('ok');
  const err = sp.get('err');
  const n = sp.get('n');
  const detail = sp.get('detail');
  const [msg, setMsg] = useState(null);
  const timer = useRef(null);

  useEffect(() => {
    if (!ok && !err) return;
    clearTimeout(timer.current);
    setMsg(
      err
        ? { kind: 'err', text: ERR[err] || 'Something went wrong', detail }
        : { kind: 'ok', text: OK[ok] || 'Done' }
    );
    const url = new URL(window.location.href);
    ['ok', 'err', 'n', 'detail'].forEach((k) => url.searchParams.delete(k));
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    timer.current = setTimeout(() => setMsg(null), err ? 15000 : 4000);
  }, [ok, err, n, detail]);

  if (!msg) return null;
  return (
    <div className={`flash ${msg.kind}`} role={msg.kind === 'err' ? 'alert' : 'status'}>
      <span>
        {msg.kind === 'ok' ? '✓ ' : '✕ '}
        {msg.text}
        {msg.detail ? <span className="flash-detail"> {msg.detail}</span> : null}
      </span>
      <button type="button" aria-label="Dismiss" onClick={() => setMsg(null)}>×</button>
    </div>
  );
}
