# Fidelity Capital: Squarespace 7.1 Implementation Plan

**Source design:** "Fidelity Capital Website – New Design" canvas (Homepage + "Apply Now" flow), https://claude.ai/artifact/7JBwfy5SA2rWnHfJNN3P8S
**Target:** Squarespace 7.1, Fluid Engine sections
**Repo:** this repository. Git is the source of truth. Squarespace gets updates by paste (see §8).

---

## 1. Goals

1. Rebuild the new homepage and the 4-step application on Squarespace 7.1. It should match the design's palette, type, spacing and interactions.
2. Leave every piece of marketing copy editable in the Squarespace editor. Code is used only where the editor can't produce the design.
3. Keep all custom CSS and JS versioned in GitHub. Nothing exists only inside Squarespace.
4. Make the site work on phones, with no horizontal scroll, no iOS input zoom and no overlapping Fluid Engine blocks.

## 2. Guardrail compliance

| Guardrail | How it is met |
|---|---|
| **1. Custom CSS only** | All styling is in `styles/custom.less`, pasted into the Custom CSS panel. Code Block snippets in `blocks/` contain no `<style>` tags and no inline `style=""`. `npm run check` fails the build if either appears. Selectors target 7.1 structures: `.page-section`, `.section-background`, `.fe-block`, `.sqs-block-*`, `.sqs-html-content`, `.sqs-button-element--*`, `.accordion-item`, `#header`, `.header-menu`. |
| **2. Mobile cascade** | Type uses `clamp()` with a mobile floor, scoped only to hooked sections, so Site Styles' own responsive scaling still applies everywhere else. The breakpoint is `767px`, Fluid Engine's own switch. Form controls are ≥16px so iOS Safari doesn't zoom on focus. `#siteWrapper { overflow-x: clip }` and `min-width: 0` / `overflow-wrap: anywhere` stop content wider than the screen from zooming the page out. Components whose height changes get `height: auto` on their `.fe-block` and sit alone in their section. No fixed widths are set on Fluid Engine blocks, and no `grid-area` is overridden. |
| **3. Code Blocks / JS** | One isolated IIFE, `scripts/main.js`, goes into Footer Code Injection. It adds no globals except a re-entry guard, makes no third-party requests (only the form's own endpoint), and starts each component only when its markup is present (`data-fc="…"`). It also re-runs on `mercury:load` for templates that load pages with AJAX. **No WebGL or cross-origin textures.** The hero is plain CSS and HTML. |
| **4. Git workflow** | Organised structure (§3), a `npm run build` that validates and produces paste-ready files in `dist/`, and a GitHub Action that runs the same checks on every push and PR and uploads `dist/` as a downloadable artifact. |

## 3. Repository structure

```
.
├── styles/
│   └── custom.less              # → Custom CSS panel (paste as-is; Squarespace compiles LESS)
├── scripts/
│   └── main.js                  # → Footer Code Injection (wrapped by the build)
├── injection/
│   └── header.html              # → Header Code Injection (fonts + theme-color)
├── blocks/                      # → Code Blocks (Display Source OFF)
│   ├── section-hooks.html       #   one hook line per section (CSS targeting + #anchors)
│   ├── loan-picker.html         #   hero "How much do you need?" card
│   ├── decade-stat.html         #   big "10+" in the dark band
│   └── apply-form.html          #   full 4-step application (/apply page)
├── assets/icons/                # → upload as Image blocks in the "Why" cards (optional)
├── build/build.mjs              # validates + writes dist/
├── .github/workflows/check.yml  # CI: npm run build, upload dist/ artifact
└── docs/IMPLEMENTATION_PLAN.md  # this file
```

`dist/` is git-ignored. Run `npm run build` locally, or download the **squarespace-paste-files** artifact from the latest Actions run.

## 4. Architecture: native vs custom

The rule is to build it natively when the editor can, and add code only when it can't.

| Design element | Built with | Code involved |
|---|---|---|
| Header, logo, nav, phone link, "Apply Now" CTA | Native header (nav links + header button) | CSS §4 |
| Hero eyebrow, H1 with italic accent, lead, buttons | Native Text + Button blocks | CSS §6.1 (pill = paragraph above the H1; `<em>` = sage) |
| Hero loan-amount card | **Code Block** `blocks/loan-picker.html` | CSS §8 + JS `initLoanPicker` |
| Facts strip (4 stats) | Native Text blocks (H3 number + paragraph) | CSS §6.2 |
| "Why" 4 cards | Native Text blocks (H3 + paragraph); optional Image block icon | CSS §6.3 (any text block with an H3 becomes a card) |
| Dark "A decade" band | Native Text block + **Code Block** `decade-stat.html` | CSS §6.4 |
| 3-step process | Native Text blocks (label paragraph, H3, paragraph) | CSS §6.5 |
| Brokers navy panel | Native **Shape block** (rectangle, radius 20) behind native Text + Buttons | CSS §6.6 |
| FAQ | Native **Accordion block** | CSS §6.7 |
| Contact band + address | Native Text + Button blocks | CSS §6.8 |
| Footer | Native footer section | CSS §6.9 |
| Apply page (4 steps + thanks) | **Code Block** `blocks/apply-form.html`, alone in its section | CSS §9 + JS `initApplyForm` + external form endpoint (§7) |

### Section hooks

A 7.1 section can't be given a class. Each styled section gets a one-line Code Block from `blocks/section-hooks.html`, for example:

```html
<div class="fc-hook fc-hook--why" id="why" data-label="why" aria-hidden="true"></div>
```

The CSS then targets `.page-section:has(.fc-hook--why)`. The same element is the anchor for nav links (`/#why`) and carries `scroll-margin-top` so the sticky header doesn't cover the heading. Hooks show a dashed label only in edit mode.

> `:has()` works in all browsers Squarespace supports (Chrome/Edge 105+, Safari 15.4+, Firefox 121+). Older browsers get the plain Site Styles look. Nothing breaks.

## 5. Prerequisites

- [ ] A Squarespace plan that includes **Code Injection** (needed for `main.js` and the header fonts). The Custom CSS panel is available on every plan.
- [ ] Brand assets: logo (SVG or 2× PNG). The canvas uses the existing "Prudent, True Blue Investments" logo.
- [ ] A form backend URL for the application (§7).
- [ ] Final copy for the placeholders in the design:
  - `[X business hours]` on the thank-you panel (`blocks/apply-form.html`)
  - ABN in the footer
  - Fees answer in the FAQ
  - Office hours in the contact block
  - Optional proof point in the "decade" band
- [ ] The Privacy Policy page URL. The form's consent text links to `/privacy-policy`.

## 6. Build phases

Do phases 1–5 on a **duplicate page** or in a trial site if you can, then swap it in.

### Phase 0: Repo and tooling (½ day)
1. `npm install && npm run build` and confirm `OK`.
2. Protect `main` and require the **Check Squarespace sources** workflow on PRs.
3. Tag the first deploy `v1.0.0` (§8).

### Phase 1: Site Styles (½ day)
These settings keep native blocks close to the design before any CSS loads.
1. **Colours.** Add the palette: Ink `#0B2236`, Blue `#094166`, Sage `#528075`, Mint `#A9D0C4`, Mint-tint `#E3EEEA`, Ground `#F4F7F8`, White.
   Set section themes:
   - **Lightest 1** = Ground (hero, why, FAQ)
   - **Lightest 2** = White (facts, process)
   - **Light 1** = Mint-tint (contact)
   - **Darkest 1** = Ink (footer)
   - **Dark 1** = Blue (decade band)
   Text in each theme: Ink on light, `#F4F7F8` on dark.
2. **Fonts.** Headings use Newsreader 500 and paragraphs use Manrope 400. Set mobile sizes in Site Styles. The CSS only overrides sizes inside hooked sections. If both fonts are available in the Squarespace font picker, set them there and delete the font `<link>`s from `injection/header.html`.
3. **Buttons.** Primary is a pill, Blue fill, white text. Secondary is a pill outline in Ink. The CSS enforces the same look.

### Phase 2: Global code (1 hour)
1. Paste `styles/custom.less` into the **Custom CSS** panel and save.
2. Paste `dist/header-injection.html` into **Code Injection › Header**.
3. Paste `dist/footer-injection.html` into **Code Injection › Footer**.

### Phase 3: Header and footer (½ day)
1. **Header.**
   - Logo height 64px on desktop (CSS caps it at 48px on mobile).
   - Nav, in this order:
     - Why Fidelity `/#why`
     - How it works `/#process`
     - Brokers `/#brokers`
     - FAQ `/#faq`
     - Phone `tel:0282151620` (label "(02) 8215 1620")
   - Header button: "Apply Now" → `/apply`.
   - Turn on the sticky/fixed header if you want it. `--fc-header-offset` (96px) keeps anchors clear of it. Adjust it in `:root` if the header height changes.
2. **Footer.**
   - One section with the `footer` hook.
   - Text: company line with ABN, the disclaimer paragraph, links (Apply Now, Privacy Policy, LinkedIn).

### Phase 4: Homepage (1–2 days)
Build top to bottom. In every section, add that section's hook first. Then lay out the **desktop** Fluid Engine grid, and then switch to the **mobile** layout and stack blocks in reading order. Fluid Engine keeps a separate mobile arrangement, and it must be done for every section.

| # | Section (hook) | Blocks |
|---|---|---|
| 1 | Hero (`hero`) | Text: eyebrow paragraph + H1 (italicise "your") + lead paragraph + small note. Buttons: "Apply Now" (primary → `/apply`), "Speak to a lender" (secondary → `tel:`). Code Block: `loan-picker.html` in the right column (mobile: below the buttons). |
| 2 | Facts (`facts`) | 4 Text blocks, each an H3 number plus a paragraph caption. Mobile: 2×2 or stacked. |
| 3 | Why (`why`) | Text: H2 + intro. 4 Text blocks, each with an H3 title and a paragraph, so they style as cards. Optional: an Image block per card using `assets/icons/fc-icon-*.svg` (keep `fc-icon` in the file name so the CSS sizes it). |
| 4 | Decade (`decade`) | Code Block `decade-stat.html` on the left. Text block on the right: H2 + 2 paragraphs. |
| 5 | Process (`process`) | Text: H2. 3 Text blocks, each a paragraph label ("Step 1 · 5 minutes") then an H3 then a paragraph. Button "Apply Now" + caption. |
| 6 | Brokers (`brokers`) | Shape block (rectangle, radius 20) spanning the panel, sent to back. Text: eyebrow paragraph + H2 + paragraph. Buttons: "Submit a scenario" (primary → `/apply`), "Call (02) 8215 1620" (secondary). |
| 7 | FAQ (`faq`) | Text: H2. Accordion block with the 5 Q&As. |
| 8 | Contact (`contact`) | Text: H2 + paragraph. Buttons. Text: address block with company name, street, email and hours. |

### Phase 5: Apply page (½ day)
1. Create the page `/apply` and hide it from navigation.
2. Add one section containing **only** a Code Block, with `blocks/apply-form.html` pasted in and the endpoint already set (§7).
3. Set the section to the Lightest 1 theme and use the smallest top padding.
4. Optional: a simplified header for this page (Page Settings › hide header). If you hide it, keep the "Back to website" link and phone visible.

### Phase 6: Form backend (½–1 day, decision needed)
See §7.

### Phase 7: QA (1 day)
See §9.

### Phase 8: Launch
1. Swap the new homepage in, or publish it.
2. Tag the commit that matches what's live (§8).
3. Submit the sitemap in Search Console.
4. Check that the form delivers end to end.

## 7. Form backend (decision required)

Squarespace doesn't receive custom HTML forms, so the Apply form posts to an external endpoint. It sends `multipart/form-data` with `Accept: application/json`, including the uploaded documents. Set the URL in `<form action="…">` inside the Code Block.

| Option | Effort | File uploads | Notes |
|---|---|---|---|
| **A. Hosted form service** (Formspree, Basin, etc.) | Lowest | Usually paid tiers | Emails each application and stores submissions. Check where the data is stored, because this is personal and financial information under the Australian Privacy Act. |
| **B. Automation webhook** (Zapier, Make) → CRM + email | Low | Varies | Good if applications should go straight into a CRM. |
| **C. Own serverless endpoint** (e.g. Cloudflare Worker) → email + storage | Medium | Full control | Best control over privacy and retention. Needs a developer to maintain it. |
| **D. Fallback: native Squarespace Form Block** | None | Yes (Squarespace form file upload) | Loses the multi-step design and amount pre-fill, but submissions arrive in Squarespace. The CSS already styles native form buttons. |

**Recommendation:** A, on a plan with file uploads and AU/EU data residency, to launch. Move to C if volume or compliance needs grow. Until the endpoint is set, the form shows its "couldn't send" message and logs a clear console error. It never fails silently.

Spam protection: the hidden `_gotcha` honeypot is built in. Add the provider's CAPTCHA or Turnstile if spam appears.

## 8. Deployment workflow (Git → Squarespace)

Squarespace 7.1 has no Developer Mode or Git sync, so deployment is a controlled paste.

```
feature branch → PR (CI: npm run build) → merge to main → tag vX.Y.Z → paste dist/ into Squarespace
```

| Changed file | Paste into | From |
|---|---|---|
| `styles/custom.less` | Custom CSS panel (replace all) | the file itself, or `dist/custom.css` |
| `scripts/main.js` | Code Injection › Footer (replace all) | `dist/footer-injection.html` |
| `injection/header.html` | Code Injection › Header (replace all) | `dist/header-injection.html` |
| `blocks/*.html` | The matching Code Block(s) | the file itself |

Rules:
- **Never edit code inside Squarespace first.** Any hotfix made there gets copied back into the repo the same day.
- Tag each deploy (`git tag v1.1.0 && git push --tags`). To roll back, paste the files from the previous tag.
- Write the deployed tag into the Code Injection comment if you want to see on the live site which version is running.
- *Optional later:* if the repo becomes public, `main.js` can load from jsDelivr pinned to a tag (`cdn.jsdelivr.net/gh/<owner>/<repo>@vX.Y.Z/scripts/main.js`). That would make JS deploys a one-line version bump. It works only if the repo is public, so it is not set up by default.

## 9. QA checklist

**Devices:** iPhone Safari (375 and 430), Android Chrome (360), iPad (768/1024), desktop Chrome, Safari, Firefox and Edge (1280/1440).

- [ ] No horizontal scroll at 360px on any page.
- [ ] No page zoom when tapping any form field on iOS.
- [ ] The Fluid Engine mobile layout is arranged for every section, in reading order with no overlaps.
- [ ] The Apply form changes height between steps without overlapping anything.
- [ ] The loan picker updates the amount, and "Start my application" opens `/apply?amount=…` with the amount pre-filled.
- [ ] Apply step 3 blocks Continue until name, mobile and email are filled, and the error clears as the visitor types.
- [ ] Step 4 needs consent, the review summary matches the entered data, and a test submission arrives with its attachments.
- [ ] Endpoint down: the error message shows with the phone fallback, and the button re-enables.
- [ ] Keyboard only: every control is reachable, focus is visible, and focus moves to each step heading.
- [ ] Screen reader (VoiceOver): progress announces the current step, and errors are announced.
- [ ] Nav anchors (`/#why`, etc.) land below the sticky header.
- [ ] Hook labels show in the editor but not on the live site.
- [ ] Lighthouse mobile: Accessibility ≥ 95, CLS < 0.1.
- [ ] Every `[placeholder]` is replaced. Search the live pages for `[`.

## 10. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Squarespace renames internal classes (`.accordion-item__title`, `.header-*`) | All such selectors are grouped by component in `custom.less`. Re-check after Squarespace announces changes. If a selector stops matching, the native style shows through and nothing breaks. |
| An editor deletes a hook Code Block | The section falls back to Site Styles. Hooks show a dashed label in the editor to discourage this. |
| Fluid Engine row heights clip dynamic components | Keep the apply form alone in its section. The CSS sets `height: auto` on component blocks. |
| Personal data sent to a third party | Choose the provider and region on purpose (§7). Update the Privacy Policy to name it. |
| Code Injection unavailable on the current plan | CSS and native blocks still render the full static design. Only the slider and stepped form need JS, and the form degrades to one long form. |

## 11. Effort summary

| Phase | Estimate |
|---|---|
| 0–2 Setup, Site Styles, global code | ~1 day |
| 3 Header/footer | ½ day |
| 4 Homepage | 1–2 days |
| 5–6 Apply page + backend | 1–1½ days |
| 7 QA + fixes | 1 day |
| **Total** | **~4½–6 days** |
