import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/keeper/db';
import { ratelimit } from '@/lib/ratelimit';

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1';
  const { success } = await ratelimit.limit(ip);
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const body = await request.json();
  const { address, telegram_chat_id } = body;

  if (!address || !telegram_chat_id) {
    return NextResponse.json({ statusCode: 400, error: 'BadRequest', message: 'address and telegram_chat_id required' }, { status: 400 });
  }

  if (!/^G[A-Z2-7]{55}$/.test(address)) {
    return NextResponse.json({ statusCode: 400, error: 'InvalidAddress', message: 'Must be a valid Stellar G... public key' }, { status: 400 });
  }

  const { error } = await db
    .from('user_preferences')
    .upsert(
      { user_address: address, telegram_chat_id, updated_at: new Date().toISOString() },
      { onConflict: 'user_address' }
    );

  if (error) {
    return NextResponse.json({ statusCode: 500, error: 'DatabaseError', message: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, address, telegram_linked: true });
}
