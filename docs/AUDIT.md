# Google Sheets editing audit — 2026-10-19

## Verdict
Not ready for a verified owner handover. The code supports editing, but access to the configured Sheet and the owner's Editor role remain unverified. No production deployment, photo replacement or Sheet mutation was performed.

## Evidence
- Repository baseline: fcc3002 (Connect the editing Google Sheet).
- Production https://vasylian.com/dom-w-gorach/content.js returned HTTP 200 and matched the baseline content.js exactly (SHA256 578ebe556936c22cb5aedc56823b8ba27245be9443d875afcb33a95532c6cf0a).
- Configured ID: `1-SfNo4BE6bJQv_GhL6u7OThA89xyVGPRwGUYIOIWbMc`. Syntactically plausible; identity/ownership cannot be established from the string. Kept unchanged.
- Sheets metadata API: 403 PERMISSION_DENIED. Drive metadata: 404 notFound. These do not establish nonexistence.
- Anonymous request to the exact Teksty gviz CSV endpoint: HTTP 401 and HTML, not CSV. Public CSV access is not working in this check. Actual browser CORS access remains to be verified after permissions are fixed.
- Existing four tabs, their actual headers/rows, sharing permissions and real photo URLs could not be inspected. The schemas below are required by code, not a report of observed Sheet contents.
- No open PRs at inspection. No AGENTS.md or existing graph found in cloned project. Focused direct source inspection used; no graph analysis was needed.

## Required structure

| Tab | Required headers (Polish templates) |
| --- | --- |
| Teksty | klucz, wartosc |
| Pokoje | nazwa, opis, miejsca, zdjecie |
| Cennik | pozycja, cena, uwagi |
| Galeria | zdjecie, podpis, kolejnosc |

English aliases remain accepted. Headers may be within the first three rows. Blank cells retain built-in content where available. The first Cennik data row is the main price. Empty lists restore built-in lists. Gallery ordering is numeric with input order as tie-breaker. Homepage limits are 3 rooms, 5 photos, 3 extra prices.

## Changes in this branch
- Added all four missing CSV templates, derived only from existing HTML. They are legacy demo data and must be approved/corrected before import; no current facts or new photos were invented.
- Added full-header validation so misspelled description/price/photo headers do not silently load partial tables; rejects unclosed CSV quotes.
- Validate contact values before both labels and links are updated, preventing invalid visible contact information paired with old destinations. Text maps have no prototype.
- Preserve Drive resourcekey when converting a file share link to a thumbnail URL; reject Drive folder/document links.
- Add `?dwg_debug=1` status panel and `window.DWG.contentStatus`: fresh data vs cache vs built-in content, fetch/schema errors, invalid photo links, empty lists, failed images and old-image fallback.
- Added Polish owner instructions including actual editing limits, image upload steps, privacy/sharing and verification.

## Photo and failure limitations
No upload widget/backend exists: owner uploads to Drive separately and pastes a public file link into Sheets. Embedded cell images/IMAGE formulas are not supported. Drive thumbnails are not guaranteed image hosting; real files must be tested anonymously on the site, including lightbox.

Existing fallback behavior is retained: failure uses session cache or built-in content. Cache has no TTL within the browser session; network revalidation happens on each page load. Failed replacement photos can display old files. The debug panel now exposes this, but production's embedded fallback photographs still need approved current photos before launch. Empty cells/list deletion are not a general deletion mechanism. Map coordinates, static SEO/OpenGraph and JSON-LD are outside current Sheets editing; changing address text does not update them. The inquiry form uses mailto, not server-side sending.

## Tests
`NODE_PATH=/path/to/jsdom/node_modules node --test tests/content.test.cjs`

7 tests passed using jsdom: all templates on six pages; room/price/text/contact updates and plain-text injection; invalid contact consistency; Drive resource key, folder rejection and gallery ordering; HTTP failure fallback; malformed CSV/header plus cache; photo-fallback diagnostic event. Both JS files pass `node --check`; `git diff --check` passes.

These are DOM/logic tests with mocked CSV responses. Real browser image loading, Google CORS, owner's permissions and end-to-end live Sheet editing are NOT verified. Browser download failed in this environment; no visual browser test is claimed.

## Exact access needed to finish
1. Grant **Viewer** on this exact spreadsheet to the Google account connected to ChatGPT Google Drive for inspection. **Editor** is needed only if we are to repair tabs/cells. The connected account's email was not exposed by the available read results; do not assume it is arthur@vasylian.com.
2. Owner's chosen Google account must be **Editor** (or owner) to change cells. This permission is separate from public reading.
3. For the current client-side gviz implementation, set spreadsheet General access to **Anyone with the link → Viewer**, or choose a different authenticated backend architecture. Do not make editing public. Keep guest/reservation/private data out of this workbook.
4. Each Drive image used must allow **Anyone with the link → Viewer**; a Sheet sharing setting does not make photos public. The owner needs upload rights in their image folder.
5. After access: inspect actual tabs/headers, reconcile rather than overwrite with templates, test temporary edit in a copy/staging environment, test all photos in an anonymous browser, and update built-in fallback using approved current material. Obtain agreement before deploying to the main domain.
