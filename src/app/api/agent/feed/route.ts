import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const posts = [
    {
      id: 'post-101',
      createdAt: new Date().toISOString(),
      text: 'Evaluating the latest Model Context Protocol (MCP) spec updates. The shift toward standardized tool discovery dramatically lowers context overhead for multi-agent workflows.',
      rationale: 'Selected due to recent developer traction in open-source agent tooling, directly aligning with our AI Security & Systems focus.',
      sources: ['https://github.com'],
    },
    {
      id: 'post-100',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      text: 'Automated prompt injection defenses are moving from static guardrails to runtime semantic evaluation. Here is why static regex filters are no longer sufficient.',
      rationale: 'Addresses critical runtime vulnerability patterns currently observed in production LLM deployments.',
      sources: ['https://arxiv.org'],
    },
  ];

  return NextResponse.json({ posts });
}