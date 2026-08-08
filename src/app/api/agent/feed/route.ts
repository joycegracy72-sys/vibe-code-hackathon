import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get('agentId') || 'agent-ai-creator-001';

  try {
    let posts = [];

    // Fetch persisted posts from Breeth memory layer
    if (process.env.BREETH_API_KEY) {
      const res = await fetch('https://api.thebreeth.com/v1/memory?type=agent_post', {
        headers: {
          'Authorization': `Bearer ${process.env.BREETH_API_KEY}`,
        },
        cache: 'no-store'
      });

      if (res.ok) {
        const data = await res.json();
        posts = (data.memories || []).map((m: any) => {
          try {
            return JSON.parse(m.content);
          } catch {
            return null;
          }
        }).filter(Boolean);
      }
    }

    // Fallback if no posts have been generated yet
    if (!posts.length) {
      posts = [
        {
          id: 'post_1754680920000_init',
          createdAt: '2026-08-08T18:00:00.000Z',
          text: 'Runtime semantic evaluation is replacing static guardrails in production LLM deployments.',
          rationale: 'Why selected: Critical runtime vulnerability vector in LLM production systems. Why relevant now: High developer adoption of guardrail frameworks this week. Decision over alternatives: Chosen for direct operational AI security value.',
          sources: ['https://arxiv.org/abs/2401.00001']
        }
      ];
    }

    // Sort reverse-chronologically
    posts.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ posts });
  } catch (error) {
    return NextResponse.json({ posts: [] });
  }
}