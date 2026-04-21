import 'dotenv/config';

interface ThreadsResponse {
  id: string;
  username?: string;
  error?: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id: string;
  };
}

async function postToThreads() {
  const text = process.argv[2];
  const rawImageUrl = process.argv[3];
  // &amp; を & に置換（RSSからコピーした場合などの対策）
  const imageUrl = rawImageUrl ? rawImageUrl.replace(/&amp;/g, '&') : undefined;

  if (!text) {
    console.error('Error: Message text is required.');
    console.log('Usage: npm run post:threads "Your message" ["Image URL"]');
    process.exit(1);
  }

  const token = process.env.THREADS_LONG_LIVED_TOKEN;

  if (!token || token === 'your_token_here') {
    console.error('Error: THREADS_LONG_LIVED_TOKEN must be set in .env');
    process.exit(1);
  }

  try {
    // 1. Get Threads user id automatically
    console.log('Fetching user information...');
    const meRes = await fetch(`https://graph.threads.net/v1.0/me?fields=id,username&access_token=${token}`);
    const meData = await meRes.json() as ThreadsResponse;

    if (meData.error) {
      throw new Error(`Failed to fetch user info: ${JSON.stringify(meData.error)}`);
    }

    const userId = meData.id;
    console.log(`Authenticated as ${meData.username} (ID: ${userId})`);
    console.log(`Posting to Threads: "${text}"${imageUrl ? ` with image: ${imageUrl}` : ''}...`);

    // 2. Create Media Container
    const containerUrl = `https://graph.threads.net/v1.0/${userId}/threads`;
    const params = new URLSearchParams();
    params.append('access_token', token);
    params.append('text', text);
    
    if (imageUrl) {
      params.append('media_type', 'IMAGE');
      params.append('image_url', imageUrl);
    } else {
      params.append('media_type', 'TEXT');
    }

    const containerRes = await fetch(`${containerUrl}?${params.toString()}`, { method: 'POST' });
    const containerData = await containerRes.json() as ThreadsResponse;

    if (containerData.error) {
      throw new Error(`Container creation failed: ${JSON.stringify(containerData.error)}`);
    }

    const creationId = containerData.id;
    console.log(`Container created (ID: ${creationId}). Publishing...`);

    // 3. Publish Media
    const publishUrl = `https://graph.threads.net/v1.0/${userId}/threads_publish`;
    const publishParams = new URLSearchParams();
    publishParams.append('access_token', token);
    publishParams.append('creation_id', creationId);

    const publishRes = await fetch(`${publishUrl}?${publishParams.toString()}`, { method: 'POST' });
    const publishData = await publishRes.json() as ThreadsResponse;

    if (publishData.error) {
      throw new Error(`Publishing failed: ${JSON.stringify(publishData.error)}`);
    }

    console.log('Successfully posted to Threads!');
    console.log(`Post ID: ${publishData.id}`);

  } catch (error) {
    console.error('Failed to post to Threads:', error);
    process.exit(1);
  }
}

postToThreads();
