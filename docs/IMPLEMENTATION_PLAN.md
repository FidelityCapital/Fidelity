# Fidelity Capital: Squarespace 7.1 Implementation Plan ("Mortgage fund" redesign)

**Source design:** "Fidelity Capital" (the mortgage fund redesign made by Claude), https://claude.ai/artifact/97kUcM5V5RgTH6HYBaAJcS
**Target:** Squarespace 7.1 with Fluid Engine sections
**Repo:** this repository. Git is the source of truth, and changes are deployed to Squarespace by paste (see §8).

> The earlier build of the "Fidelity Capital Website – New Design" canvas is kept in `archive/new-design-oct14/` for reference only.

---

## 1. Design summary

The look is a credit file:

- **Colours:** ink-navy on warm paper, with brass for money figures.
- **Type:** Young Serif for display, Public Sans for body text, IBM Plex Mono for numbers and labels.
- **Layout:** a left-aligned editorial grid on a single page with in-page navigation.

| # | Section | Purpose |
|---|---|---|
| 1 | Header | Wordmark "Fidelity Capital · Est. 2015", in-page nav, phone, "Apply now" |
| 2 | Hero | Headline with brass accent, lede, 2 CTAs, starting-rates strip, illustrative **debt consolidation sheet** |
| 3 | What we fund | 6 situation cards (ATO, MCA, RST, 2ND, CAV, S&RB) |
| 4 | Facilities | 4 rows: name, starting rate, real case study. Fine print below. |
| 5 | Brokers | Navy band: pitch, CTA, 4-point checklist |
| 6 | How it works | 4 steps from enquiry to settlement |
| 7 | Apply | Notes on the left. On the right, a 4-step form with a business-owner/broker switch, LVR hint, reference number, and Zapier + Zoho CRM delivery. |
| 8 | Contact | Phone, email, office |
| 9 | Footer | Copyright, business-purpose disclaimer, privacy link |

## 2. Guardrail compliance

| Guardrail | How it is met |
|---|---|
| **1. Custom CSS only** | All styling lives in `styles/custom.less`, which you paste into the Custom CSS panel. The Code Block snippets in `blocks/` contain no `<style>` tags and no inline `style=""`, and `npm run check` fails the build if either appears. Selectors target 7.1 structures such as `.page-section`, `.section-background`, `.fe-block`, `.sqs-block-*` and `.sqs-html-content`. They also target the 7.1 paragraph classes `p.sqsrte-large` / `p.sqsrte-small`, the button classes `.sqs-button-element--primary` / `--secondary`, `#header` and `.header-menu`. The LESS uses only variables, nesting and literal media queries, and escapes anything with math (`~"clamp(…)"`) so Squarespace's compiler can't mangle it. |
| **2. Mobile cascade** | **Type:** `clamp()` sizes have a mobile floor and apply only inside hooked sections, so Site Styles' own mobile scaling still works everywhere else. **Breakpoint:** `767px`, the point where Fluid Engine switches to its mobile layout. **Components:** use `auto-fit` grids, so they respond to their block's width rather than the viewport. **iOS zoom:** every form control is ≥16px, so iOS Safari never zooms in on focus. **Overflow:** `#siteWrapper { overflow-x: clip }` plus `min-width: 0` and `overflow-wrap: anywhere` stop content wider than the screen from zooming the page out. **Dynamic height:** the form block gets `height: auto` and must be the last block in its section. **Grid:** no fixed widths on Fluid Engine blocks and no `grid-area` overrides. |
| **3. Code Blocks / JS** | `scripts/main.js` is one isolated IIFE that goes in Footer Code Injection. It sets one re-entry guard on `window` and no other globals. It starts components only when their markup exists (`data-fc="apply"`), and it re-runs on `mercury:load`. Its only network calls are the Zapier and Zoho endpoints you configure. **No WebGL, canvas or cross-origin textures.** The hero "deal sheet" is semantic HTML (a real `<table>`). |
| **4. Git workflow** | Structured folders (§3) and `npm run build`, which validates the sources and writes paste-ready files to `dist/`. A GitHub Action runs the same checks on every push and PR and publishes `dist/` as a downloadable artifact. |

