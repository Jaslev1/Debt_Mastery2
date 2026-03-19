# DebtSnap — Deployment Guide

## Files
```
debtsnap/
├── index.html   — full app markup, 3-step flow
├── style.css    — Twine-inspired design system
├── app.js       — archetype engine + Claude API
└── README.md    — this file
```

## Quick Deploy (Vercel)

1. Push these 3 files to a GitHub repo
2. Import repo at vercel.com/new
3. No build step needed — static deploy
4. Done — Vercel gives you a live URL

## API Key Setup

**For local testing:**
In `app.js` line 11, replace `'YOUR_API_KEY_HERE'` with your Anthropic API key.

**For production (required):**
Never expose API keys client-side. Create a Vercel serverless function:

Create `/api/plan.js`:
```js
export default async function handler(req, res) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(req.body),
  });
  const data = await response.json();
  res.status(200).json(data);
}
```

Then in `app.js`, change `API_URL` to `/api/plan` and remove the
`x-api-key` and `anthropic-dangerous-direct-browser-access` headers.

Add `ANTHROPIC_API_KEY` as an environment variable in Vercel dashboard.

## Design System (Twine-inspired)

| Token         | Value         |
|---------------|---------------|
| Yellow accent | `#FFD84D`     |
| Black         | `#1a1a1a`     |
| Font serif    | DM Serif Display |
| Font sans     | DM Sans       |
| Max width     | 600px         |

Buttons use a neo-brutalist style: yellow fill + black border + 3px shadow on hover.
Typography mixes DM Serif Display for headings with DM Sans for body.
All borders are 1.5px black — clean and confident.

## Architecture

- **3-step flow:** Debts → Profile Quiz → AI Action Plan
- **Archetype engine:** PAIR Finance 4-dimension scoring (Willingness, Ability,
  Organization, Rationality) → 16 possible types → 5 dominant used in routing
- **AI prompt:** Sends full financial context + archetype to Claude →
  returns structured JSON with headline, summary, and 5 actions
- **Fallback:** Rule-based plan renders if API call fails
- **Conversion gate:** Actions 1–3 free, 4–5 blurred behind upgrade CTA

## Customization

- Colors: edit CSS variables in `style.css` `:root` block
- Debt types: edit `DEBT_TYPES` array in `app.js`
- Quiz questions: edit `QUIZ` array in `app.js`
- Archetype profiles: edit `ARCHETYPES` object in `app.js`
- AI prompt: edit `buildPrompt()` function in `app.js`
