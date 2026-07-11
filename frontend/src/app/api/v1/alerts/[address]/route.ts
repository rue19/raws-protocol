import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/keeper/db';
import { ratelimit } from '@/lib/ratelimit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1';
  const { success } = await ratelimit.limit(ip);
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const { address } = await params;

  const { data, error } = await db
    .from('alerts')
    .select('*')
    .eq('user_address', address)
    .eq('is_read', false)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ statusCode: 500, error: 'DatabaseError', message: error.message }, { status: 500 });
  }

  return NextResponse.json({ address, alerts: data ?? [], count: data?.length ?? 0 });
}
