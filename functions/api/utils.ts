export function decodeHtmlEntities(text: string): string {
  if (!text) return "";
  return text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

export function smartTruncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const truncated = text.substring(0, maxLength);
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf(". "),
    truncated.lastIndexOf("! "),
    truncated.lastIndexOf("? "),
    truncated.lastIndexOf("\n")
  );
  if (lastSentenceEnd > 0) {
    return truncated.substring(0, lastSentenceEnd + 1).trim();
  }
  const lastSpace = truncated.lastIndexOf(" ");
  return lastSpace > 0 ? truncated.substring(0, lastSpace).trim() : truncated;
}

export function cleanHtml(html: string): string {
  if (!html) return "";
  const withoutCdata = html.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  const withoutTags = withoutCdata.replace(/<[^>]*>?/gm, '');
  return decodeHtmlEntities(withoutTags).trim();
}
