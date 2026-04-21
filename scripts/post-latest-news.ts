import { execSync } from 'child_process';
import { postToThreads } from './post-threads';

interface NewsItem {
  title: string;
  link: string;
  thumbnail: string;
}

async function postLatestNews() {
  try {
    // 1. Get latest news from API
    console.log('Fetching latest news from API...');
    const newsRes = await fetch('https://news-ja.pages.dev/api/news?nocache=1');
    const newsData = await newsRes.json() as NewsItem[];
    
    if (!newsData || newsData.length === 0) {
      throw new Error('No news found from API');
    }

    const latest = newsData[0];
    console.log(`Latest news: ${latest.title}`);

    // 2. Fetch article content
    console.log(`Fetching article content from: ${latest.link}...`);
    const articleRes = await fetch(latest.link);
    const html = await articleRes.text();
    
    // Simple HTML cleaning (remove tags, scripts, styles)
    const cleanText = html
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]*>?/gm, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 5000); // Limit context for Gemini

    // 3. Summarize using gemini CLI
    console.log('Generating summary using Gemini CLI...');
    const prompt = `以下のオーストラリアのニュース記事を、300文字程度の日本語で分かりやすく要約してください。
PRやワーキングホリデーで滞在している日本人が関心を持つポイントを強調してください。
最後に、ニュースの元記事URL (${latest.link}) を必ず含めてください。

記事内容:
${cleanText}`;

    // Execute local gemini command
    const summary = execSync('gemini', {
      input: prompt,
      encoding: 'utf-8'
    }).trim();

    if (!summary) {
      throw new Error('Gemini failed to generate summary');
    }

    console.log('Summary generated successfully:');
    console.log('---');
    console.log(summary);
    console.log('---');

    // 4. Post to Threads
    console.log('Posting to Threads...');
    await postToThreads(summary, latest.thumbnail);
    
    console.log('Done! Successfully posted latest news to Threads.');

  } catch (error) {
    console.error('Failed to automate news posting:', error);
    process.exit(1);
  }
}

postLatestNews();
