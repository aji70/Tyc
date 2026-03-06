import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxies JSON-RPC requests to a Starknet RPC (e.g. Sepolia).
 * Use this when the frontend cannot call the RPC directly due to CORS.
 *
 * Set env STARKNET_RPC_UPSTREAM (e.g. https://starknet-sepolia.public.blastapi.io)
 * and set NEXT_PUBLIC_STARKNET_READ_RPC_URL to your app origin + /api/starknet-rpc
 * (e.g. https://tyc-five.vercel.app/api/starknet-rpc) so the hook uses same-origin.
 */
const UPSTREAM = process.env.STARKNET_RPC_UPSTREAM?.trim() || '';

export async function POST(request: NextRequest) {
  if (!UPSTREAM) {
    return NextResponse.json(
      { error: 'STARKNET_RPC_UPSTREAM not set' },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const url = UPSTREAM.startsWith('http') ? UPSTREAM : `https://${UPSTREAM}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    return NextResponse.json(
      { error: 'Upstream returned non-JSON', status: res.status },
      { status: 502 }
    );
  }

  return NextResponse.json(data, { status: res.status });
}
