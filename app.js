/* ══════════════════════════════════════════════════
   DebtSnap — app.js
   Stack: vanilla JS, Claude API (claude-sonnet-4-20250514)
   ══════════════════════════════════════════════════ */

// ─── CONFIG ──────────────────────────────────────────
const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL   = 'claude-sonnet-4-20250514';

// NOTE: In production, proxy API calls through your backend.
// Never expose API keys in client-side code in a real deployment.
// Set your key here for local testing only:
const ANTHROPIC_API_KEY = 'YOUR_API_KEY_HERE';

// ─── DATA ─────────────────────────────────────────────
const DEBT_TYPES = [
  { v: 'credit-card',      l: 'Credit card' },
  { v: 'student-federal',  l: 'Student loan (federal)' },
  { v: 'student-private',  l: 'Student loan (private)' },
  { v: 'medical',          l: 'Medical debt' },
  { v: 'personal',         l: 'Personal loan' },
  { v: 'other',            l: 'Other unsecured' },
];

const STATUS_OPTS = [
  { v: 'current',      l: 'Current' },
  { v: '30',           l: '30 days late' },
  { v: '60',           l: '60 days late' },
  { v: '90',           l: '90+ days late' },
  { v: 'collections',  l: 'In collections' },
  { v: 'charged-off',  l: 'Charged off' },
];

const QUIZ = [
  {
    id: 'q1',
    text: 'Do you know exactly what you owe and to whom — every balance and creditor?',
    opts: ["Yes, I know every account precisely", "Roughly, but not exact numbers", "No, I've been avoiding looking at it"],
  },
  {
    id: 'q2',
    text: 'In the last 90 days, have you responded to any letters or calls from creditors?',
    opts: ["Yes, I've been in contact", "I've seen them, haven't responded", "No, I've been avoiding them"],
  },
  {
    id: 'q3',
    text: 'When you think about your debt, what comes up first?',
    opts: ["The numbers and what I need to do", "Stress, shame, or anxiety", "Frustration or feeling stuck"],
  },
  {
    id: 'q4',
    text: 'Has your income dropped significantly in the last 6 months?',
    opts: ["Yes, significantly", "Somewhat", "No, it's been stable or increased"],
  },
  {
    id: 'q5',
    text: 'What is your primary goal right now?',
    opts: [
      "Lowest possible monthly payment",
      "Pay it off as fast as possible",
      "Stop the collection calls",
      "Understand all my options first",
    ],
  },
];

// PAIR Finance archetype profiles
const ARCHETYPES = {
  WAOR: { name: 'Willing · Able · Organized · Rational',   tone: 'informative',   desc: 'You know what needs doing and have the capacity to do it. Your plan focuses on optimization — the fastest, most cost-efficient path to resolution.' },
  WAOE: { name: 'Willing · Able · Organized · Emotional',  tone: 'cooperative',   desc: 'Solid position with good habits, but stress may be making this feel larger than it is. Your plan delivers clear wins to build momentum fast.' },
  WACE: { name: 'Willing · Able · Chaotic · Emotional',    tone: 'reciprocity',   desc: 'You want to solve this and have the means — staying on track is the challenge. Your plan includes built-in structure and timed check-ins.' },
  WACR: { name: 'Willing · Able · Chaotic · Rational',     tone: 'informative',   desc: 'You respond to data but need organizational scaffolding. Your plan gives you the full picture with clear milestones.' },
  WICR: { name: 'Willing · Insolvent · Chaotic · Rational', tone: 'informative',  desc: 'Motivated and analytical but financially constrained. Your plan focuses on hardship programs, forgiveness eligibility, and breathing room.' },
  WIOR: { name: 'Willing · Insolvent · Organized · Rational', tone: 'informative', desc: 'Organized and motivated but under real financial pressure. Your plan identifies immediate relief and longer-term forgiveness paths.' },
  WIOE: { name: 'Willing · Insolvent · Organized · Emotional', tone: 'cooperative', desc: 'You want resolution and you\'re organized — the financial strain is the main barrier. Your plan surfaces immediate relief options.' },
  WICE: { name: 'Willing · Insolvent · Chaotic · Emotional', tone: 'cooperative', desc: 'You\'re dealing with a lot at once. Your plan starts with the highest-impact relief options and builds from there — one step at a time.' },
  DICR: { name: 'Defiant · Insolvent · Chaotic · Rational', tone: 'cooperative',  desc: 'Your situation is genuinely difficult. Your plan focuses on legal protections, hardship options, and realistic next steps — no pressure.' },
  DICE: { name: 'Defiant · Insolvent · Chaotic · Emotional', tone: 'cooperative', desc: 'You\'re carrying a lot. The first step is understanding your rights and what relief programs exist — no judgment, just a path forward.' },
  DEFAULT: { name: 'Your financial profile', tone: 'cooperative',                  desc: 'Based on your answers, your plan is personalized to your specific situation and goals.' },
};

