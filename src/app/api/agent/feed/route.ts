import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const agentId =
    searchParams.get('agentId') || 'agent-ai-creator-001';

  try {
    if (!process.env.BREETH_API_KEY) {
      return NextResponse.json(
        { error: 'Memory service key is not configured' },
        { status: 500 }
      );
    }

    const breethUrl =
      `https://api.thebreeth.com/v1/graph/episodes` +
      `?group_id=${encodeURIComponent(agentId)}&limit=100`;

    console.log('BREETH FEED URL:', breethUrl);

    const res = await fetch(breethUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.BREETH_API_KEY}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    console.log('BREETH FEED STATUS:', res.status);

    const responseText = await res.text();

    if (!res.ok) {
      console.error('BREETH FEED ERROR:', responseText);

      return NextResponse.json(
        {
          error: `Memory service returned status ${res.status}`,
          details: responseText,
        },
        { status: 502 }
      );
    }

    let data: any;

    try {
      data = JSON.parse(responseText);
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse Breeth response' },
        { status: 502 }
      );
    }

    const episodes = data.episodes || [];

    const posts = episodes
      .map((episode: any) => {
        try {
          const rawContent =
            episode.content_excerpt ||
            episode.content ||
            '';

          const content =
            typeof rawContent === 'string'
              ? JSON.parse(rawContent)
              : rawContent;

          if (
            content &&
            content.type !== 'agent_initialization' &&
            content.id &&
            content.createdAt &&
            content.text &&
            content.rationale
          ) {
            return {
              id: content.id,
              createdAt: content.createdAt,
              text: content.text,
              rationale: content.rationale,
              sources: content.sources || [],
            };
          }

          return null;
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    posts.sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
    );

    console.log('FINAL FEED POSTS COUNT:', posts.length);

    return NextResponse.json({ posts });
  } catch (error: any) {
    console.error('FEED ERROR:', error);

    return NextResponse.json(
      {
        error: error?.message || 'Internal Server Error',
      },
      { status: 500 }
    );
  }
}
