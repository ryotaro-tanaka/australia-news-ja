interface Env {
  AI: Ai;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const RSS_URL = "https://www.abc.net.au/news/feed/2942460/rss.xml";

  try {
    const response = await fetch(RSS_URL);
    const xml = await response.text();

    // 簡易的なパース（MVPのため。後ほどより堅牢なパーサーを検討）
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

    // 翻訳処理（バッチ処理が理想だが、まずはループで。Workers AI の無料枠内で動作）
    const translatedNews = await Promise.all(
      rawNews.map(async (news) => {
        try {
          const translationTitle = await context.env.AI.run("@cf/meta/m2m100-1.2b", {
            text: news.title,
            source_lang: "english",
            target_lang: "japanese",
          });
          const translationLine = await context.env.AI.run("@cf/meta/m2m100-1.2b", {
            text: news.firstLine,
            source_lang: "english",
            target_lang: "japanese",
          });

          return {
            ...news,
            title_ja: translationTitle.translated_text || news.title,
            firstLine_ja: translationLine.translated_text || news.firstLine,
          };
        } catch (e) {
          return { ...news, title_ja: news.title, firstLine_ja: news.firstLine };
        }
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
