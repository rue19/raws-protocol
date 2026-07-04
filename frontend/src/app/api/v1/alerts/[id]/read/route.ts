import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/keeper/auth';
import { db } from '@/lib/keeper/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = verifyAuth(request);
  if (authError) return authError;

  const { id } = await params;

  const { error } = await db
    .from('alerts')
    .update({ is_read: true })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ statusCode: 500, error: 'DatabaseError', message: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, id });
}
