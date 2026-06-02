import { NewsExtractor } from "./index";
import { decodeHtmlEntities } from "../utils";

function isNoise(text: string): boolean {
  const NOISE_KEYWORDS = [
    "live coverage",
    "Thank you for joining us",
    "seen by the ABC",
    "asked that the ABC use",
    "Follow our live",
    "Read more",
    "More to come",
    "Loading..."
  ];
  if (NOISE_KEYWORDS.some(kw => text.includes(kw))) return true;
  if (text.length < 20) return true;
  return false;
}

export const AbcExtractor: NewsExtractor = {
  canHandle: (url) => url.includes("abc.net.au"),
  getThumbnail: (itemXml: string) => {
    const thumbMatch = itemXml.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i);
    if (thumbMatch) return thumbMatch[1];
    const contentMatch = itemXml.match(/<media:content[^>]+url=["']([^"']+)["'][^>]*medium=["']image["']/i);
    if (contentMatch) return contentMatch[1];
    return "";
  },
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
