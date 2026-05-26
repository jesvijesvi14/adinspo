import { useState, useMemo, useEffect, useCallback } from "react";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const PROXY_BASE = "http://localhost:3001";

// ─── MOCK FALLBACK DATA ───────────────────────────────────────────────────────
const MOCK_ADS = [
  { id: "m1", source: "tiktok", sourceIcon: "🎵", sourceName: "TikTok Creative Center",
    page_name: "Gym Shark", date: "May 20, 2026", month: "May 2026", category: "headlines", type: "text",
    headline: "Train like you mean it.", body: "New arrivals just dropped. Engineered for performance, designed to turn heads.\n\nWhether you're lifting, running, or just trying to look good doing it — this is your kit.",
    cta: "Shop New Arrivals →", subtext: "Free delivery on orders over $75.", tags: ["product", "launch"], likes: 4200, ctr: "3.2%" },
  { id: "m2", source: "pinterest", sourceIcon: "📌", sourceName: "Pinterest Ad Library",
    page_name: "Huel", date: "May 18, 2026", month: "May 2026", category: "copy-patterns", type: "text",
    headline: "400 calories. 40g protein. 30 seconds.", body: "You don't have time to meal prep. Huel does it for you.\n\nComplete nutrition in a shake. Used by 200,000+ people in 80+ countries.",
    cta: "Try Huel for $1.49 per meal →", subtext: "No subscription required. Cancel any time.", tags: ["health", "social proof"], likes: 0 },
  { id: "m3", source: "tiktok", sourceIcon: "🎵", sourceName: "TikTok Creative Center",
    page_name: "Dollar Shave Club", date: "May 15, 2026", month: "May 2026", category: "headlines", type: "text",
    headline: "Razors so good, your face will write us a thank-you note.", body: "Stop overpaying at the drugstore. We ship premium razors to your door for a fraction of the price.\n\nStarter set: $5. Delivered. Done.",
    cta: "Get Your Starter Set →", subtext: "No hidden fees. Cancel any time.", tags: ["sale", "urgency"], likes: 8900, ctr: "5.1%" },
  { id: "m4", source: "pinterest", sourceIcon: "📌", sourceName: "Pinterest Ad Library",
    page_name: "Athletic Greens", date: "May 10, 2026", month: "May 2026", category: "copy-patterns", type: "text",
    headline: "I replaced 10 supplements with one.", body: "AG1 contains 75 vitamins, minerals, and whole-food sourced ingredients.\n\nI take it every morning. My energy is better. My sleep is better.",
    cta: "Get 1 year of free Vitamin D3+K2 →", subtext: "With your first subscription order.", tags: ["health", "testimonial"], likes: 0 },
  { id: "m5", source: "tiktok", sourceIcon: "🎵", sourceName: "TikTok Creative Center",
    page_name: "BYLT", date: "Apr 28, 2026", month: "April 2026", category: "templates", type: "text",
    headline: "The last t-shirt you'll ever need to buy.", body: "Most shirts lose their shape after 10 washes. BYLT basics are built to last 500+. Guaranteed.",
    cta: "Shop BYLT Basics →", subtext: "Free shipping over $50. 30-day returns.", tags: ["durability", "product"], likes: 3100, ctr: "2.8%" },
  { id: "m6", source: "pinterest", sourceIcon: "📌", sourceName: "Pinterest Ad Library",
    page_name: "Outer Furniture", date: "Apr 20, 2026", month: "April 2026", category: "headlines", type: "text",
    headline: "The outdoor sofa designed to get rained on.", body: "No more dragging cushions inside. Outer outdoor furniture is weather-resistant, easy to clean, and insanely comfortable. 10,000+ 5-star reviews.",
    cta: "Shop Outdoor Furniture →", subtext: "0% APR financing available.", tags: ["testimonial", "social proof"], likes: 0 },
];

const TABS = [
  { id: "all",            label: "🗂 All Ads" },
  { id: "templates",      label: "📋 Templates" },
  { id: "copy-patterns",  label: "✍️ Copy Patterns" },
  { id: "weekly-analysis",label: "📊 Weekly Analysis" },
  { id: "headlines",      label: "🔥 Headlines" },
];

