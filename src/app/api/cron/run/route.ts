import { NextResponse } from 'next/server';

function synthesizePostText(candidate: any, personaName: string, personaDomain: string) {
  const title = candidate.title.replace(/\s+/g, ' ').trim();
  const summary = candidate.summary.replace(/\s+/g, ' ').trim();

  let text = `[Analysis by ${personaName} inside ${personaDomain}] `;
  text += `Recent research "${title}" outlines key insights. `;

  if (summary) {
    const sentences = summary.split(/[.!?]+/).map((s: string) => s.trim()).filter((s: string) => s.length > 10);
    const firstSentence = sentences[0] || '';
    const secondSentence = sentences[1] || '';

    if (firstSentence) {
      text += `The authors show that ${firstSentence.charAt(0).toLowerCase() + firstSentence.slice(1)}. `;
    }
    if (secondSentence) {
      text += `Furthermore, they find that ${secondSentence.charAt(0).toLowerCase() + secondSentence.slice(1)}. `;
    }
  } else {
    text += `This research advances understanding and establishes critical concepts within the ${personaDomain} landscape.`;
  }

  text += ` Utilizing these insights is essential for progress and security in ${personaDomain}.`;
  return text;
}

function generateRationale(
  selectedCandidate: any,
  candidates: any[],
  rejectedCandidates: any[],
  personaName: string,
  personaDomain: string
) {
  const title = selectedCandidate.title.replace(/\s+/g, ' ').trim();

  const whySelected = `Selected "${title}" because of its direct technical relevance to the foundational themes of ${personaDomain}.`;

  const whyRelevantNow = `This topic is highly relevant now as the paper was recently published on arXiv, presenting timely results of interest to practitioners in ${personaDomain}.`;

  const alternativesCount = candidates.length;
  const rejectedTitles = rejectedCandidates
    .slice(0, 2)
    .map((c) => `"${c.title.replace(/\s+/g, ' ').trim()}"`)
    .join(' and ');

  const choiceOverAlternatives = `Out of ${alternativesCount} evaluated arXiv candidates, this research was chosen over alternatives ${
    rejectedTitles ? `such as ${rejectedTitles}` : 'due to higher priority scoring'
  } because it aligns most closely with ${personaName}'s current research objectives and scoring threshold.`;

  return `Why selected: ${whySelected} Why relevant now: ${whyRelevantNow} Decision over alternatives: ${choiceOverAlternatives}`;
}

