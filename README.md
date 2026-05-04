<div align="center">

<img src="icons/icon128.png" alt="ReviewGrab" width="96" height="96" />

# ReviewGrab

**Export Amazon product reviews to TSV — paste straight into Excel or Google Sheets.**

[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Install-4285F4?logo=googlechrome&logoColor=white)](#)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-success)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

</div>

---

## What it does

ReviewGrab is a Chrome extension that turns any Amazon product reviews page into clean, structured tab-separated values you can paste into a spreadsheet. No more manual copying of reviews one by one — click the toolbar icon, hit **Extract Page**, and your data is ready.

It works across every Amazon marketplace (`.com`, `.co.uk`, `.de`, `.fr`, `.it`, `.es`, `.ca`, `.com.mx`, `.com.br`, `.co.jp`, `.in`, `.com.au`, `.nl`, `.se`, `.ae`, `.sg`, `.com.tr`, `.pl`, and more).

## Why use it

Manually copying reviews into a spreadsheet is painful — text wraps awkwardly, formatting breaks, and metadata gets lost. ReviewGrab solves this by extracting structured TSV data that pastes perfectly into Excel, Google Sheets, Numbers, or any analysis tool.

Useful for:

- Sentiment analysis and customer feedback research
- Competitor product analysis
- Tracking quality issues across review history
- Building review datasets for market research
- Sharing structured reviews with team members

## Captured data

Each review produces a row with these columns:

| # | Column | Example |
|---|---|---|
| 1 | Brand | `CLEARSPACE` |
| 2 | ASIN | `B0BVSRNZSB` |
| 3 | Reviewer | `Grumpy Old Man` |
| 4 | Date | `4 February 2026` |
| 5 | Stars | `2.0` |
| 6 | Title | `Poor quality` |
| 7 | Body | `Of the 6 bags in the pack…` |
| 8 | HelpfulVotes | `2` |
| 9 | VerifiedPurchase | `Yes` |
| 10 | Variation | `Size Name: 6 Pack` |
| 11 | Country | `United Kingdom` |
| 12 | HasMedia | `Image` / `Video` / `Image+Video` / `No` |

Country is parsed from the localized "Reviewed in X on Y" line in 10 languages (English, German, French, Italian, Spanish, Dutch, Portuguese, Turkish, Swedish, Polish), with fallback to the marketplace TLD.

## Multi-page capture

Reviews are stored locally per ASIN. Navigate through review pages, click **Extract Page** on each — new reviews are appended automatically, and duplicates are detected by Amazon's unique review ID and skipped.

```
Page 1 → Extract → 10 stored
Page 2 → Extract → 20 stored (+10 new)
Page 3 → Extract → 29 stored (+9 new, 1 duplicate skipped)
```

Storage is per-product, so reviews from different ASINs stay separate. Switch between products freely without losing your work. The **Clear** button wipes stored reviews for the current product only.

## Install

### From the Chrome Web Store *(recommended)*

[**Install ReviewGrab from the Chrome Web Store**](#) *(link to be added once published)*

### From source *(developer mode)*

1. Download or clone this repo
2. Open Chrome → `chrome://extensions`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** and select the project folder
5. Pin the ReviewGrab icon to your toolbar

## Usage

1. Open any Amazon product reviews page, e.g.
   `https://www.amazon.co.uk/product-reviews/B0BVSRNZSB/`
2. Click the **ReviewGrab** icon in your toolbar
3. Click **Extract Page** — reviews from the current page appear in the textarea as TSV
4. Navigate to page 2 (or change filters), click **Extract Page** again — new reviews append, duplicates skipped
5. Click the copy icon (top-right of the textarea) to send the entire TSV to your clipboard
6. Paste into Excel, Google Sheets, or save as a `.tsv` / `.txt` file

## Privacy

**Everything runs locally in your browser.**

- No servers — extraction and storage happen on your device, nothing is uploaded
- No tracking — zero analytics, zero telemetry, no user identifiers
- No accounts — no signup, no login, no email required
- No remote code — all JavaScript ships inside the extension package

Permissions used:

- `activeTab` — read the review page when you click the toolbar icon
- `storage` — save extracted reviews locally via `chrome.storage.local`
- `scripting` — inject the extractor function into the active review page on demand
- Host permissions for Amazon marketplace domains — so the extractor can run on each regional storefront without an extra prompt

## Tech

- **Manifest V3** Chrome extension
- Vanilla JavaScript, no build step, no bundler, no dependencies
- Single popup UI with `chrome.scripting.executeScript` for in-page extraction
- DOM extraction is locale-aware — handles 10 languages of Amazon's "Reviewed in X on Y" date string

## Project structure

```
reviewgrab/
├── manifest.json       # MV3 manifest, permissions, host patterns
├── popup.html          # Popup UI markup
├── popup.css           # Popup styles
├── popup.js            # Extractor logic + popup controller
├── icons/              # 16 / 48 / 128 px toolbar icons
└── README.md
```

## Support

Found a bug? A marketplace where extraction fails? Want a new column?

[**Open an issue**](../../issues) with:

- The Amazon URL you were on
- A screenshot of the popup (if relevant)
- What you expected vs. what happened

If a particular country's date line isn't being parsed (the Country column shows the hostname fallback instead of the actual country), paste an example string in the issue and it can be added in a one-line regex update.

## Roadmap

- [ ] Optional CSV export alongside TSV
- [ ] Filter rows in the popup before copying
- [ ] Auto-pagination toggle (extract N pages with one click)
- [ ] Export to JSON
- [ ] Per-review permalink column

## License

MIT — see [LICENSE](LICENSE).

## Disclaimer

ReviewGrab is an independent tool not affiliated with, endorsed by, or sponsored by Amazon.com, Inc. or its subsidiaries. "Amazon" is a trademark of Amazon.com, Inc. The extension reads only what is publicly rendered in the user's own browser session, the same content the user sees with their own eyes — no scraping of private data, no automation against Amazon's servers, no API usage.
