async function translateText(text: string): Promise<string> {
  if (!text) return "";
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ja&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    const data = await response.json() as any;
    return data[0].map((item: any) => item[0]).join("") || text;
  } catch (e) {
    console.error("Translation error:", e);
    return text;
  }
}

function cleanHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1') // CDATAの中身を取り出す
    .replace(/<[^>]*>?/gm, '') // 残ったタグを削除
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .trim();
}

function extractTagContent(itemXml: string, tagName: string): string {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = itemXml.match(regex);
  if (match) {
    return match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
  }
  return "";
}

export const onRequest: PagesFunction = async (context) => {
  // キャッシュ機能は一時的に完全に無効化
  const RSS_URL = "https://www.theguardian.com/au/rss";

  try {
    const rssResponse = await fetch(RSS_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      }
    });

    if (!rssResponse.ok) {
      throw new Error(`RSS fetch failed: ${rssResponse.status} ${rssResponse.statusText}`);
    }

    const xml = await rssResponse.text();

    // アイテム抽出
    const items = xml.match(/<item[^>]*>([\s\S]*?)<\/item>/gi) || [];
    
    if (items.length === 0) {
      throw new Error("RSS items not found");
    }

    const rawNews = items.slice(0, 10).map(itemXml => {
      const title = cleanHtml(extractTagContent(itemXml, "title"));
      const link = extractTagContent(itemXml, "link");
      const descriptionRaw = extractTagContent(itemXml, "description");
      
      const firstParagraphMatch = descriptionRaw.match(/<p>([\s\S]*?)<\/p>/i);
      const rawFirstLine = firstParagraphMatch ? firstParagraphMatch[1] : descriptionRaw;
      const firstLine = cleanHtml(rawFirstLine);

      return { title, link, firstLine };
    }).filter(news => news.title !== "" && news.link !== "");

    if (rawNews.length === 0) {
      throw new Error("Parsed news list is empty");
    }

    // 翻訳処理
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

    // キャッシュを一切行わずレスポンスを返す
    return new Response(JSON.stringify(translatedNews), {
      headers: { 
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate"
      }
    });

  } catch (error) {
    console.error("Backend error:", error);
    return new Response(JSON.stringify({ 
      error: "Failed to fetch news",
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
