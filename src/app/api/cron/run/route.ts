import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  // 1. Authorization Guard for Vercel Cron
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized invocation' }, { status: 401 });
  }

  try {
    // 2. LIVE DISCOVERY: Fetch recent papers from arXiv CS.CR (Cryptography & Security) + LLM
    const arxivUrl = 'https://export.arxiv.org/api/query?search_query=cat:cs.CR+AND+all:LLM&sortBy=submittedDate&sortOrder=descending&max_results=8';
    
    const arxivRes = await fetch(arxivUrl, {
      headers: { 'User-Agent': 'Ada-Security-Agent/1.0' },
      cache: 'no-store',
    });

    if (!arxivRes.ok) {
      throw new Error(`arXiv feed returned status ${arxivRes.status}`);
    }

    const xmlText = await arxivRes.text();

    // Parse entries out of XML response
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    const entries = [...xmlText.matchAll(entryRegex)];

    if (entries.length === 0) {
      return NextResponse.json({ status: 'no_candidates_found' });
    }

    // 3. CANDIDATE DISCOVERY & EDITORIAL EVALUATION
    const candidates = entries.map((entryMatch) => {
      const entryXml = entryMatch[1];
      const titleMatch = entryXml.match(/<title>([\s\S]*?)<\/title>/);
      const idMatch = entryXml.match(/<id>([\s\S]*?)<\/id>/);
      const summaryMatch = entryXml.match(/<summary>([\s\S]*?)<\/summary>/);

      const rawTitle = titleMatch ? titleMatch[1].replace(/\n/g, ' ').trim() : 'Untitled Paper';
      const rawId = idMatch ? idMatch[1].trim() : 'https://arxiv.org/abs/2401.00000';
      const rawSummary = summaryMatch ? summaryMatch[1].replace(/\n/g, ' ').trim() : '';

      return {
        title: rawTitle,
        url: rawId,
        summary: rawSummary,
      };
    });

    // Editorial Scoring (Ada's Persona Filter)
    const scoredCandidates = candidates.map((candidate) => {
      const text = (candidate.title + ' ' + candidate.summary).toLowerCase();
      let score = 0;

      if (text.includes('agent') || text.includes('tool')) score += 3;
      if (text.includes('injection') || text.includes('jailbreak') || text.includes('vulnerability')) score += 4;
      if (text.includes('runtime') || text.includes('execution') || text.includes('guardrail')) score += 3;
      if (text.includes('benchmark') || text.includes('survey')) score -= 2; // Prefer concrete systems over surveys

      return { ...candidate, score };
    });

    // Sort descending by score
    scoredCandidates.sort((a, b) => b.score - a.score);

    // Pick top choice
    const selectedCandidate = scoredCandidates[0];
    const rejectedCandidates = scoredCandidates.slice(1);

    // 4. MEMORY & DEDUPLICATION CHECK VIA BREETH MEMORY LAYER
    let existingMemories: any[] = [];
    if (process.env.BREETH_API_KEY) {
      const memoryRes = await fetch('https://api.thebreeth.com/v1/memory?type=agent_post', {
        headers: { 'Authorization': `Bearer ${process.env.BREETH_API_KEY}` },
        cache: 'no-store',
      });
      if (memoryRes.ok) {
        const memData = await memoryRes.json();
        existingMemories = memData.memories || [];
      }
    }

    // Deduplication check against published content
    const isDuplicate = existingMemories.some((mem) => {
      try {
        const parsed = JSON.parse(mem.content);
        return parsed.sources?.includes(selectedCandidate.url) || parsed.text?.includes(selectedCandidate.title);
      } catch {
        return false;
      }
    });

    if (isDuplicate) {
      return NextResponse.json({
        status: 'skipped_duplicate',
        reason: `Candidate "${selectedCandidate.title}" was already published in a previous cycle. Memory deduplication active.`,
      });
    }

    // 5. SYNTHESIZE PUBLISHING RATIONALE
    const rationale = `Selected because: Direct technical alignment with AI Security & Runtime isolation systems. Relevant now: Published in recent research stream on agentic security risks. Chosen over alternatives: Evaluated ${candidates.length} arXiv candidate papers. Rejected ${rejectedCandidates.length} lower-priority items (e.g. "${rejectedCandidates[0]?.title || 'generic surveys'}") due to lower relevance score to tool-use security.`;

    const newPost = {
      id: `post_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      text: `Analysis on recent security research: "${selectedCandidate.title}". When deploying tool-using AI agents, relying solely on static input guardrails is insufficient. Runtime isolation and real-time execution monitoring are required to prevent prompt injection hijacking.`,
      rationale,
      sources: [selectedCandidate.url],
      status: 'published',
    };

    // 6. PERSIST TO BREETH MEMORY
    if (process.env.BREETH_API_KEY) {
      await fetch('https://api.thebreeth.com/v1/memory', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.BREETH_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: JSON.stringify(newPost),
          metadata: { type: 'agent_post', agentId: 'agent-ai-creator-001' },
        }),
      });
    }

    return NextResponse.json({
      status: 'published_autonomously',
      post: newPost,
      evaluationSummary: {
        totalEvaluated: candidates.length,
        selected: selectedCandidate.title,
        rejectedCount: rejectedCandidates.length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}