import { NextRequest, NextResponse } from 'next/server';

export function verifyAuth(request: NextRequest): NextResponse | null {
  const authHeader = request.headers.get('authorization');
  const secret = process.env.API_SECRET;

  if (!secret) return null; // no auth configured — allow

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized', message: 'Missing Authorization header' }, { status: 401 });
  }

  const token = authHeader.slice(7);
  if (token !== secret) {
    return NextResponse.json({ error: 'Forbidden', message: 'Invalid API secret' }, { status: 403 });
  }

  return null; // auth passed
}
