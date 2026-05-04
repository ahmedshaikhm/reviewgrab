# Privacy Policy for ReviewGrab

_Last updated: 4 May 2026_

ReviewGrab is a Chrome extension that extracts product reviews from Amazon review pages into TSV format for the user to paste into a spreadsheet. This policy explains what data the extension handles and why.

## Summary

**ReviewGrab does not collect, transmit, sell, or share any user data.** Everything the extension does runs locally in the user's own browser.

## What data the extension handles

When the user clicks **Extract Page** on an Amazon review page, the extension reads the publicly visible review content already rendered in the user's browser tab. This includes:

- Reviewer display name
- Review date
- Star rating
- Review title and body text
- Helpful vote count
- Verified purchase status
- Product variation (size, color, pack count)
- Country of the reviewer (parsed from the review's "Reviewed in X" line)
- Whether the review includes images or video
- Brand name and ASIN of the product

This is the same content the user can already see with their own eyes on the page. The extension does not access account information, payment details, browsing history, cookies, or any data outside the active review page.

## Where data is stored

Extracted reviews are saved locally on the user's device using Chrome's built-in `chrome.storage.local` API. This storage is:

- **Per-product** — keyed by Amazon Standard Identification Number (ASIN)
- **Local-only** — never transmitted off the device
- **Under user control** — the **Clear** button in the extension popup removes stored reviews for the current product at any time, and uninstalling the extension removes all stored data

## What the extension does NOT do

- Does not collect personally identifiable information
- Does not track browsing activity, page visits, or click behavior
- Does not transmit any data to remote servers, including the developer's
- Does not use analytics, telemetry, or third-party tracking services
- Does not load or execute remote code — all JavaScript is bundled in the extension package
- Does not require an account, signup, login, or email address
- Does not access cookies, authentication tokens, or session data
- Does not communicate with Amazon's servers or APIs in any way; it only reads the page already loaded in the user's tab

## Permissions

The extension requests the minimum permissions needed to function:

- **`activeTab`** — read the rendered review content from the page the user is viewing when they click the extension icon
- **`storage`** — save extracted reviews locally on the device
- **`scripting`** — inject the extraction function into the active review page on user demand
- **Host permissions for Amazon marketplace domains** — allow the extraction script to run on each regional Amazon storefront without an additional prompt

## Children's privacy

ReviewGrab is not directed at children under 13 and does not knowingly collect any data from anyone of any age, including children.

## Changes to this policy

If this privacy policy is updated, the "Last updated" date at the top will be revised. Material changes will also be noted in the extension's release notes.

## Contact

For questions, bug reports, or privacy concerns, please open an issue at:

https://github.com/ahmedshaikhm/reviewgrab/issues