export async function GET(req: Request) {
  // 1. Authorization guard for Vercel Cron
  const authHeader = req.headers.get('authorization');

  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json(
      {
        error: 'Unauthorized invocation',
      },
      {
        status: 401,
      }
    );
  }

  try {
    if (!process.env.BREETH_API_KEY) {
      console.error('BREETH_API_KEY is not configured');
      return NextResponse.json(
        { error: 'Memory service key is not configured' },
        { status: 500 }
      );
    }

    /*
     * =========================================================
     * 2. LIVE DISCOVERY
     * =========================================================
     * Fetch recent security + LLM papers from arXiv.
     */
    const arxivUrl =
      'https://export.arxiv.org/api/query' +
      '?search_query=cat:cs.CR+AND+all:LLM' +
      '&sortBy=submittedDate' +
      '&sortOrder=descending' +
      '&max_results=8';

    const arxivRes = await fetch(arxivUrl, {
      headers: {
        'User-Agent': 'Security-Agent/1.0',
      },
      cache: 'no-store',
    });

    if (!arxivRes.ok) {
      return NextResponse.json(
        { error: `arXiv feed returned status ${arxivRes.status}` },
        { status: 502 }
      );
    }

    const xmlText = await arxivRes.text();

    /*
     * Parse arXiv entries.
     */
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    const entries = [...xmlText.matchAll(entryRegex)];

    if (entries.length === 0) {
      return NextResponse.json(
        { error: 'No candidates discovered from arXiv feed' },
        { status: 502 }
      );
    }

    /*
     * =========================================================
     * 3. CANDIDATE DISCOVERY
     * =========================================================
     */
    const candidates = entries.map((entryMatch) => {
      const entryXml = entryMatch[1];

      const titleMatch = entryXml.match(/<title>([\s\S]*?)<\/title>/);
      const idMatch = entryXml.match(/<id>([\s\S]*?)<\/id>/);
      const summaryMatch = entryXml.match(/<summary>([\s\S]*?)<\/summary>/);

      const rawTitle = titleMatch
        ? titleMatch[1].replace(/\n/g, ' ').trim()
        : 'Untitled Paper';

      const rawId = idMatch
        ? idMatch[1].trim()
        : 'https://arxiv.org/abs/2401.00000';

      const rawSummary = summaryMatch
        ? summaryMatch[1].replace(/\n/g, ' ').trim()
        : '';

      return {
        title: rawTitle,
        url: rawId,
        summary: rawSummary,
      };
    });

    /*
     * =========================================================
     * 4. EDITORIAL SCORING
     * =========================================================
     */
    const scoredCandidates = candidates.map((candidate) => {
      const text = (candidate.title + ' ' + candidate.summary).toLowerCase();
      let score = 0;

      if (text.includes('agent') || text.includes('tool')) {
        score += 3;
      }
      if (
        text.includes('injection') ||
        text.includes('jailbreak') ||
        text.includes('vulnerability')
      ) {
        score += 4;
      }
      if (
        text.includes('runtime') ||
        text.includes('execution') ||
        text.includes('guardrail')
      ) {
        score += 3;
      }
      if (text.includes('benchmark') || text.includes('survey')) {
        score -= 2;
      }

      return {
        ...candidate,
        score,
      };
    });

    scoredCandidates.sort((a, b) => b.score - a.score);

    /*
     * =========================================================
     * 5. BREETH MEMORY READ
     * =========================================================
     */
    const memoryUrl =
      'https://api.thebreeth.com/v1/graph/episodes' +
      '?agent_id=agent-ai-creator-001' +
      '&limit=100';

    console.log('BREETH CRON MEMORY URL:', memoryUrl);

    const memoryRes = await fetch(memoryUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.BREETH_API_KEY}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    console.log('BREETH CRON MEMORY STATUS:', memoryRes.status);
    const memoryText = await memoryRes.text();

    if (!memoryRes.ok) {
      return NextResponse.json(
        { error: `Memory service returned error status ${memoryRes.status}` },
        { status: 502 }
      );
    }

    let existingMemories: any[] = [];
    try {
      const memData = JSON.parse(memoryText);
      existingMemories = memData.memories || [];
    } catch (error) {
      console.error('BREETH CRON MEMORY JSON ERROR:', error);
      return NextResponse.json(
        { error: 'Failed to parse memory service response' },
        { status: 502 }
      );
    }

    /*
     * Retrieve the stored persona from Breeth.
     */
    let personaName = 'Ada';
    let personaDomain = 'AI Security';

    const initMemory = existingMemories.find((mem) => {
      try {
        const parsed = typeof mem.content === 'string'
          ? JSON.parse(mem.content)
          : mem.content;
        return parsed?.type === 'agent_initialization';
      } catch {
        return false;
      }
    });

    if (initMemory) {
      try {
        const parsed = typeof initMemory.content === 'string'
          ? JSON.parse(initMemory.content)
          : initMemory.content;
        if (parsed?.persona?.name) {
          personaName = parsed.persona.name;
        }
        if (parsed?.persona?.domain) {
          personaDomain = parsed.persona.domain;
        }
      } catch (err) {
        console.error('Error parsing init memory:', err);
      }
    }

    console.log('RETRIEVED PERSONA:', personaName, 'DOMAIN:', personaDomain);

    /*
     * =========================================================
     * 6. CANDIDATE EVALUATION LOOP & DEDUPLICATION
     * =========================================================
     */
    let selectedCandidate: any = null;
    let rejectedCandidates: any[] = [];
    let publishDecisionReason = '';

    for (const candidate of scoredCandidates) {
      // Deduplication check
      const isDuplicate = existingMemories.some((mem) => {
        try {
          const parsed =
            typeof mem.content === 'string'
              ? JSON.parse(mem.content)
              : mem.content;

          return (
            parsed?.sources?.includes(candidate.url) ||
            parsed?.text?.includes(candidate.title)
          );
        } catch {
          return false;
        }
      });

      if (isDuplicate) {
        console.log(`Candidate "${candidate.title}" is duplicate, skipping...`);
        continue;
      }

      // Ask deterministic policy to make a publish/reject decision
      // Rejects lower scoring candidates (score < 3)
      if (candidate.score < 3) {
        console.log(`Candidate "${candidate.title}" rejected due to low score (${candidate.score})`);
        rejectedCandidates.push(candidate);
        continue;
      }

      // Found a suitable candidate to publish!
      selectedCandidate = candidate;
      publishDecisionReason = `Topic matches core interest area of ${personaDomain} with a score of ${candidate.score}.`;
      break;
    }

    // Accumulate the rest as rejected
    scoredCandidates.forEach((c) => {
      if (selectedCandidate && c.url === selectedCandidate.url) return;
      if (!rejectedCandidates.some((rc) => rc.url === c.url)) {
        rejectedCandidates.push(c);
      }
    });

    if (!selectedCandidate) {
      return NextResponse.json({
        status: 'no_suitable_candidates',
        message: 'All candidates were either duplicates or rejected by editorial policy.',
      });
    }

    /*
     * =========================================================
     * 7. SYNTHESIZE POST
     * =========================================================
     */
    const postText = synthesizePostText(selectedCandidate, personaName, personaDomain);
    const postRationale = generateRationale(
      selectedCandidate,
      candidates,
      rejectedCandidates,
      personaName,
      personaDomain
    );

    const newPost = {
      id: `post_${Date.now()}_` + Math.random().toString(36).substring(2, 7),
      createdAt: new Date().toISOString(),
      text: postText,
      rationale: postRationale,
      sources: [selectedCandidate.url],
    };

    /*
     * =========================================================
     * 8. PERSIST POST TO BREETH
     * =========================================================
     */
    const saveRes = await fetch('https://api.thebreeth.com/v1/episodes', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.BREETH_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: JSON.stringify(newPost),
        metadata: {
          type: 'agent_post',
          agentId: 'agent-ai-creator-001',
          agent_id: 'agent-ai-creator-001',
        },
      }),
    });

    const breethSaveStatus = saveRes.status;
    const breethSaveResponse = await saveRes.text();

    console.log('BREETH SAVE STATUS:', breethSaveStatus);
    console.log('BREETH SAVE RESPONSE:', breethSaveResponse);

    if (!saveRes.ok) {
      return NextResponse.json(
        {
          error: `Memory service failed to persist the post. Status: ${breethSaveStatus}, Response: ${breethSaveResponse}`,
        },
        {
          status: 502,
        }
      );
    }

    /*
     * =========================================================
     * 9. SUCCESS
     * =========================================================
     */
    return NextResponse.json({
      status: 'published_autonomously',
      post: newPost,
      evaluationSummary: {
        totalEvaluated: candidates.length,
        selected: selectedCandidate.title,
        decision: 'publish',
        reason: publishDecisionReason,
        rejectedCount: rejectedCandidates.length,
      },
      breeth: {
        status: breethSaveStatus,
        persisted: true,
      },
    });
  } catch (error: any) {
    console.error('CRON ERROR:', error);

    return NextResponse.json(
      {
        error: error?.message || 'Unknown cron error',
      },
      {
        status: 500,
      }
    );
  }
}

