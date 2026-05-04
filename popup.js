/* Amazon Review Extractor – popup controller */

// Columns & TSV header
const COLUMNS = [
  'Brand',
  'ASIN',
  'Reviewer',
  'Date',
  'Stars',
  'Title',
  'Body',
  'HelpfulVotes',
  'VerifiedPurchase',
  'Variation',
  'Country',
  'HasMedia'
];

// Hostname → country name fallback (used when the review-date text can't be parsed)
const HOSTNAME_COUNTRY = {
  'amazon.com': 'United States',
  'amazon.co.uk': 'United Kingdom',
  'amazon.de': 'Germany',
  'amazon.fr': 'France',
  'amazon.it': 'Italy',
  'amazon.es': 'Spain',
  'amazon.ca': 'Canada',
  'amazon.com.mx': 'Mexico',
  'amazon.com.br': 'Brazil',
  'amazon.co.jp': 'Japan',
  'amazon.in': 'India',
  'amazon.com.au': 'Australia',
  'amazon.nl': 'Netherlands',
  'amazon.se': 'Sweden',
  'amazon.pl': 'Poland',
  'amazon.ae': 'United Arab Emirates',
  'amazon.sa': 'Saudi Arabia',
  'amazon.sg': 'Singapore',
  'amazon.com.tr': 'Turkey',
  'amazon.eg': 'Egypt',
  'amazon.com.be': 'Belgium',
  'amazon.cn': 'China',
  'amazon.co.za': 'South Africa',
  'amazon.ie': 'Ireland'
};

