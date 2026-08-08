import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get('agentId') || 'agent-ai-creator-001';

  try {
    let posts: any[] = [];

    console.log('BREETH_API_KEY configured:', Boolean(process.env.BREETH_API_KEY));

    if (process.env.BREETH_API_KEY) {
      const breethUrl = `https://api.thebreeth.com/v1/memories?agent_id=${encodeURIComponent(agentId)}&limit=20`;

      console.log('BREETH REQUEST URL:', breethUrl);

      try {
        const res = await fetch(breethUrl, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${process.env.BREETH_API_KEY}`,
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        });

        console.log('BREETH RESPONSE STATUS:', res.status);
        const responseText = await res.text();

        if (res.ok) {
          try {
            const data = JSON.parse(responseText);
            posts = (data.memories || [])
              .map((memory: any) => {
                try {
                  return typeof memory.content === 'string'
                    ? JSON.parse(memory.content)
                    : memory.content || memory;
                } catch {
                  return null;
                }
              })
              .filter(Boolean);
          } catch (error) {
            console.error('BREETH JSON PARSE ERROR:', error);
          }
        } else {
          console.warn(`[Breeth Sync] API returned ${res.status}. Falling back to default feed.`);
        }
      } catch (err) {
        console.warn('[Breeth Sync] Network request failed:', err);
      }
    } else {
      console.log('BREETH_API_KEY is not configured');
    }

    // Fallback when Breeth contains no usable posts or returns 404
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

    // Newest posts first
    posts.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    console.log('FINAL FEED POSTS:', JSON.stringify(posts, null, 2));

    return NextResponse.json({ posts });
  } catch (error) {
    console.error('FEED ERROR:', error);
    return NextResponse.json({ posts: [] }, { status: 500 });
  }
}