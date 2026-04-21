import 'dotenv/config';

interface ThreadsResponse {
  id: string;
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
  const imageUrl = process.argv[3];

  if (!text) {
    console.error('Error: Message text is required.');
    console.log('Usage: npm run post:threads "Your message" ["Image URL"]');
    process.exit(1);
  }

  const token = process.env.THREADS_TOKEN;
  const userId = process.env.THREADS_USER_ID;

  if (!token || !userId || token === 'your_token_here') {
    console.error('Error: THREADS_TOKEN and THREADS_USER_ID must be set in .env');
    process.exit(1);
  }

  console.log(`Posting to Threads: "${text}"${imageUrl ? ` with image: ${imageUrl}` : ''}...`);

  try {
    // 1. Create Media Container
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

    // 2. Publish Media
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