// ─── STATE ─────────────────────────────────────────────
let debtCounter = 0;
let quizAnswers = {};

// ─── ROUTING ────────────────────────────────────────────
function goTo(stepId, progressPct) {
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  document.getElementById(stepId).classList.add('active');
  window.scrollTo(0, 0);

  const progressWrap = document.getElementById('progress-wrap');
  const fill         = document.getElementById('progress-fill');
  if (progressPct === 0 || progressPct === undefined) {
    progressWrap.style.display = 'none';
  } else {
    progressWrap.style.display = 'block';
    fill.style.width = progressPct + '%';
    // Update step labels
    document.querySelectorAll('.progress-step').forEach((el, i) => {
      const thresholds = [33, 66, 100];
      el.classList.toggle('active', progressPct >= thresholds[i] - 32);
    });
  }
}

function startApp() {
  initDebts();
  goTo('s1', 33);
  document.getElementById('progress-wrap').style.display = 'block';
  document.getElementById('progress-fill').style.width = '33%';
  document.getElementById('ps1').classList.add('active');
}

function resetApp() {
  debtCounter = 0;
  quizAnswers = {};
  document.getElementById('debt-list').innerHTML = '';
  document.getElementById('income').value = '';
  document.getElementById('expenses').value = '';
  document.getElementById('employment').value = '';
  document.getElementById('family').value = '1';
  document.getElementById('total-banner').style.display = 'none';
  goTo('s0', 0);
}

// ─── DEBT MANAGEMENT ────────────────────────────────────
function initDebts() {
  if (document.getElementById('debt-list').children.length === 0) {
    addDebt('credit-card', '8500', '90');
    addDebt('student-federal', '34000', 'current');
  }
}

function addDebt(type = '', balance = '', status = 'current') {
  const id  = 'd' + (++debtCounter);
  const el  = document.createElement('div');
  el.className = 'debt-entry';
  el.id = id;

  const typeOpts   = DEBT_TYPES.map(t => `<option value="${t.v}"${t.v === type ? ' selected' : ''}>${t.l}</option>`).join('');
  const statusOpts = STATUS_OPTS.map(s => `<option value="${s.v}"${s.v === status ? ' selected' : ''}>${s.l}</option>`).join('');

  el.innerHTML = `
    <div class="debt-entry-grid">
      <div>
        <label>Debt type</label>
        <select>${typeOpts}</select>
      </div>
      <div>
        <label>Balance ($)</label>
        <input type="number" placeholder="5,000" min="0" value="${balance}" oninput="calcTotal()">
      </div>
      <div>
        <label>Status</label>
        <select>${statusOpts}</select>
      </div>
      <button class="remove-btn" onclick="removeDebt('${id}')" aria-label="Remove">×</button>
    </div>
  `;

  document.getElementById('debt-list').appendChild(el);
  calcTotal();
}

function removeDebt(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
  calcTotal();
}

function getDebts() {
  return Array.from(document.querySelectorAll('.debt-entry')).map(row => ({
    type:    row.querySelector('select').value,
    balance: parseFloat(row.querySelector('input[type=number]').value) || 0,
    status:  row.querySelectorAll('select')[1].value,
  })).filter(d => d.balance > 0);
}

function calcTotal() {
  const debts = getDebts();
  const total = debts.reduce((s, d) => s + d.balance, 0);
  const banner = document.getElementById('total-banner');
  if (debts.length > 0) {
    banner.style.display = 'flex';
    document.getElementById('total-amount').textContent = fmtCurrency(total);
  } else {
    banner.style.display = 'none';
  }
}

