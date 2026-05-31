import { NewsExtractor } from "./index";
import { decodeHtmlEntities, isNoise } from "../utils";

export const AbcExtractor: NewsExtractor = {
  canHandle: (url) => url.includes("abc.net.au"),
  extract: async (url) => {
    const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    const html = await response.text();
    const paragraphs: string[] = [];
    let currentParagraph = "";

    await new HTMLRewriter()
      .on('p[class*="paragraph_paragraph"]', {
        element(el) {
          el.onEndTag(() => {
            const cleaned = currentParagraph.trim().replace(/\s+/g, ' ');
            if (cleaned && !isNoise(cleaned)) {
              paragraphs.push(cleaned);
            }
            currentParagraph = "";
          });
        },
        text(text) {
          currentParagraph += text.text;
        }
      })
      .transform(new Response(html))
      .text();
    
    return decodeHtmlEntities(paragraphs.join('\n\n'));
  }
};
