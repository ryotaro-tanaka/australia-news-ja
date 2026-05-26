
async function translateText(text, targetLang = 'ja') {
  if (!text) return null;
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
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
    const texts = [
        "1.2 million Queensland homes without compliant smoke alarms near deadline",
        "Melbourne nightclub has operated for two years without insurance",
        "Push for Australia to extract helium as Iran war impacts global supply",
        "UAE slams 'dangerous escalation' after drone hits near nuclear plant",
        "How Pokémon cards are fuelling crime in Melbourne",
        "Qantas plane diverted after passenger allegedly bites flight attendant",
        "Cakes and connection as cafe project gives women confidence boost"
    ];

    console.log("Starting translation test...");
    const results = await Promise.all(texts.map(t => translateText(t)));
    console.log("Results:");
    results.forEach((r, i) => console.log(`[${i}] ${r}`));
}

test();
