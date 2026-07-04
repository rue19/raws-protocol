import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'raws-api',
    version: '1.0.0',
    network: process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? 'testnet',
    timestamp: new Date().toISOString(),
  });
}
