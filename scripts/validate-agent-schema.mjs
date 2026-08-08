#!/usr/bin/env node
const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
const agentId = process.env.AGENT_ID || 'agent-ai-creator-001';
const cronSecret = process.env.CRON_SECRET || '';
const triggerCron = process.argv.includes('--trigger-cron');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function pass(message) {
  console.log(`PASS: ${message}`);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isIsoDateString(value) {
  if (typeof value !== 'string') return false;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return false;
  const normalized = new Date(value).toISOString();
  return normalized === value;
}

function validateInitResponse(json) {
  if (typeof json !== 'object' || json === null) {
    fail('POST /api/agent/init response must be a JSON object');
  }
  if (!isNonEmptyString(json.agentId)) {
    fail('POST /api/agent/init response.agentId must be a non-empty string');
  }
}

function validateFeedResponse(json) {
  if (typeof json !== 'object' || json === null) {
    fail('GET /api/agent/feed response must be a JSON object');
  }
  if (!Array.isArray(json.posts)) {
    fail('GET /api/agent/feed response.posts must be an array');
  }
  if (json.posts.length === 0) {
    fail('GET /api/agent/feed response.posts must contain at least one item');
  }
  json.posts.forEach((post, index) => {
    if (typeof post !== 'object' || post === null) {
      fail(`post[${index}] must be an object`);
    }
    if (!isNonEmptyString(post.id)) {
      fail(`post[${index}].id must be a non-empty string`);
    }
    if (!isNonEmptyString(post.createdAt)) {
      fail(`post[${index}].createdAt must be a non-empty string`);
    }
    if (!isIsoDateString(post.createdAt)) {
      fail(`post[${index}].createdAt must be a valid ISO8601 timestamp: ${post.createdAt}`);
    }
    if (!isNonEmptyString(post.text)) {
      fail(`post[${index}].text must be a non-empty string`);
    }
    if (!isNonEmptyString(post.rationale)) {
      fail(`post[${index}].rationale must be a non-empty string`);
    }
    if (!Array.isArray(post.sources)) {
      fail(`post[${index}].sources must be an array`);
    }
    if (!post.sources.every(isNonEmptyString)) {
      fail(`post[${index}].sources must be an array of non-empty strings`);
    }
  });
}

async function httpJson(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (error) {
    fail(`Invalid JSON response from ${url} (${res.status}): ${error.message}\n${text}`);
  }
  return { status: res.status, ok: res.ok, json };
}

async function main() {
  console.log('BASE_URL:', baseUrl);
  console.log('AGENT_ID:', agentId);
  console.log('TRIGGER_CRON:', triggerCron ? 'yes' : 'no');
  console.log('CRON_SECRET configured:', cronSecret ? 'yes' : 'no');
  console.log('');

  const initUrl = `${baseUrl}/api/agent/init`;
  const initResult = await httpJson(initUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ persona: { name: 'Ada', domain: 'AI Security' } }),
  });
  if (!initResult.ok) {
    fail(`POST /api/agent/init returned HTTP ${initResult.status}`);
  }
  validateInitResponse(initResult.json);
  pass(`POST /api/agent/init returned valid agentId=${initResult.json.agentId}`);

  if (triggerCron) {
    const cronUrl = `${baseUrl}/api/cron/run`;
    const cronHeaders = { 'Content-Type': 'application/json' };
    if (cronSecret) {
      cronHeaders.Authorization = `Bearer ${cronSecret}`;
    }
    const cronResult = await httpJson(cronUrl, {
      method: 'GET',
      headers: cronHeaders,
    });
    if (!cronResult.ok) {
      fail(`GET /api/cron/run returned HTTP ${cronResult.status}`);
    }
    pass(`GET /api/cron/run returned HTTP ${cronResult.status}`);
    console.log('cron response:', JSON.stringify(cronResult.json, null, 2));
    console.log('');
  } else {
    console.log('Skipping cron trigger. Use --trigger-cron to invoke /api/cron/run.');
    console.log('');
  }

  const feedUrl = `${baseUrl}/api/agent/feed?agentId=${encodeURIComponent(agentId)}`;
  const feedResult = await httpJson(feedUrl, { method: 'GET' });
  if (!feedResult.ok) {
    fail(`GET /api/agent/feed returned HTTP ${feedResult.status}`);
  }
  validateFeedResponse(feedResult.json);
  pass(`GET /api/agent/feed returned ${feedResult.json.posts.length} valid posts`);
  console.log('sample post[0]:', JSON.stringify(feedResult.json.posts[0], null, 2));
}

main().catch((error) => {
  console.error('UNHANDLED ERROR:', error);
  process.exit(1);
});