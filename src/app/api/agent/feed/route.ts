import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get('agentId') || 'agent-ai-creator-001';

  try {
    let posts: any[] = [];

    // Fetch persisted posts from Breeth memory layer
    console.log(
      'BREETH_API_KEY configured:',
      Boolean(process.env.BREETH_API_KEY)
    );

    if (process.env.BREETH_API_KEY) {
      const res = await fetch(
        `https://api.thebreeth.com/v1/memories?agent_id=${encodeURIComponent(
          agentId
        )}&limit=20`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.BREETH_API_KEY}`,
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        }
      );

      console.log('BREETH RESPONSE STATUS:', res.status);

      if (res.ok) {
        const data = await res.json();

        // DEBUG: See exactly what Breeth returns
        console.log(
          'BREETH FEED RESPONSE:',
          JSON.stringify(data, null, 2)
        );

        posts = (data.memories || [])
          .map((m: any) => {
            try {
              return typeof m.content === 'string'
                ? JSON.parse(m.content)
                : m.content;
            } catch {
              return null;
            }
          })
          .filter(Boolean);

        // DEBUG: See what was successfully parsed
        console.log(
          'PARSED POSTS:',
          JSON.stringify(posts, null, 2)
        );
      } else {
        console.log('BREETH REQUEST FAILED:', res.status);
      }
    } else {
      console.log('BREETH_API_KEY is not configured');
    }

    // Fallback if no posts have been generated yet
    if (!posts.length) {
      console.log('NO POSTS FOUND — USING FALLBACK');

      posts = [
        {
          id: 'post_1754680920000_init',
          createdAt: '2026-08-08T18:00:00.000Z',
          text: 'Runtime semantic evaluation is replacing static guardrails in production LLM deployments.',
          rationale:
            'Why selected: Critical runtime vulnerability vector in LLM production systems. Why relevant now: High developer adoption of guardrail frameworks this week. Decision over alternatives: Chosen for direct operational AI security value.',
          sources: ['https://arxiv.org/abs/2401.00001'],
        },
      ];
    }

    // Sort reverse-chronologically
    posts.sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
    );

    console.log('FINAL FEED POSTS:', JSON.stringify(posts, null, 2));

    return NextResponse.json({ posts });
  } catch (error) {
    console.error('FEED ERROR:', error);

    return NextResponse.json({ posts: [] });
  }
}