/* ------------------------------------------------------------------ */
/*  IN-PAGE EXTRACTOR                                                 */
/*  This whole function is serialised and run inside the Amazon tab.  */
/*  It must be self-contained — no outer closures.                    */
/* ------------------------------------------------------------------ */
function extractReviewsInPage(hostnameCountryMap, asin) {
  const host = location.hostname.replace(/^www\./, '');
  const fallbackCountry = hostnameCountryMap[host] || '';

  // Try multiple locale patterns to pull country + date out of the
  // "Reviewed in X on Y" line that Amazon renders in every marketplace.
  function parseDateCountry(text, fallback) {
    if (!text) return { country: fallback, date: '' };
    const t = text.trim();
    const patterns = [
      // English: "Reviewed in the United Kingdom on 12 January 2026"
      /^Reviewed in\s+(?:the\s+)?(.+?)\s+on\s+(.+)$/i,
      // German: "Rezension aus Deutschland vom 12. Januar 2026"
      /^Rezension aus\s+(.+?)\s+vom\s+(.+)$/i,
      // French: "Commenté en France le 12 janvier 2026" (also au/aux/à)
      /^Commenté\s+(?:en|au|aux|à)\s+(.+?)\s+le\s+(.+)$/i,
      // Italian: "Recensito in Italia il 12 gennaio 2026"
      /^Recensito\s+(?:in|nel|negli|nei|a|al)\s+(.+?)\s+il\s+(.+)$/i,
      // Spanish: "Opinión emitida en España el 12 de enero de 2026"
      /^Opinión emitida en\s+(.+?)\s+el\s+(.+)$/i,
      // Dutch: "Beoordeeld in Nederland op 12 januari 2026"
      /^Beoordeeld in\s+(.+?)\s+op\s+(.+)$/i,
      // Portuguese (BR): "Avaliado no Brasil em 12 de janeiro de 2026"
      /^Avaliado\s+(?:no|na|em|nos|nas)\s+(.+?)\s+em\s+(.+)$/i,
      // Turkish: "Incelendiği ülke: Türkiye. 12 Ocak 2026 tarihinde incelendi"
      /^İncelendiği ülke:\s*(.+?)\.\s*(.+?)\s+tarihinde incelendi$/i,
      // Swedish: "Recenserad i Sverige den 12 januari 2026"
      /^Recenserad i\s+(.+?)\s+den\s+(.+)$/i,
      // Polish: "Recenzja z Polski z dnia 12 stycznia 2026"
      /^Recenzja z\s+(.+?)\s+z dnia\s+(.+)$/i
    ];
    for (const re of patterns) {
      const m = t.match(re);
      if (m) return { country: m[1].trim(), date: m[2].trim() };
    }
    return { country: fallback, date: t };
  }

  // Collapse internal whitespace and strip surrounding padding
  const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();

  // Body text may contain <br> for line breaks; textContent ignores them, so
  // we swap them for newlines before extraction. We also strip "Read more"
  // toggle anchors/buttons that Amazon injects.
  function getBodyText(bodyEl) {
    if (!bodyEl) return '';
    const clone = bodyEl.cloneNode(true);
    clone.querySelectorAll('a, button').forEach(n => n.remove());
    clone.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
    return clean(clone.textContent);
  }

  // Title structure:
  //   <a data-hook="review-title">
  //     <i data-hook="review-star-rating"><span class="a-icon-alt">2.0 out of 5 stars</span></i>
  //     <span class="a-letter-space"></span>
  //     <span>Not good</span>   ← the actual title (direct child, no class)
  //   </a>
  function getTitleText(titleEl) {
    if (!titleEl) return '';
    const direct = titleEl.querySelector(':scope > span:not([class])');
    if (direct && clean(direct.textContent)) return clean(direct.textContent);
    // Fallback: full text minus the rating-alt prefix
    const text = clean(titleEl.textContent);
    return text.replace(/^[\d.,]+\s*out of\s*5\s*stars\s*/i, '').trim();
  }

  // Stars: parse "4.0 out of 5 stars" or localised equivalent — grab the first number
  function getStars(starEl) {
    if (!starEl) return '';
    const m = starEl.textContent.match(/([\d]+[.,][\d]+|\d+)/);
    return m ? m[1].replace(',', '.') : '';
  }

  // Helpful votes: "12 people found this helpful" / "One person found this helpful" / localised
  function getHelpful(helpfulEl) {
    if (!helpfulEl) return '0';
    const text = helpfulEl.textContent.trim();
    const numMatch = text.match(/\d+/);
    if (numMatch) return numMatch[0];
    // "One person found this helpful" — any non-numeric word form implies 1
    if (/\b(one|une|un|eine|una|uma)\b/i.test(text)) return '1';
    return '0';
  }

  // Brand: try several selectors the /product-reviews/ header uses across
  // marketplaces and layouts. First match wins. Text is normalised to strip
  // "Visit the … Store" / "by …" / "Brand: …" wrappers so only the brand name
  // remains (e.g. "CLEARSPACE").
  function getBrand() {
    const normalise = (raw) => {
      let t = (raw || '').replace(/\s+/g, ' ').trim();
      t = t.replace(/^Visit the\s+/i, '')
           .replace(/\s+Store$/i, '')
           .replace(/^by\s+/i, '')
           .replace(/^Brand:\s*/i, '')
           .replace(/^Marke:\s*/i, '')     // German
           .replace(/^Marca:\s*/i, '')     // Spanish / Italian / Portuguese
           .replace(/^Marque\s*:\s*/i, ''); // French
      return t.trim();
    };

    const selectors = [
      '[data-hook="cr-product-byline"] a',
      '#cr-arp-byline a',
      '.product-by-line a',
      '#cm_cr-product_info a[href*="/stores/"]',
      'a.a-link-normal[href*="/stores/"][href*="/page/"]',
      '#cm_cr-product_info .a-row a.a-link-normal:not([href*="/dp/"]):not([href*="/product-reviews/"])'
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) {
        const t = normalise(el.textContent);
        if (t) return t;
      }
    }
    // Last resort: container-level text that starts with "by X"
    const byline = document.querySelector('.product-by-line, [class*="byline"]');
    if (byline) {
      const t = (byline.textContent || '').replace(/\s+/g, ' ').trim();
      const m = t.match(/^(?:by|Brand:|Marke:|Marca:|Marque\s*:)\s+(.+)$/i);
      if (m) return m[1].trim();
    }
    return '';
  }

  const brand = getBrand();

  // Amazon wraps reviews in <li data-hook="review"> on the /product-reviews/ page
  // and in <div data-hook="review"> elsewhere — use a tag-agnostic selector.
  const reviewNodes = document.querySelectorAll('[data-hook="review"]');
  const results = [];

  reviewNodes.forEach(node => {
    const id = node.id || '';
    if (!id) return; // skip malformed

    const name = clean(
      (node.querySelector('span.a-profile-name') || {}).textContent
    );

    const starEl = node.querySelector(
      'i[data-hook="review-star-rating"], i[data-hook="cmps-review-star-rating"]'
    );
    const stars = getStars(starEl);

    const titleEl = node.querySelector(
      'a[data-hook="review-title"], span[data-hook="review-title"]'
    );
    const title = getTitleText(titleEl);

    const bodyEl = node.querySelector('span[data-hook="review-body"]');
    const body = getBodyText(bodyEl);

    const dateEl = node.querySelector('span[data-hook="review-date"]');
    const { country, date } = parseDateCountry(
      dateEl ? dateEl.textContent : '',
      fallbackCountry
    );

    const helpfulEl = node.querySelector('span[data-hook="helpful-vote-statement"]');
    const helpful = getHelpful(helpfulEl);

    const verifiedEl = node.querySelector('span[data-hook="avp-badge"]');
    const verified = verifiedEl ? 'Yes' : 'No';

    const formatEl = node.querySelector('a[data-hook="format-strip"]');
    const variation = clean(formatEl ? formatEl.textContent : '');

    const hasImage = !!node.querySelector(
      'img[data-hook="review-image-tile"], div[data-hook="review-image-tile-section"], .review-image-tile, a.review-image-tile-container'
    );
    const hasVideo = !!node.querySelector(
      'div[data-hook="review-video"], .video-block, video'
    );
    const media = hasImage && hasVideo
      ? 'Image+Video'
      : hasImage ? 'Image'
      : hasVideo ? 'Video'
      : 'No';

    results.push({
      id, name, date, stars, title, body,
      helpful, verified, variation, country, media,
      brand, asin: asin || ''
    });
  });

  return {
    reviews: results,
    pageUrl: location.href,
    hostname: host,
    brand
  };
}

