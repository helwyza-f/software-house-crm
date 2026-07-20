import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_SECRET = process.env.SESSION_SECRET || 'crm-super-secret-key-32-chars-long!!';

// Web Crypto API HMAC SHA-256 verification (Edge Runtime compatible)
async function verifySignature(payloadBase64: string, signatureHex: string, secret: string) {
  try {
    const encoder = new TextEncoder();
    const keyBuf = encoder.encode(secret);
    const payloadBuf = encoder.encode(payloadBase64);

    const key = await crypto.subtle.importKey(
      'raw', 
      keyBuf, 
      { name: 'HMAC', hash: 'SHA-256' }, 
      false, 
      ['verify']
    );

    // Convert hex string back to Uint8Array
    const hexMatch = signatureHex.match(/.{1,2}/g);
    if (!hexMatch) return false;
    const sigBytes = new Uint8Array(hexMatch.map(byte => parseInt(byte, 16)));
    
    return await crypto.subtle.verify('HMAC', key, sigBytes, payloadBuf);
  } catch {
    return false;
  }
}

export default async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Exclude auth routes, static assets, and dev files
  if (
    path.startsWith('/login') || 
    path.startsWith('/_next') || 
    path.includes('.')
  ) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get('session');
  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const [payloadBase64, signature] = sessionCookie.value.split('.');
    if (!payloadBase64 || !signature) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    // Verify HMAC signature
    const isValid = await verifySignature(payloadBase64, signature, SESSION_SECRET);
    if (!isValid) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Decode base64 payload in Edge runtime
    const payloadJson = atob(payloadBase64);
    const payload = JSON.parse(payloadJson) as { id: number; username: string; role: 'admin' | 'staff' };

    // RBAC: staff is not allowed to access /settings or /edit/[id]
    if (payload.role !== 'admin') {
      if (path.startsWith('/settings') || path.startsWith('/edit')) {
        return NextResponse.redirect(new URL('/', request.url));
      }
    }

    return NextResponse.next();
  } catch (err) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
