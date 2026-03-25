# DebtSnap

A B2C debt relief platform that generates a personalized action plan based on a user's debt profile and behavioral assessment.

## Stack

- **Frontend:** Vanilla HTML, CSS, JavaScript — no framework, no build step
- **PDF generation:** jsPDF + html2canvas (loaded from CDN on demand)
- **AI enhancement:** Anthropic Claude API (`claude-sonnet-4-20250514`) for enriching action steps 4–5
- **PDF serverless:** Vercel serverless function (`/api/pdf.js`) using Puppeteer + `@sparticuz/chromium`
- **Deployment:** Vercel static (zero config)

## Structure

```
debtsnap/
├── index.html          # Single-page app — all pages/views
├── style.css           # Full design system and component styles
├── app.js              # All application logic
├── api/
│   └── pdf.js          # Vercel serverless PDF endpoint (Puppeteer)
├── package.json        # Dependencies for serverless function
├── vercel.json         # Vercel routing config
└── .gitignore
```

## Local development

No build step required. Serve with any static server:

```bash
npx serve .
```

Or open `index.html` directly in a browser (PDF download uses the browser print fallback when the `/api/pdf` endpoint is unavailable).

## Vercel deployment

1. Push to GitHub
2. Import repo in Vercel — it auto-detects the static files and the `/api` serverless function
3. Set environment variable: `ANTHROPIC_API_KEY` (used by the AI plan enhancement, optional — the rule-based engine runs without it)
4. Deploy

## API key

The Claude API key in `app.js` is set to `YOUR_API_KEY_HERE` as a placeholder. For production:

- Add a Vercel serverless proxy (`/api/plan.js`) that holds the key server-side
- Replace the direct `fetch` call in `app.js` with a call to `/api/plan`

## Pricing

- Free snapshot: 3 priority action steps
- Full report: **$49 once-off**
- Ongoing support: **$69/month** (cancel anytime)

## Behavioral profiles (PAIR framework)

Based on peer-reviewed research from ~400,000 real debt cases. Four dimensions scored: Willingness (W/D), Ability (A/I), Organization (O/C), Rationality (R/E).

| Code | Name | Traits |
|------|------|--------|
| WAOR | The Focused Planner | Engaged · Capable · Organized · Analytical |
| WAOE | The Ready Worrier | Engaged · Capable · Organized · Feeling-led |
| WACR | The Analytical Juggler | Engaged · Capable · Scattered · Analytical |
| WACE | The Well-Intentioned Juggler | Engaged · Capable · Scattered · Feeling-led |
| WIOR | The Organized Rebuilder | Engaged · Constrained · Organized · Analytical |
| WIOE | The Anxious Organizer | Engaged · Constrained · Organized · Feeling-led |
| WICR | The Determined Rebuilder | Engaged · Constrained · Scattered · Analytical |
| WICE | The Overwhelmed Doer | Engaged · Constrained · Scattered · Feeling-led |
| DICR | The Cautious Realist | Guarded · Constrained · Scattered · Analytical |
| DICE | The Exhausted Avoider | Guarded · Constrained · Scattered · Feeling-led |

## Legal

Not legal advice. Educational and informational purposes only. See in-app disclaimer.
