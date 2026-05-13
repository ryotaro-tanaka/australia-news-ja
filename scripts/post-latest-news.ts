import { execSync } from 'child_process';
import { postToThreads } from './post-threads';

// Configuration: Change model name here
const GEMINI_MODEL = 'gemini-3.1-flash-lite-preview';

interface NewsItem {
  title: string;
  link: string;
  thumbnail: string;
}

async function postLatestNews() {
  try {
    // 0. Parse optional index from command line
    const argIndex = process.argv[2];
    const targetIndex = argIndex ? parseInt(argIndex, 10) : 0;

    if (isNaN(targetIndex)) {
      throw new Error(`Invalid index provided: ${argIndex}. Please provide a number.`);
    }

    // 1. Get latest news from API
    console.log('Fetching latest news from API...');
    const newsRes = await fetch('https://news-ja.pages.dev/api/news?limit=20&nocache=1');
    const newsData = await newsRes.json() as NewsItem[];
    
    if (!newsData || newsData.length === 0) {
      throw new Error('No news found from API');
    }

    if (targetIndex < 0 || targetIndex >= newsData.length) {
      throw new Error(`Target index ${targetIndex} is out of bounds. Available news: 0 to ${newsData.length - 1}`);
    }

    const latest = newsData[targetIndex];
    console.log(`Processing news at index ${targetIndex}: ${latest.title}`);

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
    const prompt = `以下のオーストラリアのニュース記事を、250文字程度の日本語で分かりやすく要約してください。
PRやワーキングホリデーで滞在している日本人が関心を持つポイントを強調してください。
最後に、ニュースの元記事URL (${latest.link}) を必ず含めてください。
全体で400文字以内に収めるようにしてください。

要約テキストのみを回答してください。解説、挨拶、または update_topic のようなコードコマンドは一切含めないでください。

記事内容:
${cleanText}`;

    // Execute local gemini command with explicit model specification and headless mode
    // Using --prompt avoids automatic workspace analysis which consumes quota
    const summary = execSync(`gemini -m ${GEMINI_MODEL} --prompt "${prompt.replace(/"/g, '\\"')}"`, {
      encoding: 'utf-8',
    }).trim();

    if (!summary) {
      throw new Error('Gemini failed to generate summary');
    }

    console.log('Summary generated successfully:');
    console.log('---');
    console.log(summary);
    console.log('---');

    // 4. Post to Threads with Tag and Hashtag (Japanese)
    console.log('Posting Japanese version to Threads...');
    const finalMessageJa = `${summary}\n\n#オーストラリア`;
    await postToThreads(finalMessageJa, latest.thumbnail, "オーストラリア");

    // 5. Summarize in Indonesian using Gemini CLI
    console.log('Generating Indonesian summary using Gemini CLI...');
    const promptId = `Tolong ringkas artikel berita Australia berikut ini ke dalam bahasa Indonesia yang mudah dipahami, sekitar 250 karakter.
Tekankan poin-poin yang menarik bagi orang Indonesia yang sedang tinggal di Australia, seperti pemegang visa PR atau Working Holiday (WHV).
Sertakan URL sumber berita (${latest.link}) di akhir ringkasan.
Pastikan total teks tidak lebih dari 400 karakter.

HANYA berikan teks ringkasan saja. JANGAN sertakan penjelasan, salam, atau kode perintah seperti update_topic.

Konten artikel:
${cleanText}`;

    const summaryId = execSync(`gemini -m ${GEMINI_MODEL} --prompt "${promptId.replace(/"/g, '\\"')}"`, {
      encoding: 'utf-8',
    }).trim();

    if (!summaryId) {
      throw new Error('Gemini failed to generate Indonesian summary');
    }

    console.log('Indonesian summary generated successfully:');
    console.log('---');
    console.log(summaryId);
    console.log('---');

    // 6. Post to Threads (Indonesian)
    console.log('Posting Indonesian version to Threads...');
    const footerTextId = `Jika Anda ingin membaca berita Australia dalam Bahasa Indonesia, kunjungi "Kabar Sarapan dari Australia"
https://news-ja.pages.dev/id`;
    const finalMessageId = `${summaryId}\n\n#whvindonesia`;
    await postToThreads(finalMessageId, latest.thumbnail, "Australia", footerTextId);
    
    console.log('Done! Successfully posted both Japanese and Indonesian news to Threads.');

  } catch (error) {
    console.error('Failed to automate news posting:', error);
    process.exit(1);
  }
}

postLatestNews();