// ─── STEP NAVIGATION ────────────────────────────────────
function next1() {
  const debts = getDebts();
  const err   = document.getElementById('err1');
  if (debts.length === 0) { err.style.display = 'block'; return; }
  err.style.display = 'none';
  renderQuiz();
  goTo('s2', 66);
}

function next2() {
  const answered = Object.keys(quizAnswers).length;
  const err      = document.getElementById('err2');
  if (answered < QUIZ.length) { err.style.display = 'block'; return; }
  err.style.display = 'none';
  generatePlan();
}

// ─── QUIZ ────────────────────────────────────────────────
function renderQuiz() {
  const container = document.getElementById('quiz-container');
  container.innerHTML = QUIZ.map((q, i) => `
    <div class="quiz-block">
      <div class="q-num">Question ${i + 1} of ${QUIZ.length}</div>
      <div class="q-text">${q.text}</div>
      <div class="opts">
        ${q.opts.map((o, j) => `
          <button class="opt${quizAnswers[q.id] === j ? ' sel' : ''}"
                  onclick="pickAnswer('${q.id}', ${j}, this)">
            ${o}
          </button>
        `).join('')}
      </div>
    </div>
  `).join('');
}

function pickAnswer(qid, idx, el) {
  el.closest('.opts').querySelectorAll('.opt').forEach(o => o.classList.remove('sel'));
  el.classList.add('sel');
  quizAnswers[qid] = idx;
}

// ─── ARCHETYPE SCORING ───────────────────────────────────
function scoreArchetype() {
  let W = 0, A = 0, O = 0, R = 0;

  // Willingness: q2 (creditor contact)
  if      (quizAnswers.q2 === 0) W += 2;
  else if (quizAnswers.q2 === 1) W += 0;
  else                           W -= 2;

  // Ability: q4 (income stability)
  if      (quizAnswers.q4 === 0) A -= 2;
  else if (quizAnswers.q4 === 1) A -= 0.5;
  else                           A += 1.5;

  // Organization: q1 (debt knowledge)
  if      (quizAnswers.q1 === 0) O += 2;
  else if (quizAnswers.q1 === 1) O += 0;
  else                           O -= 2;

  // Rationality: q3 (reaction to debt)
  if      (quizAnswers.q3 === 0) R += 2;
  else if (quizAnswers.q3 === 1) R -= 1.5;
  else                           R -= 0.5;

  const code = (W >= 0 ? 'W' : 'D') +
               (A >= 0 ? 'A' : 'I') +
               (O >= 0 ? 'O' : 'C') +
               (R >= 0 ? 'R' : 'E');

  return code;
}

// ─── BUILD CONTEXT ───────────────────────────────────────
function buildContext() {
  const debts      = getDebts();
  const total      = debts.reduce((s, d) => s + d.balance, 0);
  const income     = parseFloat(document.getElementById('income').value)   || 0;
  const expenses   = parseFloat(document.getElementById('expenses').value) || 0;
  const employment = document.getElementById('employment').value;
  const family     = document.getElementById('family').value;
  const archetype  = scoreArchetype();
  const info       = ARCHETYPES[archetype] || ARCHETYPES.DEFAULT;

  return {
    debts,
    total,
    income,
    expenses,
    employment,
    family,
    archetype,
    info,
    disposable:      income - expenses,
    dti:             income > 0 ? Math.round(total / (income * 12) * 100) : null,
    hasFedStudent:   debts.some(d => d.type === 'student-federal'),
    hasPublicNP:     ['public', 'nonprofit'].includes(employment),
    inCollections:   debts.some(d => ['collections', 'charged-off'].includes(d.status)),
    goal:            QUIZ[4].opts[quizAnswers.q5 ?? 0],
  };
}

