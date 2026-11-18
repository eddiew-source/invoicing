import { NextResponse } from 'next/server';

// Whole app sits behind HTTP basic auth. Set APP_PASSWORD (and optionally APP_USER).
export function middleware(req) {
  const user = process.env.APP_USER || 'admin';
  const pass = process.env.APP_PASSWORD;
  if (!pass) return new NextResponse('APP_PASSWORD is not set', { status: 500 });

  const header = req.headers.get('authorization') || '';
  const [scheme, encoded] = header.split(' ');
  if (scheme === 'Basic' && encoded) {
    try {
      const decoded = atob(encoded);
      const i = decoded.indexOf(':');
      if (decoded.slice(0, i) === user && decoded.slice(i + 1) === pass) return NextResponse.next();
    } catch {}
  }
  return new NextResponse('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Invoices"' },
  });
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
