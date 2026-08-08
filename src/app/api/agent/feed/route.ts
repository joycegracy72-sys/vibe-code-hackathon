if (process.env.BREETH_API_KEY) {
  const res = await fetch(
    `https://api.thebreeth.com/v1/memories?agent_id=${encodeURIComponent(
      agentId
    )}&limit=20`,
    {
      headers: {
        Authorization: `Bearer ${process.env.BREETH_API_KEY}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    }
  );

  console.log('BREETH RESPONSE STATUS:', res.status);

  const responseText = await res.text();

  console.log('BREETH RAW RESPONSE:', responseText);

  if (res.ok) {
    try {
      const data = JSON.parse(responseText);

      console.log('BREETH PARSED RESPONSE:', JSON.stringify(data));

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

      console.log('PARSED POSTS:', JSON.stringify(posts));
    } catch (error) {
      console.error('BREETH JSON PARSE ERROR:', error);
    }
  } else {
    console.error('BREETH REQUEST FAILED:', res.status, responseText);
  }
} else {
  console.log('BREETH_API_KEY is not configured');
}