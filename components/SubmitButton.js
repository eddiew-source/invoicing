'use client';

import { useFormStatus } from 'react-dom';

// Submit button that disables itself and shows progress text while the form action runs
export default function SubmitButton({ children, pendingText = 'Saving…', className = '' }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending}>
      {pending ? pendingText : children}
    </button>
  );
}
