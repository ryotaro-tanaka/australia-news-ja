interface NewsItem {
  title: string;
  title_ja?: string;
  link: string;
}

async function listNews() {
  try {
    console.log('Fetching news list...');
    const newsRes = await fetch('https://news-ja.pages.dev/api/news?nocache=1');
    const newsData = await newsRes.json() as NewsItem[];
    
    if (!newsData || newsData.length === 0) {
      console.log('No news found.');
      return;
    }

    console.log('\nAvailable News Articles:');
    console.log('-------------------------');
    newsData.forEach((item, index) => {
      const displayTitle = item.title_ja || item.title;
      console.log(`[${index}] ${displayTitle}`);
    });
    console.log('-------------------------');
    console.log('\nTo post an article, run: npm run post <index>');

  } catch (error) {
    console.error('Failed to fetch news list:', error);
    process.exit(1);
  }
}

listNews();