/* ------------------------------------------------------------------ */
/*  POPUP CONTROLLER                                                  */
/* ------------------------------------------------------------------ */
const $ = (sel) => document.querySelector(sel);
const extractBtn = $('#extract-btn');
const clearBtn = $('#clear-btn');
const copyBtn = $('#copy-btn');
const output = $('#output');
const statusLine = $('#status-line');
const stats = $('#stats');
const toastEl = $('#toast');

let currentAsin = null;
let currentTabId = null;
let currentBrand = '';

// Parse ASIN from any Amazon product-reviews URL
// e.g. /product-reviews/B0BVSRNZSB/... → B0BVSRNZSB
function getAsinFromUrl(url) {
  if (!url) return null;
  const m = url.match(/\/product-reviews\/([A-Z0-9]{10})(?:[\/?#]|$)/);
  return m ? m[1] : null;
}

function isReviewsPage(url) {
  if (!url) return false;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    if (!/(^|\.)amazon\./.test(host)) return false;
    return /\/product-reviews\//.test(u.pathname);
  } catch { return false; }
}

function tsvEscape(value) {
  return String(value == null ? '' : value)
    .replace(/[\t\r\n]+/g, ' ')
    .trim();
}

function reviewsToTSV(reviews, fallbackBrand, fallbackAsin) {
  const header = COLUMNS.join('\t');
  if (!reviews.length) return header + '\n';
  const lines = reviews.map(r => [
    tsvEscape(r.brand || fallbackBrand || ''),
    tsvEscape(r.asin || fallbackAsin || ''),
    tsvEscape(r.name),
    tsvEscape(r.date),
    tsvEscape(r.stars),
    tsvEscape(r.title),
    tsvEscape(r.body),
    tsvEscape(r.helpful),
    tsvEscape(r.verified),
    tsvEscape(r.variation),
    tsvEscape(r.country),
    tsvEscape(r.media)
  ].join('\t'));
  return header + '\n' + lines.join('\n') + '\n';
}

const storageKey = (asin) => `reviews::${asin}`;

async function loadStored(asin) {
  if (!asin) return [];
  const obj = await chrome.storage.local.get(storageKey(asin));
  const data = obj[storageKey(asin)];
  return Array.isArray(data) ? data : [];
}

async function saveStored(asin, reviews) {
  await chrome.storage.local.set({ [storageKey(asin)]: reviews });
}

function mergeDedupe(existing, incoming) {
  const byId = new Map();
  for (const r of existing) if (r.id) byId.set(r.id, r);
  let added = 0;
  for (const r of incoming) {
    if (!r.id) continue;
    if (!byId.has(r.id)) {
      byId.set(r.id, r);
      added++;
    } else {
      // Update in place in case helpful count / body changed
      byId.set(r.id, r);
    }
  }
  return { merged: Array.from(byId.values()), added };
}

function render(reviews) {
  output.value = reviewsToTSV(reviews, currentBrand, currentAsin);
  if (reviews.length === 0) {
    stats.innerHTML = 'No reviews extracted yet.';
  } else {
    const brandPart = currentBrand ? ` · <strong>${currentBrand}</strong>` : '';
    stats.innerHTML = `<strong>${reviews.length}</strong> review${reviews.length === 1 ? '' : 's'} stored${brandPart}`;
  }
}

function showToast(msg, ms = 1600) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toastEl.classList.remove('show'), ms);
}