## 3. Repository structure

```
.
├── styles/custom.less          # → Custom CSS panel (paste as-is)
├── scripts/main.js             # → Footer Code Injection (build wraps it in <script>)
├── injection/header.html       # → Header Code Injection (3 Google Fonts + theme-color)
├── blocks/                     # → Code Blocks (Display Source OFF)
│   ├── section-hooks.html      #   one hook line per section (CSS targeting + #anchors)
│   ├── rates.html              #   hero starting-rates strip
│   ├── deal-sheet.html         #   hero debt consolidation sheet
│   └── apply-form.html         #   4-step application (Zapier/Zoho settings on the root)
├── build/build.mjs             # validation + dist/ output
├── .github/workflows/check.yml # CI
├── archive/                    # superseded build of the earlier canvas (not deployed)
└── docs/IMPLEMENTATION_PLAN.md # this file
```

## 4. Architecture: what's native and what's code

The rule: everything a marketer might reword is a native block, and CSS gives it the design. Code Blocks are used only for the three pieces the editor can't build.

| Design element | Built with | Content convention the CSS relies on |
|---|---|---|
| Wordmark + "Est. 2015" | Site Title as **text**, no logo image | CSS adds "Est. 2015" with `::after` |
| Nav + phone + CTA | Native header links, a `tel:` nav link, the header button | — |
| Eyebrows (mono, brass, uppercase) | Native text | A paragraph placed directly above an H1/H2 |
| Ledes | Native text | Paragraph style **Paragraph 1** |
| Fine print | Native text | Paragraph style **Paragraph 3** |
| Hero H1 brass words | Native text | Italicise them. CSS renders them upright in brass. |
| Hero buttons | Native Button blocks | Primary = "Start an application", Secondary = "I'm a broker" |
| Hero rates strip | **Code Block** `rates.html` | — |
| Hero deal sheet | **Code Block** `deal-sheet.html` | — |
| Situation cards | 6 native Text blocks | Paragraph code (e.g. `ATO`), then an **H3**, then a paragraph |
| Facility rows | 4 native Text blocks (full width) | An **H3** name, then a paragraph `**12% p.a.**` + line break + "starting from", then a paragraph `**Case**` + line break + story. Use Shift+Enter for the line breaks. |
| Broker checklist | Native bulleted list | Each item: `**Title**` + Shift+Enter + detail |
| Process steps | 4 native Text blocks | Paragraph "Step 1", then an **H3**, then a paragraph |
| Apply side notes | Native text | **Quote** format, which renders with a brass left rule |
| Application form | **Code Block** `apply-form.html` | Must be the last block in the Apply section |
| Contact items | 3 native Text blocks | A label paragraph, then a value paragraph |

### Section hooks
A 7.1 section can't be given a class or ID. Each styled section gets a one-line Code Block from `blocks/section-hooks.html`, for example:

```html
<div class="fc-hook fc-hook--facilities" id="facilities" data-label="facilities" aria-hidden="true"></div>
```

- **Styling:** CSS targets `.page-section:has(.fc-hook--facilities)`.
- **Anchors:** the `id` is the target for nav links (`/#facilities`), with `scroll-margin-top` so the sticky header doesn't cover the heading.
- **Editor:** hooks show a dashed label only in edit mode.
- **Browsers:** `:has()` works in every browser Squarespace supports (Chrome/Edge 105+, Safari 15.4+, Firefox 121+). An older browser falls back to plain Site Styles and nothing breaks.

## 5. Prerequisites and decisions

