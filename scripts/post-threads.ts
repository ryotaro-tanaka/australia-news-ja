import 'dotenv/config';

interface ThreadsResponse {
  id: string;
  username?: string;
  data?: Array<{ id: string }>;
  error?: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id: string;
  };
}

const FOOTER_TEXT = `オーストラリアのニュースを日本語で読みたいなら「南半球の朝ごはんニュース」
https://news-ja.pages.dev/`;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForPostAvailability(userId: string, token: string, targetPostId: string, maxRetries = 10): Promise<boolean> {
  console.log(`Checking if post ${targetPostId} is available via API...`);
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(`https://graph.threads.net/v1.0/${userId}/threads?access_token=${token}`);
      const json = await res.json() as ThreadsResponse;
      
      if (json.data && json.data.some(post => post.id === targetPostId)) {
        console.log(`Post ${targetPostId} is now live and recognized by API.`);
        return true;
      }
    } catch (e) {
      console.warn('Availability check failed, retrying...', e);
    }
    
    console.log(`Still waiting... (Retry ${i + 1}/${maxRetries})`);
    await sleep(3000);
  }
  
  return false;
}

export async function postToThreads(text: string, imageUrl?: string, tag?: string, replyText?: string) {
  const token = process.env.THREADS_LONG_LIVED_TOKEN;

  // 500文字制限のチェックと切り詰め
  const safeText = text.length > 500 ? text.substring(0, 497) + '...' : text;

  if (!token || token === 'your_token_here') {
    throw new Error('THREADS_LONG_LIVED_TOKEN must be set in .env');
  }

  try {
    // 1. Get Threads user id
    const meRes = await fetch(`https://graph.threads.net/v1.0/me?fields=id,username&access_token=${token}`);
    const meData = await meRes.json() as ThreadsResponse;
    if (meData.error) throw new Error(`User info failed: ${JSON.stringify(meData.error)}`);

    const userId = meData.id;
    console.log(`Authenticated as ${meData.username}. Posting main message...`);

    // 2. Create Main Post Container
    const containerUrl = `https://graph.threads.net/v1.0/${userId}/threads`;
    const mainParams = new URLSearchParams();
    mainParams.append('access_token', token);
    mainParams.append('text', safeText);
    
    if (tag) {
      mainParams.append('tag', tag);
    }
    
    if (imageUrl) {
      mainParams.append('media_type', 'IMAGE');
      mainParams.append('image_url', imageUrl.replace(/&amp;/g, '&'));
    } else {
      mainParams.append('media_type', 'TEXT');
    }

    const mainContainerRes = await fetch(`${containerUrl}?${mainParams.toString()}`, { method: 'POST' });
    const mainContainerData = await mainContainerRes.json() as ThreadsResponse;
    if (mainContainerData.error) throw new Error(`Main container failed: ${JSON.stringify(mainContainerData.error)}`);

    // 3. Publish Main Post
    const publishUrl = `https://graph.threads.net/v1.0/${userId}/threads_publish`;
    const mainPublishParams = new URLSearchParams();
    mainPublishParams.append('access_token', token);
    mainPublishParams.append('creation_id', mainContainerData.id);

    const mainPublishRes = await fetch(`${publishUrl}?${mainPublishParams.toString()}`, { method: 'POST' });
    const mainPublishData = await mainPublishRes.json() as ThreadsResponse;
    if (mainPublishData.error) throw new Error(`Main publish failed: ${JSON.stringify(mainPublishData.error)}`);

    const mainPostId = mainPublishData.id;
    console.log(`Main post published! ID: ${mainPostId}`);

    // 4. Wait for API availability
    const isAvailable = await waitForPostAvailability(userId, token, mainPostId);
    if (!isAvailable) {
      console.warn('Main post was not found in listing. Attempting reply anyway...');
      await sleep(2000);
    }

    // 5. Create Reply Post Container
    console.log('Posting automatic reply...');
    const replyParams = new URLSearchParams();
    replyParams.append('access_token', token);
    replyParams.append('text', replyText || FOOTER_TEXT);
    replyParams.append('media_type', 'TEXT');
    replyParams.append('reply_to_id', mainPostId);

    const replyContainerRes = await fetch(`${containerUrl}?${replyParams.toString()}`, { method: 'POST' });
    const replyContainerData = await replyContainerRes.json() as ThreadsResponse;
    if (replyContainerData.error) throw new Error(`Reply container failed: ${JSON.stringify(replyContainerData.error)}`);

    const replyCreationId = replyContainerData.id;
    console.log(`Reply container created (ID: ${replyCreationId}). Waiting a moment before publishing...`);
    await sleep(3000); // 返信コンテナの準備待ち

    // 6. Publish Reply Post
    const replyPublishParams = new URLSearchParams();
    replyPublishParams.append('access_token', token);
    replyPublishParams.append('creation_id', replyCreationId);

    const replyPublishRes = await fetch(`${publishUrl}?${replyPublishParams.toString()}`, { method: 'POST' });
    const replyPublishData = await replyPublishRes.json() as ThreadsResponse;
    if (replyPublishData.error) throw new Error(`Reply publish failed: ${JSON.stringify(replyPublishData.error)}`);

    console.log('Successfully posted thread with reply!');
    return { mainPostId, replyId: replyPublishData.id };

  } catch (error) {
    console.error('Failed to post to Threads:', error);
    throw error;
  }
}

// 従来の CLI 実行用ロジック
if (import.meta.url.endsWith(process.argv[1]) || (process.argv[1] && process.argv[1].endsWith('post-threads.ts'))) {
  const text = process.argv[2];
  const imageUrl = process.argv[3];
  const tag = process.argv[4];
  const replyText = process.argv[5];

  if (!text) {
    console.error('Error: Message text is required.');
    console.log('Usage: npm run post:threads "Your message" ["Image URL"] ["Tag"] ["Reply Text"]');
    process.exit(1);
  }

  postToThreads(text, imageUrl, tag, replyText).catch(() => process.exit(1));
}