// ─── GENERATE PLAN ───────────────────────────────────────
async function generatePlan() {
  goTo('s-loading', 90);

  const ctx = buildContext();
  const loadingMessages = [
    ['Analyzing your situation...', 'Calculating your debt-to-income ratio'],
    ['Building your profile...', `Scoring ${ctx.archetype} behavioral archetype`],
    ['Generating your action plan...', 'Matching strategies to your situation'],
  ];

  let msgIdx = 0;
  const interval = setInterval(() => {
    if (msgIdx < loadingMessages.length) {
      document.getElementById('load-msg').textContent  = loadingMessages[msgIdx][0];
      document.getElementById('load-sub').textContent  = loadingMessages[msgIdx][1];
      msgIdx++;
    }
  }, 1300);

  const prompt = buildPrompt(ctx);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    clearInterval(interval);

    let raw = data.content?.find(b => b.type === 'text')?.text || '';
    raw = raw.replace(/```json|```/g, '').trim();
    const plan = JSON.parse(raw);

    renderResults(ctx, plan);
  } catch (err) {
    clearInterval(interval);
    renderFallback(ctx);
  }

  goTo('s3', 100);
}

function buildPrompt(ctx) {
  return `You are a debt relief advisor. Generate a personalized action plan. Return ONLY valid JSON — no markdown, no explanation.

FINANCIAL PROFILE:
- Total debt: ${fmtCurrency(ctx.total)}
- Accounts: ${ctx.debts.map(d => `${d.type} ${fmtCurrency(d.balance)} (${d.status})`).join(' | ')}
- Monthly income: ${fmtCurrency(ctx.income)} | Expenses: ${fmtCurrency(ctx.expenses)} | Disposable: ${fmtCurrency(ctx.disposable)}
- Debt-to-income ratio: ${ctx.dti !== null ? ctx.dti + '%' : 'unknown'}
- Employment: ${ctx.employment} | Family size: ${ctx.family}
- Federal student loans: ${ctx.hasFedStudent}
- Public/nonprofit employer: ${ctx.hasPublicNP}
- Accounts in collections: ${ctx.inCollections}
- Behavioral archetype: ${ctx.archetype} — ${ctx.info.name}
- Communication tone: ${ctx.info.tone}
- Primary goal: ${ctx.goal}

RULES:
1. If federal student loans present AND disposable income < $500: action 1 MUST be IDR eligibility check with specific savings estimate
2. If federal student loans AND public/nonprofit employer: include PSLF in top 2 actions
3. If accounts in collections: include FDCPA debt validation letter in top 3 actions
4. Tone: ${ctx.info.tone === 'cooperative' ? 'warm, supportive, no pressure language' : ctx.info.tone === 'reciprocity' ? 'emphasize mutual benefit and shared goals' : 'direct, data-driven with specific numbers'}
5. Actions 1–3 are unlocked (free). Actions 4–5 are premium — make them clearly valuable but incremental.
6. Be specific: name programs, dollar amounts, timelines. No generic platitudes.
7. Never mention bankruptcy as an action 1–3 option for D-type archetypes.

Return exactly this JSON structure:
{
  "headline": "max 12-word personalized headline based on their biggest opportunity",
  "summary": "2 sentences: acknowledge their situation honestly, then name the single biggest opportunity. Warm, not alarming.",
  "actions": [
    {
      "title": "max 8 words — specific action, not generic",
      "body": "2–3 sentences of specific, actionable guidance tailored to their exact numbers and situation",
      "impact": "specific measurable impact e.g. 'Could reduce payment to $0/month' or 'Saves ~$180/month in interest'",
      "priority": "high | medium | low"
    }
  ]
}`;
}

