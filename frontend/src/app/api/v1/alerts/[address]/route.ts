import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/keeper/auth';
import { db } from '@/lib/keeper/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const authError = verifyAuth(request);
  if (authError) return authError;

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
