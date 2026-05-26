/**
 * Ad Inspiration Feed — Proxy Server
 * Sources: TikTok Creative Center + Pinterest Ad Library
 *
 * Setup:  npm install && node server.js
 * Endpoints:
 *   GET /api/tiktok-ads?country=US&period=7
 *   GET /api/pinterest-ads?query=fitness&country=US
 *   GET /api/all-ads?query=fitness&country=US&period=7
 *   GET /api/health
 */

const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ─── CHROME FINDER ────────────────────────────────────────────────────────────
function findChrome() {
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    process.env.PUPPETEER_EXECUTABLE_PATH,
  ].filter(Boolean);
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function launchBrowser() {
  const chromePath = findChrome();
  if (!chromePath) throw new Error("Chrome not found. Install Google Chrome from https://www.google.com/chrome/");
  console.log(`[Browser] Launching: ${chromePath}`);
  return puppeteer.launch({
    executablePath: chromePath,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });
}

// ─── SIMPLE FILE CACHE ────────────────────────────────────────────────────────
const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const CACHE_DIR = path.join(__dirname, ".cache");
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR);

function cacheKey(name, params) {
  return path.join(CACHE_DIR, `${name}_${JSON.stringify(params).replace(/[^a-z0-9]/gi, "_")}.json`);
}
function readCache(key) {
  try {
    const data = JSON.parse(fs.readFileSync(key, "utf8"));
    if (Date.now() - data.ts < CACHE_TTL) return data.payload;
  } catch {}
  return null;
}
function writeCache(key, payload) {
  fs.writeFileSync(key, JSON.stringify({ ts: Date.now(), payload }));
}

// ─── TAG DERIVER ──────────────────────────────────────────────────────────────
function deriveTags(text) {
  return [
    ["sale",        /sale|off|discount|deal|save|promo|code/i],
    ["testimonial", /review|testimonial|story|experience|tried|worked/i],
    ["urgency",     /limited|hurry|expires|ending|last chance|only \d/i],
    ["free trial",  /free trial|try.*free|first.*free/i],
    ["health",      /health|wellness|vitamin|supplement|nutrient|fitness|weight/i],
    ["social proof",/\d[\d,k+]*\s*(reviews?|customers?|people|users?)/i],
    ["product",     /introducing|new product|launch|available now|just dropped/i],
    ["lifestyle",   /life|style|everyday|routine|morning|daily/i],
  ]
    .filter(([, rx]) => rx.test(text))
    .map(([tag]) => tag)
    .slice(0, 3);
}