// ─── RENDER RESULTS ──────────────────────────────────────
function renderResults(ctx, plan) {
  // Headline
  document.getElementById('results-headline').textContent = plan.headline || 'Your personalized action plan';

  // Metrics
  const dtiClass = ctx.dti === null ? '' : ctx.dti > 50 ? 'warning' : ctx.dti > 36 ? '' : 'positive';
  const dispClass = ctx.disposable >= 0 ? 'positive' : 'negative';

  document.getElementById('metrics-row').innerHTML = `
    <div class="metric-cell">
      <div class="metric-val">${fmtCurrency(ctx.total)}</div>
      <div class="metric-lbl">Total debt</div>
    </div>
    <div class="metric-cell">
      <div class="metric-val ${dtiClass}">${ctx.dti !== null ? ctx.dti + '%' : '—'}</div>
      <div class="metric-lbl">Debt-to-income</div>
    </div>
    <div class="metric-cell">
      <div class="metric-val ${dispClass}">${fmtCurrency(Math.abs(ctx.disposable))}</div>
      <div class="metric-lbl">${ctx.disposable >= 0 ? 'Monthly surplus' : 'Monthly shortfall'}</div>
    </div>
  `;

  // Profile card
  document.getElementById('profile-card').innerHTML = `
    <div class="profile-badge">${ctx.archetype}</div>
    <div class="profile-info">
      <div class="profile-eyebrow">Financial profile</div>
      <div class="profile-name">${ctx.info.name}</div>
      <div class="profile-desc">${plan.summary || ctx.info.desc}</div>
    </div>
  `;

  // Action cards
  const container = document.getElementById('actions-list');
  container.innerHTML = '';
  const priorityClass = { high: 'priority-high', medium: 'priority-medium', low: 'priority-low' };
  const priorityLabel = { high: 'High priority', medium: 'Next step', low: 'Also consider' };

  (plan.actions || []).slice(0, 5).forEach((action, i) => {
    const locked = i >= 3;
    const div = document.createElement('div');
    div.className = 'action-card' + (locked ? ' locked' : '');
    const pc = priorityClass[action.priority] || 'priority-medium';
    const pl = priorityLabel[action.priority] || 'Next step';
    div.innerHTML = `
      <div class="action-head">
        <div class="action-num">${i + 1}</div>
        <div>
          <div class="priority-tag ${pc}">${pl}</div>
          <div class="action-title">${action.title}</div>
        </div>
      </div>
      <div class="action-body">${action.body}</div>
      ${action.impact ? `<div class="action-impact">${action.impact}</div>` : ''}
    `;
    container.appendChild(div);
  });
}

// ─── FALLBACK (if API call fails) ────────────────────────
function renderFallback(ctx) {
  const actions = [];

  if (ctx.hasFedStudent && ctx.disposable < 500) {
    actions.push({
      title: 'Check income-driven repayment eligibility now',
      body: `With ${fmtCurrency(ctx.income)}/month take-home and a household of ${ctx.family}, you may qualify for $0/month payments on your federal student loans under IDR. Visit studentaid.gov or call your servicer this week to apply — it takes about 10 minutes.`,
      impact: 'Could reduce payment to $0/month',
      priority: 'high',
    });
  }

  if (ctx.hasFedStudent && ctx.hasPublicNP) {
    actions.push({
      title: 'Screen for Public Service Loan Forgiveness',
      body: 'Working for a public or nonprofit employer makes you potentially eligible for full federal loan forgiveness after 120 qualifying payments. Verify your employer at studentaid.gov/pslf — takes 5 minutes and could save you tens of thousands.',
      impact: 'Full loan forgiveness after 10 years',
      priority: 'high',
    });
  }

  if (ctx.inCollections) {
    actions.push({
      title: 'Send a debt validation letter immediately',
      body: 'Under the FDCPA, any collector must verify a debt before continuing collection. Send a certified validation letter within 30 days of contact — this legally pauses all collection activity and often reveals errors or unenforceable debts.',
      impact: 'Legally halts collection activity',
      priority: 'high',
    });
  }

  while (actions.length < 3) {
    actions.push({
      title: 'Build your complete debt inventory',
      body: 'Pull all three credit reports free at AnnualCreditReport.com and reconcile every account, balance, and status. This single step — taking about 30 minutes — is required before any negotiation or dispute strategy can begin.',
      impact: 'Foundation for all next steps',
      priority: actions.length === 0 ? 'high' : 'medium',
    });
  }

  actions.push({ title: 'Negotiate a hardship plan with your top creditor', body: 'Most major creditors have unpublished hardship programs that can freeze interest and reduce minimum payments for 6–12 months. Call their hardship line directly — this is different from the regular customer service queue.', impact: 'Could reduce payments 30–50%', priority: 'medium' });
  actions.push({ title: 'Dispute any errors on your credit report', body: 'Studies show 30–40% of credit reports contain errors. Each inaccurate item you remove can improve your score and negotiating position with creditors.', impact: 'Improves negotiating leverage', priority: 'low' });

  renderResults(ctx, {
    headline: `Your ${ctx.archetype} profile — action plan ready`,
    summary: ctx.info.desc,
    actions: actions.slice(0, 5),
  });
}

// ─── UTILS ───────────────────────────────────────────────
function fmtCurrency(n) {
  return '$' + Math.round(n).toLocaleString('en-US');
}

// ─── INIT ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  goTo('s0', 0);
});
