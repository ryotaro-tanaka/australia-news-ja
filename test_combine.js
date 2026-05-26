
async function translateText(text, targetLang = 'ja') {
  if (!text) return null;
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" }
    });
    if (!response.ok) {
        console.error(`Fetch failed with status ${response.status}`);
        return null;
    }
    const data = await response.json();
    return data[0].map((item) => item[0]).join("") || null;
  } catch (e) {
    console.error(`Translation error (${targetLang}):`, e);
    return null;
  }
}

async function test() {
    const title = "1.2 million Queensland homes without compliant smoke alarms near deadline";
    const body = "A national company estimates many Queensland homes are unprepared as the deadline to install compliant smoke alarms nears.";
    
    // Combine with a unique separator
    const combined = `${title}\n---\n${body}`;
    
    console.log("Testing combined translation...");
    const result = await translateText(combined);
    console.log("Result:");
    console.log(result);
    
    if (result) {
        const parts = result.split(/[\r\n]+---[\r\n]+/);
        console.log("Split parts:");
        console.log("Title:", parts[0]);
        console.log("Body:", parts[1]);
    }
}

test();