- [ ] **Squarespace plan with Code Injection.** Needed for the fonts and for the form. Custom CSS works on every plan.
- [ ] **Lead delivery** (§7): a Zapier catch-hook URL, Zoho web-to-lead IDs, or both.
- [ ] **Compliance review** of:
  - the starting rates (12% / 18% / 3% p.m.)
  - the illustrative deal sheet figures
  - the four case studies
  - the "call within one business day" promise
- [ ] **Privacy policy URL.** The form consent links to `/privacy-policy`; the design's footer used `/privacypolicy`. Pick one and update the other. The policy should name Zapier and Zoho as processors.
- [ ] **Dark mode: decision needed.** The source design follows the visitor's OS dark mode. A Squarespace site's colours are set per section in Site Styles, so the build is **light only** and doesn't fight that system. If you want dark mode, it's a later phase.

## 6. Build phases

Build on a duplicate homepage or a trial site, then swap it in.

### Phase 0: Repo and tooling (½ day)
1. Run `npm install && npm run build` and confirm the output says `OK`.
2. Protect `main` and require the **Check Squarespace sources** workflow to pass on PRs.

### Phase 1: Site Styles (½ day)
These settings make native blocks look close to the design before any CSS loads.

1. **Colours.** Add these to the palette:
   - Paper `#F7F6F2`
   - Paper-2 `#EEECE4`
   - White
   - Ink `#121B2E`
   - Ink-2 `#3B4458`
   - Navy `#16264A`
   - Brass `#9A7428`

   Then set the section themes:
   - **Lightest 1** = Paper (most sections)
   - **Lightest 2** = Paper-2 (Apply)
   - **Darkest 1** = Navy (Brokers)
2. **Fonts.**
   - Headings: Young Serif 400.
   - Paragraphs and buttons: Public Sans.
   - Set the mobile heading sizes too.
   - If the Squarespace picker lacks any of the three fonts, keep the `<link>` in `injection/header.html`, which loads all three.
3. **Buttons.** Corner radius 6px, not pill:
   - Primary: navy fill, paper text.
   - Secondary: transparent with a hairline border.
4. **Header.** Site Title as text, not a logo image. Header style: solid or blur, sticky.

### Phase 2: Global code (1 hour)
1. **Custom CSS panel:** paste `styles/custom.less`.
2. **Code Injection › Header:** paste `dist/header-injection.html`.
3. **Code Injection › Footer:** paste `dist/footer-injection.html`.

### Phase 3: Header and footer (½ day)
1. **Nav links:**
   - What we fund `/#situations`
   - Facilities `/#facilities`
   - Brokers `/#brokers`
   - How it works `/#process`
   - Contact `/#contact`
   - `(02) 8215 1620` → `tel:0282151620`
2. **Header button:** "Apply now" → `/#apply`.
3. **Mobile:** below Squarespace's mobile breakpoint the nav collapses into the native menu. The design hides nav and phone below 900px, which matches.
4. **Footer:** one section with the `footer` hook, containing:
   - "© 2026 Fidelity Capital (Australia) Pty Limited. Business-purpose lending only."
   - A Privacy policy link

### Phase 4: Homepage sections (1½–2 days)
For each section:
1. Add its hook.
2. Lay out the **desktop** grid.
3. Switch to **mobile** and stack the blocks in reading order. Fluid Engine keeps a separate mobile layout for every section.