function setStatus(text, kind) {
  statusLine.textContent = text;
  statusLine.classList.remove('ok', 'warn');
  if (kind) statusLine.classList.add(kind);
}

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    setStatus('No active tab.', 'warn');
    return;
  }
  currentTabId = tab.id;

  if (!isReviewsPage(tab.url)) {
    setStatus('Not on an Amazon reviews page.', 'warn');
    stats.textContent = 'Navigate to a /product-reviews/ page and reopen.';
    return;
  }

  currentAsin = getAsinFromUrl(tab.url);
  if (!currentAsin) {
    setStatus('Could not detect product ASIN.', 'warn');
    return;
  }

  const host = new URL(tab.url).hostname.replace(/^www\./, '');
  setStatus(`Ready — ${host} · ASIN ${currentAsin}`, 'ok');
  extractBtn.disabled = false;

  const stored = await loadStored(currentAsin);
  // Seed brand from the most recent stored record that carries one, so
  // stored TSV renders with Brand populated even before first Extract.
  for (let i = stored.length - 1; i >= 0; i--) {
    if (stored[i] && stored[i].brand) { currentBrand = stored[i].brand; break; }
  }
  render(stored);
}

async function onExtract() {
  if (!currentTabId || !currentAsin) return;
  extractBtn.disabled = true;
  const originalLabel = extractBtn.innerHTML;
  extractBtn.textContent = 'Extracting…';

  try {
    const [injection] = await chrome.scripting.executeScript({
      target: { tabId: currentTabId },
      func: extractReviewsInPage,
      args: [HOSTNAME_COUNTRY, currentAsin]
    });
    const result = injection && injection.result;
    const incoming = (result && result.reviews) || [];
    if (result && result.brand) currentBrand = result.brand;

    const existing = await loadStored(currentAsin);
    const { merged, added } = mergeDedupe(existing, incoming);
    await saveStored(currentAsin, merged);
    render(merged);

    if (incoming.length === 0) {
      showToast('No reviews found on this page.');
    } else {
      showToast(`+${added} new · ${incoming.length - added} already stored`);
    }
  } catch (err) {
    console.error(err);
    showToast('Extraction failed — see console.');
  } finally {
    extractBtn.innerHTML = originalLabel;
    extractBtn.disabled = false;
  }
}

async function onClear() {
  if (!currentAsin) return;
  await chrome.storage.local.remove(storageKey(currentAsin));
  render([]);
  showToast('Cleared');
}

async function onCopy() {
  const text = output.value;
  if (!text) {
    showToast('Nothing to copy.');
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback for older environments
    output.select();
    document.execCommand('copy');
    output.setSelectionRange(0, 0);
  }
  copyBtn.classList.add('copied');
  const iconCopy = copyBtn.querySelector('.icon-copy');
  const iconCheck = copyBtn.querySelector('.icon-check');
  if (iconCopy) iconCopy.style.display = 'none';
  if (iconCheck) iconCheck.style.display = '';
  showToast('Copied to clipboard');
  setTimeout(() => {
    copyBtn.classList.remove('copied');
    if (iconCopy) iconCopy.style.display = '';
    if (iconCheck) iconCheck.style.display = 'none';
  }, 1400);
}

extractBtn.addEventListener('click', onExtract);
clearBtn.addEventListener('click', onClear);
copyBtn.addEventListener('click', onCopy);

init();
