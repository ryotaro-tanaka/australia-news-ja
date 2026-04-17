async function translateText(text: string): Promise<string> {
  if (!text) return "";
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ja&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    const data = await response.json() as any;
    // Google Translate のレスポンス形式: [[["訳文", "原文", ...]]]
    return data[0].map((item: any) => item[0]).join("") || text;
  } catch (e) {
    console.error("Translation error:", e);
    return text;
  }
}

export const onRequest: PagesFunction = async (context) => {
  const RSS_URL = "https://www.abc.net.au/news/feed/2942460/rss.xml";

  try {
    const response = await fetch(RSS_URL);
    const xml = await response.text();

    // 簡易的なパース
    const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
    
    const rawNews = items.slice(0, 10).map(item => {
      const title = item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)?.[1] || 
                    item.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "";
      const link = item.match(/<link>([\s\S]*?)<\/link>/)?.[1] || "";
      const description = item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/)?.[1] ||
                          item.match(/<description>([\s\S]*?)<\/description>/)?.[1] || "";
      
      const firstLine = (description.split(/[.!?]/)[0] || "").trim() + '.';

      return { title, link, firstLine };
    });

    // Google Translate で翻訳
    const translatedNews = await Promise.all(
      rawNews.map(async (news) => {
        const [titleJa, lineJa] = await Promise.all([
          translateText(news.title),
          translateText(news.firstLine)
        ]);

        return {
          ...news,
          title_ja: titleJa,
          firstLine_ja: lineJa,
        };
      })
    );

    return new Response(JSON.stringify(translatedNews), {
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to fetch news" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