| # | Section (hook) | Desktop layout | Mobile order |
|---|---|---|---|
| 1 | Hero (`hero`) | Left ~7/12: Text (eyebrow, H1, lede), 2 Buttons, Code Block `rates.html`. Right ~5/12: Code Block `deal-sheet.html`. | text, buttons, rates, sheet |
| 2 | What we fund (`situations`) | Head row: Text (eyebrow + H2) on the left, lede on the right. 3×2 grid of card Text blocks. | head, lede, 6 cards |
| 3 | Facilities (`facilities`) | Head row as above. 4 facility Text blocks, each full width, stacked. Fine print (Paragraph 3). | the same, stacked |
| 4 | Brokers (`brokers`) | Left: Text (eyebrow, H2, lede) + Button "Submit a scenario" linking to **`#apply-broker`**. Right: Text with the 4-item checklist. | pitch, button, checklist |
| 5 | How it works (`process`) | Head row. 4 step Text blocks in a row. | 2×2 or stacked |
| 6 | Apply (`apply`) | Left ~5/12: Text (eyebrow, H2 "Start an application", lede, 2 Quote notes). Right ~7/12: Code Block `apply-form.html`, the **last block, nothing below it**. | notes, then form |
| 7 | Contact (`contact`) | Head row. 3 label/value Text blocks. | stacked |

**The broker deep link:** any link ending `#apply-broker` scrolls to the form and pre-selects "I'm a broker". The design's "I'm a broker" hero button should point there too.

**Two simplifications:**
- The design's sticky Apply side column isn't possible in Fluid Engine, so it scrolls normally.
- The situation cards have their own borders instead of shared hairlines, because Fluid Engine's grid gap can't be set to zero per section.

### Phase 5: Lead delivery (½–1 day)
See §7.

### Phase 6: QA (1 day)
See §9.

### Phase 7: Launch
1. Publish.
2. Tag the commit that matches what's live (§8).
3. Submit the sitemap in Search Console.
4. Send one real test application and confirm it arrives in Zoho.

## 7. Lead delivery: Zapier and Zoho CRM

The form builds a single payload containing:

- applicant type
- broker fields
- contact details
- business details
- status flags
- amount, purpose and security
- LVR inputs
- exit strategy
- story
- consent
- a reference number such as `FC-261014-AB12`
- a timestamp
- the source page

It delivers the payload through one or both routes. You configure them on the Code Block's root element (`data-*` attributes in `blocks/apply-form.html`), so changing them doesn't touch the injected script.

| Route | Setup | Attribute(s) |
|---|---|---|
| **Zapier** (recommended) | Create a Zap with the trigger **Webhooks by Zapier → Catch Hook**. Paste its URL. Add the action **Zoho CRM → Create/Update Lead**, plus any email/Slack alerts. | `data-zapier-url` |
| **Zoho direct** | In Zoho CRM go to Setup → Webforms → Leads and generate a form. Copy the `xnQsjsdp` and `xmIwtLD` hidden values. Use `crm.zoho.com.au` for the AU data centre. | `data-zoho-xnqsjsdp`, `data-zoho-xmiwtld`, `data-zoho-action` |

**Behaviour:**
- **Both routes on:** every application lands in Zoho directly and also runs the Zap.
- **Nothing configured:** visitors see a "couldn't send, please call" message, and the console logs a clear error. The form never pretends to succeed.
- **Test page only:** adding `data-debug` makes the confirmation show the exact payload instead. Never leave it on the live page.
- **Spam:** a hidden honeypot field (`website_url`) stops basic bots. Add Zapier filtering or a CAPTCHA if spam appears.
- **Zapier security:** Zapier hooks don't return CORS headers, so the browser can't read the response. A delivered request counts as success. The hook URL is necessarily public in the page source. Treat it as a write-only inbox, and rotate it if it's abused.
- **Privacy:** this is personal and financial information. Confirm Zoho is on the **AU data centre**, check the Zapier data-retention settings, and update the privacy policy.

## 8. Deployment workflow (Git → Squarespace)

Squarespace 7.1 has no Developer Mode or Git sync, so deploys are a controlled paste.

```
feature branch → PR (CI: npm run build) → merge to main → tag vX.Y.Z → paste dist/ into Squarespace
```

| Changed file | Paste into | Paste from |
|---|---|---|
| `styles/custom.less` | Custom CSS panel (replace all) | the file itself, or `dist/custom.css` |
| `scripts/main.js` | Code Injection › Footer (replace all) | `dist/footer-injection.html` |
| `injection/header.html` | Code Injection › Header (replace all) | `dist/header-injection.html` |
| `blocks/*.html` | The matching Code Block | the file itself, keeping the live `data-*` settings in `apply-form.html` |

