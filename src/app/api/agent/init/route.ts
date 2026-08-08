import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { persona } = body;

    await fetch('https://thebreeth.com', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_BREETH_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: `Agent initialized: ${persona?.name || 'Ada'} in domain ${persona?.domain || 'AI Security'}`,
      }),
    });

    return NextResponse.json({ agentId: 'agent-ai-creator-001' });
  } catch (error) {
    return NextResponse.json({ agentId: 'agent-ai-creator-001' });
  }
}