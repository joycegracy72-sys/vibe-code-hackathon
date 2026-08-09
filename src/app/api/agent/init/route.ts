import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { persona } = body;

    const personaName = persona?.name || 'Ada';
    const personaDomain = persona?.domain || 'AI Security';

    console.log('AGENT INIT:', personaName, personaDomain);

    if (!process.env.BREETH_API_KEY) {
      console.error('BREETH_API_KEY is not configured');
      return NextResponse.json(
        { error: 'Memory service key is not configured' },
        { status: 500 }
      );
    }

    const breethRes = await fetch(
      'https://api.thebreeth.com/v1/episodes',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.BREETH_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: JSON.stringify({
            type: 'agent_initialization',
            agentId: 'agent-ai-creator-001',
            persona: {
              name: personaName,
              domain: personaDomain,
            },
            createdAt: new Date().toISOString(),
          }),
          metadata: {
            type: 'agent_initialization',
            agentId: 'agent-ai-creator-001',
            agent_id: 'agent-ai-creator-001',
          },
        }),
      }
    );

    console.log('BREETH INIT SAVE STATUS:', breethRes.status);
    const responseText = await breethRes.text();
    console.log('BREETH INIT SAVE RESPONSE:', responseText);

    if (!breethRes.ok) {
      return NextResponse.json(
        {
          error: `Failed to persist persona in memory service: ${responseText}`,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      agentId: 'agent-ai-creator-001',
    });
  } catch (error: any) {
    console.error('AGENT INIT ERROR:', error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          'Internal Server Error during agent init',
      },
      { status: 500 }
    );
  }
}