**Rules:**
- **Never edit code in Squarespace first.** If a hotfix is made there, copy it back into the repo the same day.
- **Keep secrets out of Git.** The real Zapier URL and Zoho IDs are entered in the live Code Block. The repo keeps them blank.
- **Tag every deploy.** Use `git tag vX.Y.Z && git push --tags`. To roll back, paste the files from the previous tag.
- **Optional later:** if the repo is public, `main.js` can be served from jsDelivr pinned to a tag, which would make JS deploys a one-line change. It isn't set up by default.

## 9. QA checklist

**Devices:**
- iPhone Safari at 375 and 430 wide
- Android Chrome at 360
- iPad at 768 and 1024
- Desktop Chrome, Safari, Firefox and Edge at 1280 and 1440

**Layout**
- [ ] No horizontal scroll at 360px on any page.
- [ ] Every section has a mobile Fluid Engine layout, in reading order, with no overlaps.
- [ ] The rates strip stacks below 520px.
- [ ] The deal sheet fits on mobile.
- [ ] Facility rows collapse to one column on mobile and show 3 columns on desktop.
- [ ] The form changes height between steps without overlapping anything.

**Form**
- [ ] Tapping any form field on iOS doesn't zoom the page.
- [ ] Step validation (business-owner path): email and mobile are required.
- [ ] Step validation (broker path): broker name, brokerage, email and mobile are required; client email and phone become optional.
- [ ] The ABN must have at least 9 digits.
- [ ] At least one purpose must be ticked.
- [ ] Consent must be ticked.
- [ ] The money fields format as `400,000`.
- [ ] The LVR hint reads e.g. "70%".
- [ ] A `#apply-broker` link pre-selects broker.
- [ ] A live submission arrives in Zapier and/or Zoho with every field.
- [ ] The reference number on screen matches the CRM.
- [ ] Endpoint unreachable: the error message shows and the button re-enables.

**Accessibility and polish**
- [ ] Keyboard only: every control is reachable, focus is visible, and focus moves to each step's heading.
- [ ] VoiceOver announces the step errors.
- [ ] Nav anchors land below the sticky header.
- [ ] Hook labels appear in the editor but not on the live site.
- [ ] Lighthouse mobile: Accessibility ≥ 95, CLS < 0.1.

**Classes to confirm in the live editor:** `sqsrte-large`, `sqsrte-small`, `sqs-edit-mode-active`, `header-title-text`, and the list-bullet markup inside `ul[data-rte-list]`. If Squarespace renames one, the matching style falls back to native and nothing breaks.

## 10. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Squarespace renames internal classes | Selectors are grouped by component in `custom.less`, so each is easy to find and fix. When one stops matching, the native style shows through. |
| An editor breaks a content convention (e.g. uses H2 instead of H3 in a card) | That block loses the card styling but stays readable. The conventions table in §4 doubles as the editor guide. |
| An editor deletes a hook | The section falls back to Site Styles. The dashed editor label discourages deleting hooks. |
| Rates drift between the hero strip and the Facilities rows | Both places are listed in the compliance checklist. Change them in the same deploy. |
| Lead loss from misconfiguration | No silent success. Run a test submission after every change to `apply-form.html`. Add a Zapier email alert on each lead. |
| No Code Injection on the current plan | The static design still renders from CSS and native blocks. The form shows its phone/email fallback. |

## 11. Effort summary

| Phase | Estimate |
|---|---|
| 0–2 Setup, Site Styles, global code | ~1 day |
| 3 Header/footer | ½ day |
| 4 Homepage sections | 1½–2 days |
| 5 Lead delivery | ½–1 day |
| 6 QA + fixes | 1 day |
| **Total** | **~4½–5½ days** |
