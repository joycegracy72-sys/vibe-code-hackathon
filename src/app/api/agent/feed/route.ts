import { NextResponse } from 'next/server';

function parseEpisodeContent(rawContent: unknown): any | null {
  if (!rawContent) return null;

  if (typeof rawContent === 'object') {
    return rawContent;
  }

  try {
    return JSON.parse(String(rawContent).trim());
  } catch {
    return null;
  }
}

async function fetchFullEpisode(uuid: string): Promise<any | null> {
  try {
    const res = await fetch(
      `https://api.thebreeth.com/v1/episodes/${encodeURIComponent(uuid)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${process.env.BREETH_API_KEY}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    );

    console.log('EPISODE DETAIL STATUS:', uuid, res.status);

    if (!res.ok) {
      return null;
    }

    const detail = await res.json();

    return detail?.content ?? null;
  } catch (error) {
    console.log('EPISODE DETAIL FETCH ERROR:', uuid, error);
    return null;
  }
}

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

    const episodes = Array.isArray(data.episodes)
      ? data.episodes
      : [];

    console.log('BREETH EPISODES COUNT:', episodes.length);

    const posts: any[] = [];

    for (const episode of episodes) {
      const uuid = episode?.uuid;

      if (!uuid) {
        console.log('SKIPPING EPISODE: no uuid field');
        continue;
      }

      const rawContent = await fetchFullEpisode(uuid);

      if (!rawContent) {
        console.log('SKIPPING EPISODE: full content fetch failed', uuid);
        continue;
      }

      const content = parseEpisodeContent(rawContent);

      if (!content) {
        console.log('SKIPPING EPISODE: could not parse full content', uuid);
        continue;
      }

      if (content.type === 'agent_initialization') {
        console.log('SKIPPING INITIALIZATION EPISODE', uuid);
        continue;
      }

      if (
        !content.id ||
        !content.createdAt ||
        !content.text ||
        !content.rationale
      ) {
        console.log('SKIPPING EPISODE: missing required post fields', uuid);
        continue;
      }

      const post = {
        id: content.id,
        createdAt: content.createdAt,
        text: content.text,
        rationale: content.rationale,
        sources: Array.isArray(content.sources) ? content.sources : [],
      };

      console.log('PARSED POST:', post.id);

      posts.push(post);
    }

    posts.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    console.log('FINAL FEED POSTS COUNT:', posts.length);

    return NextResponse.json({ posts });
  } catch (error: any) {
    console.error('FEED ERROR:', error);

    return NextResponse.json(
      { error: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}