const COUNTRIES = ["US", "GB", "CA", "AU", "NZ", "DE", "FR", "BR", "IN", "JP"];
const PERIODS   = [
  { value: "7",   label: "Last 7 days" },
  { value: "30",  label: "Last 30 days" },
  { value: "120", label: "Last 4 months" },
  { value: "180", label: "Last 6 months" },
];
const SOURCES = [
  { id: "both",      label: "🔀 Both",     icon: null },
  { id: "tiktok",    label: "🎵 TikTok",   icon: "tiktok" },
  { id: "pinterest", label: "📌 Pinterest", icon: "pinterest" },
];

const TAG_COLORS = ["#3b82f6","#8b5cf6","#ec4899","#10b981","#f59e0b","#ef4444"];
const tagColor = (t) => TAG_COLORS[Math.abs([...t].reduce((a,c)=>a+c.charCodeAt(0),0)) % TAG_COLORS.length];

const SOURCE_STYLE = {
  tiktok:    { bg: "#1a0a1e", border: "#7c3aed", color: "#c4b5fd" },
  pinterest: { bg: "#1a0a0a", border: "#dc2626", color: "#fca5a5" },
};

// ─── ERROR BANNER ─────────────────────────────────────────────────────────────
function ErrorBanner({ errors, onRetry, onDismiss }) {
  const hasServer = errors.server;
  const hasTikTok = errors.tiktok;
  const hasPinterest = errors.pinterest;
  return (
    <div style={{ background: "#0f172a", border: "1px solid #1e40af44", borderRadius: 12, padding: "14px 18px", margin: "14px 24px", display: "flex", gap: 12, alignItems: "flex-start" }}>
      <span style={{ fontSize: 22, flexShrink: 0 }}>⚡</span>
      <div style={{ flex: 1, fontSize: 13, color: "#94a3b8", lineHeight: 1.6 }}>
        {hasServer && <div><strong style={{ color: "#f9fafb" }}>Proxy not running.</strong> In Terminal: <code style={{ background: "#1f2937", padding: "1px 6px", borderRadius: 4, color: "#a5b4fc", fontSize: 12 }}>cd ~/ad-feed && node server.js</code></div>}
        {hasTikTok && !hasServer && <div>🎵 TikTok session expired — open <a href="https://ads.tiktok.com/business/creativecenter/inspiration/topads/pc/en" target="_blank" rel="noreferrer" style={{ color: "#818cf8" }}>TikTok Creative Center</a> in Chrome, then retry.</div>}
        {hasPinterest && !hasServer && <div>📌 Pinterest error: {errors.pinterest}</div>}
        <div style={{ color: "#6b7280", marginTop: 4 }}>Showing demo ads in the meantime.</div>
      </div>
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        <button onClick={onRetry} style={{ background: "#2563eb", border: "none", color: "#fff", padding: "4px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Retry</button>
        <button onClick={onDismiss} style={{ background: "none", border: "none", color: "#6b7280", fontSize: 18, cursor: "pointer" }}>✕</button>
      </div>
    </div>
  );
}

// ─── AD CARD ──────────────────────────────────────────────────────────────────
function AdCard({ ad, onClick }) {
  const srcStyle = SOURCE_STYLE[ad.source] || SOURCE_STYLE.tiktok;
  return (
    <div onClick={() => onClick(ad)}
      style={{ background: "#111827", borderRadius: 12, overflow: "hidden", cursor: "pointer", border: "1px solid #1f2937", transition: "transform 0.15s, box-shadow 0.15s", display: "flex", flexDirection: "column" }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 30px rgba(0,0,0,0.5)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
    >
      {/* Thumbnail */}
      {ad.thumbnail && (
        <div style={{ width: "100%", height: 160, overflow: "hidden", background: "#1e293b", flexShrink: 0, position: "relative" }}>
          <img src={ad.thumbnail} alt={ad.headline}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={e => { e.target.parentElement.style.display = "none"; }} />
          {/* Source badge over image */}
          <span style={{ position: "absolute", top: 8, right: 8, background: srcStyle.bg, border: `1px solid ${srcStyle.border}`, color: srcStyle.color, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20 }}>
            {ad.sourceIcon} {ad.sourceName?.split(" ")[0]}
          </span>
        </div>
      )}

      <div style={{ padding: "13px 15px 11px", flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
        {/* Top row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
            {/* Source badge (no thumbnail case) */}
            {!ad.thumbnail && (
              <span style={{ background: srcStyle.bg, border: `1px solid ${srcStyle.border}`, color: srcStyle.color, fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 20, whiteSpace: "nowrap", flexShrink: 0 }}>
                {ad.sourceIcon}
              </span>
            )}
            <span style={{ background: "#1f2937", color: "#9ca3af", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {ad.page_name}
            </span>
          </div>
          <span style={{ background: "#065f46", color: "#6ee7b7", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap", flexShrink: 0 }}>
            {ad.date?.split(",")[0]}
          </span>
        </div>

        {/* Headline + body */}
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#f9fafb", lineHeight: 1.3, marginBottom: 5 }}>{ad.headline}</div>
          {ad.body && <div style={{ color: "#9ca3af", fontSize: 12, lineHeight: 1.5 }}>{ad.body.slice(0, 150)}{ad.body.length > 150 ? "…" : ""}</div>}
        </div>

        {/* Engagement (TikTok only) */}
        {ad.source === "tiktok" && (ad.ctr || ad.likes > 0) && (
          <div style={{ display: "flex", gap: 10, fontSize: 11, color: "#6b7280" }}>
            {ad.ctr && <span>📊 {ad.ctr} CTR</span>}
            {ad.likes > 0 && <span>❤️ {ad.likes.toLocaleString()}</span>}
          </div>
        )}

        {/* CTA */}
        {ad.cta && (
          <div style={{ borderTop: "1px solid #1f2937", paddingTop: 7 }}>
            <div style={{ fontWeight: 700, color: "#f9fafb", fontSize: 12 }}>{ad.cta}</div>
          </div>
        )}

        {/* Tags */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" }}>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {(ad.tags || []).slice(0, 2).map(t => (
              <span key={t} style={{ background: tagColor(t) + "22", color: tagColor(t), fontSize: 10, padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>#{t}</span>
            ))}
          </div>
          <span style={{ fontSize: 16 }}>👍</span>
        </div>
      </div>
    </div>
  );
}

// ─── MODAL ────────────────────────────────────────────────────────────────────
function Modal({ ad, onClose }) {
  if (!ad) return null;
  const srcStyle = SOURCE_STYLE[ad.source] || SOURCE_STYLE.tiktok;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#111827", borderRadius: 16, maxWidth: 660, width: "100%", maxHeight: "90vh", overflowY: "auto", border: "1px solid #374151" }}>
        {ad.thumbnail && <img src={ad.thumbnail} alt={ad.headline} style={{ width: "100%", maxHeight: 260, objectFit: "cover", borderRadius: "16px 16px 0 0" }} onError={e => { e.target.style.display = "none"; }} />}
        <div style={{ padding: 26 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              <span style={{ background: srcStyle.bg, border: `1px solid ${srcStyle.border}`, color: srcStyle.color, fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>
                {ad.sourceIcon} {ad.sourceName}
              </span>
              <span style={{ background: "#1f2937", color: "#9ca3af", fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 20 }}>{ad.page_name}</span>
              <span style={{ background: "#065f46", color: "#6ee7b7", fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 20 }}>{ad.date}</span>
              <span style={{ background: "#312e81", color: "#a5b4fc", fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 20, textTransform: "capitalize" }}>{(ad.category||"").replace("-"," ")}</span>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "#9ca3af", fontSize: 20, cursor: "pointer" }}>✕</button>
          </div>

          <h2 style={{ color: "#f9fafb", fontSize: 20, fontWeight: 800, marginBottom: 16, lineHeight: 1.3 }}>{ad.headline}</h2>

          {/* TikTok stats */}
          {ad.source === "tiktok" && (ad.ctr || ad.likes > 0 || ad.comments > 0) && (
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              {[
                ad.ctr       && { label: "CTR",      value: ad.ctr,                    icon: "📊" },
                ad.likes > 0 && { label: "Likes",    value: ad.likes.toLocaleString(), icon: "❤️" },
                ad.comments > 0 && { label: "Comments", value: ad.comments.toLocaleString(), icon: "💬" },
                ad.shares > 0   && { label: "Shares",   value: ad.shares.toLocaleString(),   icon: "🔁" },
              ].filter(Boolean).map(s => (
                <div key={s.label} style={{ background: "#1f2937", borderRadius: 8, padding: "8px 14px", textAlign: "center", minWidth: 80 }}>
                  <div style={{ color: "#f9fafb", fontWeight: 800, fontSize: 16 }}>{s.icon} {s.value}</div>
                  <div style={{ color: "#6b7280", fontSize: 11 }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {ad.body && (
            <div style={{ background: "#1f2937", borderRadius: 10, padding: 16, marginBottom: 14 }}>
              <div style={{ color: "#6b7280", fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>AD COPY</div>
              <div style={{ color: "#d1d5db", fontSize: 14, lineHeight: 1.8, whiteSpace: "pre-line" }}>{ad.body}</div>
            </div>
          )}

          {ad.cta && (
            <div style={{ background: "#065f4622", border: "1px solid #065f46", borderRadius: 8, padding: 13, marginBottom: 14 }}>
              <div style={{ color: "#6b7280", fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>CALL TO ACTION</div>
              <div style={{ color: "#f9fafb", fontWeight: 700, fontSize: 15 }}>{ad.cta}</div>
              {ad.subtext && <div style={{ color: "#9ca3af", fontSize: 13, marginTop: 5 }}>{ad.subtext}</div>}
            </div>
          )}

          {(ad.tags||[]).length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {ad.tags.map(t => (
                <span key={t} style={{ background: tagColor(t) + "22", color: tagColor(t), fontSize: 12, padding: "4px 10px", borderRadius: 20, fontWeight: 600 }}>#{t}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function AdInspirationFeed() {
  const [activeTab,    setActiveTab]    = useState("all");
  const [activeSource, setActiveSource] = useState("both");
  const [country,      setCountry]      = useState("US");
  const [period,       setPeriod]       = useState("7");
  const [query,        setQuery]        = useState("health wellness");
  const [queryInput,   setQueryInput]   = useState("health wellness");
  const [selectedAd,   setSelectedAd]   = useState(null);

  const [ads,          setAds]          = useState([]);
  const [isLoading,    setIsLoading]    = useState(true);
  const [errors,       setErrors]       = useState({});
  const [usingMock,    setUsingMock]    = useState(false);
  const [showBanner,   setShowBanner]   = useState(true);
  const [lastUpdated,  setLastUpdated]  = useState(null);
  const [sourceCounts, setSourceCounts] = useState({ tiktok: 0, pinterest: 0 });

  const loadAds = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    setErrors({});
    try {
      const refreshParam = forceRefresh ? "&refresh=1" : "";
      const url = `${PROXY_BASE}/api/all-ads?query=${encodeURIComponent(query)}&country=${country}&period=${period}${refreshParam}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(45000) });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      if (data.ads?.length > 0) {
        setAds(data.ads);
        setUsingMock(false);
        setLastUpdated(new Date().toLocaleTimeString());
        setSourceCounts({ tiktok: data.sources?.tiktok || 0, pinterest: data.sources?.pinterest || 0 });
        if (data.errors && Object.keys(data.errors).length > 0) setErrors(data.errors);
      } else {
        setAds(MOCK_ADS);
        setUsingMock(true);
      }
    } catch {
      setErrors({ server: true });
      setAds(MOCK_ADS);
      setUsingMock(true);
    } finally {
      setIsLoading(false);
    }
  }, [query, country, period]);

  useEffect(() => { loadAds(); }, [query, country, period]); // eslint-disable-line

  const filtered = useMemo(() => {
    let list = ads;
    if (activeSource === "tiktok")    list = list.filter(a => a.source === "tiktok");
    if (activeSource === "pinterest") list = list.filter(a => a.source === "pinterest");
    if (activeTab !== "all")          list = list.filter(a => a.category === activeTab);
    return list;
  }, [ads, activeTab, activeSource]);

  const handleSearch = e => { e.preventDefault(); setQuery(queryInput); };

  return (
    <div style={{ minHeight: "100vh", background: "#0d1117", color: "#f9fafb", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

      {/* ── TOP BAR ── */}
      <div style={{ background: "#111827", borderBottom: "1px solid #1f2937", padding: "0 24px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", alignItems: "center", height: 52, gap: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 17, color: "#f9fafb", marginRight: 20, whiteSpace: "nowrap" }}>🎯 Ad Inspiration Feed</div>
          <div style={{ display: "flex", gap: 2, flex: 1, overflowX: "auto" }}>
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ background: activeTab === tab.id ? "#1f2937" : "none", border: "none", color: activeTab === tab.id ? "#f9fafb" : "#6b7280", padding: "6px 13px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>
                {tab.label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 16 }}>
            <span style={{ background: usingMock ? "#92400e33" : "#0f172a", border: `1px solid ${usingMock ? "#92400e" : "#065f46"}`, color: usingMock ? "#fbbf24" : "#6ee7b7", fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, whiteSpace: "nowrap" }}>
              {usingMock ? "⚠ Demo" : "🟢 Live"}
            </span>
            <span style={{ color: "#6b7280", fontSize: 13 }}>{filtered.length} ads</span>
          </div>
        </div>
      </div>

      {/* ── ERROR BANNER ── */}
      {(errors.server || errors.tiktok || errors.pinterest) && showBanner && (
        <ErrorBanner errors={errors} onRetry={() => { setShowBanner(true); loadAds(true); }} onDismiss={() => setShowBanner(false)} />
      )}

      {/* ── FILTER BAR ── */}
      <div style={{ background: "#0d1117", borderBottom: "1px solid #1f2937", padding: "10px 24px", position: "sticky", top: 52, zIndex: 99 }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>

          {/* Source toggle */}
          <div style={{ display: "flex", background: "#1f2937", borderRadius: 8, padding: 3, gap: 2 }}>
            {SOURCES.map(s => (
              <button key={s.id} onClick={() => setActiveSource(s.id)} style={{ background: activeSource === s.id ? "#374151" : "none", border: "none", color: activeSource === s.id ? "#f9fafb" : "#6b7280", padding: "4px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
                {s.label}
                {!usingMock && s.id === "tiktok"    && sourceCounts.tiktok    > 0 && <span style={{ marginLeft: 5, background: "#7c3aed22", color: "#c4b5fd", fontSize: 10, padding: "1px 5px", borderRadius: 10 }}>{sourceCounts.tiktok}</span>}
                {!usingMock && s.id === "pinterest"  && sourceCounts.pinterest > 0 && <span style={{ marginLeft: 5, background: "#dc262622", color: "#fca5a5", fontSize: 10, padding: "1px 5px", borderRadius: 10 }}>{sourceCounts.pinterest}</span>}
              </button>
            ))}
          </div>

          {/* Search (Pinterest query) */}
          <form onSubmit={handleSearch} style={{ display: "flex", gap: 6 }}>
            <input value={queryInput} onChange={e => setQueryInput(e.target.value)} placeholder="Pinterest search..." style={{ background: "#1f2937", border: "1px solid #374151", color: "#f9fafb", padding: "5px 12px", borderRadius: 8, fontSize: 12, outline: "none", width: 180 }} />
            <button type="submit" style={{ background: "#dc2626", border: "none", color: "#fff", padding: "5px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>📌 Search</button>
          </form>

          {/* Country */}
          <select value={country} onChange={e => setCountry(e.target.value)} style={{ background: "#1f2937", border: "1px solid #374151", color: "#f9fafb", padding: "5px 10px", borderRadius: 8, fontSize: 12, outline: "none", cursor: "pointer" }}>
            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Period (TikTok) */}
          <select value={period} onChange={e => setPeriod(e.target.value)} style={{ background: "#1f2937", border: "1px solid #374151", color: "#f9fafb", padding: "5px 10px", borderRadius: 8, fontSize: 12, outline: "none", cursor: "pointer" }}>
            {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>

          <button onClick={() => loadAds(true)} disabled={isLoading} style={{ background: "#1f2937", border: "1px solid #374151", color: isLoading ? "#6b7280" : "#f9fafb", padding: "5px 12px", borderRadius: 8, cursor: isLoading ? "default" : "pointer", fontSize: 12, fontWeight: 600 }}>
            {isLoading ? "Loading…" : "🔄 Refresh"}
          </button>

          {lastUpdated && !usingMock && <span style={{ color: "#6b7280", fontSize: 12 }}>Updated {lastUpdated}</span>}
        </div>
      </div>

      {/* ── AD GRID ── */}
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px" }}>
        {isLoading && ads.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#6b7280" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
            <div style={{ fontSize: 16 }}>Fetching ads from TikTok + Pinterest…</div>
            <div style={{ fontSize: 13, marginTop: 6, color: "#4b5563" }}>First load takes 20–40 seconds</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#6b7280" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>No ads found</div>
            <div style={{ fontSize: 14, marginTop: 4 }}>Try a different filter or search term.</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
            {filtered.map(ad => <AdCard key={ad.id} ad={ad} onClick={setSelectedAd} />)}
          </div>
        )}
      </div>

      <Modal ad={selectedAd} onClose={() => setSelectedAd(null)} />
    </div>
  );
}