function guessCategory(text) {
  if (/off|sale|discount|deal|save|promo|code/i.test(text)) return "copy-patterns";
  if (/why|secret|truth|mistake|lying|confession|apology|warning/i.test(text)) return "headlines";
  if (/analysis|review|result|data|insight|breakdown/i.test(text)) return "weekly-analysis";
  return "templates";
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIKTOK CREATIVE CENTER
// ═══════════════════════════════════════════════════════════════════════════════
function mapTikTokAd(raw) {
  const startMs = (raw.first_shown_date || raw.last_shown_date || 0) * 1000;
  const date = startMs ? new Date(startMs).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Recent";
  const month = startMs ? new Date(startMs).toLocaleString("default", { month: "long", year: "numeric" }) : "Recent";
  const headline = raw.ad_title || raw.video_info?.title || "";
  const body = raw.ad_text || raw.video_info?.desc || "";
  const text = (headline + " " + body).toLowerCase();
  return {
    id: `tt_${raw.id || raw.item_id || Math.random()}`,
    source: "tiktok",
    sourceName: "TikTok Creative Center",
    sourceIcon: "🎵",
    page_name: raw.advertiser_name || raw.brand_name || "Unknown",
    date, month, headline: headline || "(No headline)", body,
    cta: raw.cta_text || raw.call_to_action || "",
    subtext: raw.landing_page_url || "",
    thumbnail: raw.video_info?.cover || raw.image_info?.url || raw.cover_image_url || null,
    type: "image",
    category: guessCategory(text),
    likes: raw.like_count || raw.video_info?.digg_count || 0,
    comments: raw.comment_count || raw.video_info?.comment_count || 0,
    shares: raw.share_count || raw.video_info?.share_count || 0,
    ctr: raw.ctr ? (raw.ctr * 100).toFixed(2) + "%" : null,
    tags: deriveTags(text),
  };
}

async function fetchTikTokAds({ country = "US", period = 7, page = 1, pageSize = 24 } = {}) {
  const ck = cacheKey("tiktok", { country, period, page });
  const cached = readCache(ck);
  if (cached) { console.log("[TikTok] Cache hit"); return cached; }

  const browser = await launchBrowser();
  try {
    const p = await browser.newPage();
    await p.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
    await p.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9" });

    console.log("[TikTok] Loading Creative Center...");
    await p.goto("https://ads.tiktok.com/business/creativecenter/inspiration/topads/pc/en", {
      waitUntil: "networkidle2", timeout: 30000,
    });
    await new Promise(r => setTimeout(r, 3000));

    const apiUrl = `https://ads.tiktok.com/creative_radar_api/v1/top_ads/v2/list?period=${period}&country_code=${country}&material_type=1&page=${page}&page_size=${pageSize}&order_by=last_shown_date`;
    const result = await p.evaluate(async (url) => {
      const res = await fetch(url, {
        credentials: "include",
        headers: { "Accept": "application/json, text/plain, */*", "Referer": "https://ads.tiktok.com/business/creativecenter/inspiration/topads/pc/en" },
      });
      return res.json();
    }, apiUrl);

    if (result.code !== 0) throw new Error(`TikTok API error ${result.code}: ${result.msg}`);
    const ads = (result.data?.list || result.data?.materials || []).map(mapTikTokAd);
    writeCache(ck, ads);
    return ads;
  } finally {
    await browser.close();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PINTEREST AD LIBRARY
// ═══════════════════════════════════════════════════════════════════════════════
function mapPinterestAd(raw) {
  const text = ((raw.title || "") + " " + (raw.description || "") + " " + (raw.advertiser || "")).toLowerCase();
  return {
    id: `pin_${raw.id || raw.pin_id || Math.random()}`,
    source: "pinterest",
    sourceName: "Pinterest Ad Library",
    sourceIcon: "📌",
    page_name: raw.advertiser || raw.advertiser_name || "Pinterest Advertiser",
    date: raw.date || "Recent",
    month: raw.month || "Recent",
    headline: raw.title || raw.headline || "(No headline)",
    body: raw.description || raw.body || "",
    cta: raw.cta || raw.call_to_action || "Learn More",
    subtext: raw.destination_url || raw.link || "",
    thumbnail: raw.image_url || raw.image || null,
    type: "image",
    category: guessCategory(text),
    tags: deriveTags(text),
    likes: 0, comments: 0, shares: 0, ctr: null,
  };
}

async function fetchPinterestAds({ query = "health wellness", country = "US" } = {}) {
  const ck = cacheKey("pinterest", { query, country });
  const cached = readCache(ck);
  if (cached) { console.log("[Pinterest] Cache hit"); return cached; }

  const browser = await launchBrowser();
  try {
    const p = await browser.newPage();
    await p.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
    await p.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9" });

    // Intercept the internal API response
    const adResults = [];
    p.on("response", async (response) => {
      const url = response.url();
      if (url.includes("/resource/") && url.includes("AdLibrary") || url.includes("ad_library") || url.includes("AdSearch")) {
        try {
          const json = await response.json();
          const items = json?.resource_response?.data?.results || json?.resource_response?.data || [];
          if (Array.isArray(items) && items.length > 0) adResults.push(...items);
        } catch {}
      }
    });

    // Navigate to ad library with query
    const libraryUrl = `https://www.pinterest.com/ads/library/?query=${encodeURIComponent(query)}`;
    console.log(`[Pinterest] Loading: ${libraryUrl}`);
    await p.goto(libraryUrl, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));

    // Try to find results via DOM scraping as primary method
    const domAds = await p.evaluate(() => {
      const results = [];
      // Pinterest ad cards — try multiple selector patterns
      const selectors = [
        '[data-test-id="ad-library-result"]',
        '[data-test-id="pinrep"]',
        '[data-test-id="pin"]',
        'div[class*="Pin"]',
        'div[class*="pin"]',
        '[data-grid-item]',
      ];

      let cards = [];
      for (const sel of selectors) {
        cards = document.querySelectorAll(sel);
        if (cards.length > 0) break;
      }

      cards.forEach((card, i) => {
        if (i >= 30) return;
        const img = card.querySelector("img");
        const title = card.querySelector("h3, h2, [class*='title'], [class*='Title']");
        const desc = card.querySelector("p, [class*='description'], [class*='Description'], [class*='body']");
        const advertiser = card.querySelector('[class*="advertiser"], [class*="brand"], [class*="source"]');
        const link = card.querySelector("a[href]");

        if (img || title) {
          results.push({
            id: `dom_${i}_${Date.now()}`,
            image_url: img?.src || img?.dataset?.src || null,
            title: title?.textContent?.trim() || "",
            description: desc?.textContent?.trim() || "",
            advertiser: advertiser?.textContent?.trim() || "Pinterest Advertiser",
            link: link?.href || "",
            date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
            month: new Date().toLocaleString("default", { month: "long", year: "numeric" }),
          });
        }
      });

      // Also try to get data from Pinterest's page state
      try {
        const scripts = document.querySelectorAll("script[type='application/json'], script#__NEXT_DATA__");
        for (const s of scripts) {
          const text = s.textContent;
          if (text.includes("adLibrary") || text.includes("ad_library")) {
            return { results, pageData: text.slice(0, 5000) };
          }
        }
      } catch {}

      return { results, pageData: null };
    });

    // Merge DOM results with any intercepted API results
    let finalAds = [];

    if (adResults.length > 0) {
      console.log(`[Pinterest] Got ${adResults.length} ads from API interception`);
      finalAds = adResults.map((item, i) => ({
        id: item.id || `pin_${i}`,
        image_url: item.images?.["736x"]?.url || item.image_url || null,
        title: item.grid_title || item.title || "",
        description: item.description || "",
        advertiser: item.advertiser?.name || item.pinner?.full_name || "Pinterest Advertiser",
        link: item.link || `https://www.pinterest.com/pin/${item.id}/`,
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        month: new Date().toLocaleString("default", { month: "long", year: "numeric" }),
      }));
    } else if (domAds.results.length > 0) {
      console.log(`[Pinterest] Got ${domAds.results.length} ads from DOM`);
      finalAds = domAds.results;
    } else {
      // Fallback: scrape any visible pins on the page as creative inspiration
      console.log("[Pinterest] Falling back to general pin scrape");
      const fallbackAds = await p.evaluate((q) => {
        const pins = [];
        document.querySelectorAll("img[src*='pinimg'], img[src*='pinterest']").forEach((img, i) => {
          if (i >= 20) return;
          const card = img.closest("div[data-test-id], article, [role='listitem']") || img.parentElement?.parentElement;
          const title = card?.querySelector("h1,h2,h3,p") || null;
          if (img.src && img.src.includes("pinimg") && img.naturalWidth > 100) {
            pins.push({
              id: `pin_fallback_${i}`,
              image_url: img.src.replace(/\/\d+x\//, "/736x/"),
              title: title?.textContent?.trim() || q,
              description: "",
              advertiser: "Pinterest",
              date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
              month: new Date().toLocaleString("default", { month: "long", year: "numeric" }),
            });
          }
        });
        return pins;
      }, query);
      finalAds = fallbackAds;
    }

    const mapped = finalAds.slice(0, 30).map(mapPinterestAd);
    if (mapped.length > 0) writeCache(ck, mapped);
    return mapped;
  } finally {
    await browser.close();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// TikTok ads
app.get("/api/tiktok-ads", async (req, res) => {
  const { country = "US", period = "7", page = "1", refresh } = req.query;
  if (refresh) {
    const ck = cacheKey("tiktok", { country, period: parseInt(period), page: parseInt(page) });
    try { fs.unlinkSync(ck); } catch {}
  }
  try {
    const ads = await fetchTikTokAds({ country, period: parseInt(period), page: parseInt(page) });
    res.json({ ads, source: "tiktok", total: ads.length });
  } catch (err) {
    console.error("[TikTok Error]", err.message);
    const isAuth = err.message?.includes("40101") || err.message?.includes("permission");
    res.status(isAuth ? 403 : 500).json({
      error: isAuth ? "tiktok_auth" : "server_error",
      message: isAuth ? "TikTok session expired. Open ads.tiktok.com in Chrome and retry." : err.message,
    });
  }
});

// Pinterest ads
app.get("/api/pinterest-ads", async (req, res) => {
  const { query = "health wellness", country = "US", refresh } = req.query;
  if (refresh) {
    const ck = cacheKey("pinterest", { query, country });
    try { fs.unlinkSync(ck); } catch {}
  }
  try {
    const ads = await fetchPinterestAds({ query, country });
    res.json({ ads, source: "pinterest", total: ads.length });
  } catch (err) {
    console.error("[Pinterest Error]", err.message);
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

// Combined feed
app.get("/api/all-ads", async (req, res) => {
  const { query = "health wellness", country = "US", period = "7", sources = "tiktok,pinterest" } = req.query;
  const sourceList = sources.split(",").map(s => s.trim());
  const results = await Promise.allSettled([
    sourceList.includes("tiktok") ? fetchTikTokAds({ country, period: parseInt(period) }) : Promise.resolve([]),
    sourceList.includes("pinterest") ? fetchPinterestAds({ query, country }) : Promise.resolve([]),
  ]);

  const tiktokAds = results[0].status === "fulfilled" ? results[0].value : [];
  const pinterestAds = results[1].status === "fulfilled" ? results[1].value : [];

  const errors = {};
  if (results[0].status === "rejected") errors.tiktok = results[0].reason?.message;
  if (results[1].status === "rejected") errors.pinterest = results[1].reason?.message;

  // Interleave sources for variety
  const merged = [];
  const maxLen = Math.max(tiktokAds.length, pinterestAds.length);
  for (let i = 0; i < maxLen; i++) {
    if (pinterestAds[i]) merged.push(pinterestAds[i]);
    if (tiktokAds[i]) merged.push(tiktokAds[i]);
  }

  res.json({ ads: merged, total: merged.length, sources: { tiktok: tiktokAds.length, pinterest: pinterestAds.length }, errors });
});

// Health check
app.get("/api/health", (_, res) => res.json({ status: "ok", version: "2.0.0", sources: ["tiktok", "pinterest"] }));

// ─── START ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Ad Inspiration Proxy v2 — http://localhost:${PORT}`);
  console.log(`\n   Sources:`);
  console.log(`   🎵 TikTok  → GET /api/tiktok-ads?country=US&period=7`);
  console.log(`   📌 Pinterest → GET /api/pinterest-ads?query=fitness`);
  console.log(`   🔀 Combined  → GET /api/all-ads?query=fitness&country=US`);
  console.log(`\n   Cache: .cache/ folder (1hr TTL)\n`);
});
