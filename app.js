/* ═══════════════════════════════════════════════════
   DebtSnap — app.js  v2
   Survey-informed, fixed $ glitch, profile explainer
   ═══════════════════════════════════════════════════ */

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL   = 'claude-sonnet-4-20250514';
// Replace with your key for local testing.
// In production, proxy via a serverless function (see README).
const ANTHROPIC_API_KEY = 'YOUR_API_KEY_HERE';

// ── DATA ────────────────────────────────────────────
const DEBT_TYPES = [
  { v: 'credit-card',     l: 'Credit card'            },
  { v: 'student-federal', l: 'Student loan (federal)' },
  { v: 'student-private', l: 'Student loan (private)' },
  { v: 'medical',         l: 'Medical debt'           },
  { v: 'personal',        l: 'Personal loan'          },
  { v: 'other',           l: 'Other unsecured'        },
];

const STATUS_OPTS = [
  { v: 'current',      l: 'Current — on time'  },
  { v: '30',           l: '30 days late'        },
  { v: '60',           l: '60 days late'        },
  { v: '90',           l: '90+ days late'       },
  { v: 'collections',  l: 'In collections'      },
  { v: 'charged-off',  l: 'Charged off'         },
];

const QUIZ = [
  {
    id: 'q1',
    text: 'Do you know exactly what you owe and to whom — every balance and creditor?',
    opts: ['Yes — I know every account precisely', 'Roughly, but not the exact numbers', "No — I've been avoiding looking at it"],
  },
  {
    id: 'q2',
    text: 'In the last 90 days, have you responded to any letters or calls from creditors?',
    opts: ["Yes, I've been in contact", "I've seen them but haven't responded", "No — I've been avoiding them"],
  },
  {
    id: 'q3',
    text: 'When you think about your debt, what comes up first?',
    opts: ['The numbers and what I need to do', 'Stress, anxiety, or a sense of shame', 'Frustration or feeling stuck'],
  },
  {
    id: 'q4',
    text: 'Has your income dropped significantly in the last 6 months?',
    opts: ['Yes, significantly', 'Somewhat', "No — it's been stable or increased"],
  },
  {
    id: 'q5',
    text: 'What is your primary goal right now?',
    opts: [
      'Get the lowest possible monthly payment',
      'Pay this off as fast as I can',
      'Stop the collection calls',
      'Understand all my options first',
    ],
  },
];

// PAIR typology — full profiles with trait explanations
const ARCHETYPES = {
  WAOR: {
    name: 'Willing · Able · Organized · Rational',
    short: 'The Strategist',
    tone: 'informative',
    desc: "You know what needs doing and have the capacity to do it. Your plan focuses on optimization — the fastest, most cost-efficient path to resolution with clear milestones.",
    traits: { W:'Willing', A:'Able', O:'Organized', R:'Rational' },
  },
  WAOE: {
    name: 'Willing · Able · Organized · Emotional',
    short: 'The Motivated Worrier',
    tone: 'cooperative',
    desc: "You're in a solid position with good habits, but stress may be making this feel larger than it is. Quick, visible wins will build momentum and calm the anxiety.",
    traits: { W:'Willing', A:'Able', O:'Organized', E:'Emotional' },
  },
  WACE: {
    name: 'Willing · Able · Chaotic · Emotional',
    short: 'The Well-Meaning Juggler',
    tone: 'reciprocity',
    desc: "You want to solve this and have the financial means — staying on track is the challenge. Your plan includes built-in structure, reminders, and a clear sequence.",
    traits: { W:'Willing', A:'Able', C:'Chaotic', E:'Emotional' },
  },
  WACR: {
    name: 'Willing · Able · Chaotic · Rational',
    short: 'The Data-Driven Disorganizer',
    tone: 'informative',
    desc: "You respond well to numbers and logic but need more organizational scaffolding. Your plan provides the full picture with clear checkpoints to keep you on track.",
    traits: { W:'Willing', A:'Able', C:'Chaotic', R:'Rational' },
  },
  WICR: {
    name: 'Willing · Insolvent · Chaotic · Rational',
    short: 'The Determined Rebuilder',
    tone: 'informative',
    desc: "Motivated and analytical but under real financial pressure. Your plan focuses on hardship programs, forgiveness eligibility, and creating breathing room first.",
    traits: { W:'Willing', I:'Insolvent', C:'Chaotic', R:'Rational' },
  },
  WIOR: {
    name: 'Willing · Insolvent · Organized · Rational',
    short: 'The Organized Survivor',
    tone: 'informative',
    desc: "Organized and motivated but financially constrained. Your plan identifies relief programs, forgiveness pathways, and the most impactful steps given your current position.",
    traits: { W:'Willing', I:'Insolvent', O:'Organized', R:'Rational' },
  },
  WIOE: {
    name: 'Willing · Insolvent · Organized · Emotional',
    short: 'The Anxious Organizer',
    tone: 'cooperative',
    desc: "You want resolution and you're organized — the financial strain is the main barrier. Your plan surfaces immediate relief options and gives you a clear, calm sequence.",
    traits: { W:'Willing', I:'Insolvent', O:'Organized', E:'Emotional' },
  },
  WICE: {
    name: 'Willing · Insolvent · Chaotic · Emotional',
    short: 'The Overwhelmed Doer',
    tone: 'cooperative',
    desc: "You're dealing with a lot at once. Your plan starts with the single highest-impact relief step and builds from there — one clear action at a time.",
    traits: { W:'Willing', I:'Insolvent', C:'Chaotic', E:'Emotional' },
  },
  DICR: {
    name: 'Defiant · Insolvent · Chaotic · Rational',
    short: 'The Cornered Realist',
    tone: 'cooperative',
    desc: "Your situation is genuinely difficult and you know it. Your plan focuses on legal protections, hardship options, and realistic steps — no pressure, just options.",
    traits: { D:'Defiant', I:'Insolvent', C:'Chaotic', R:'Rational' },
  },
  DICE: {
    name: 'Defiant · Insolvent · Chaotic · Emotional',
    short: 'The Burned-Out Avoider',
    tone: 'cooperative',
    desc: "You're carrying a lot and it's taken a toll. The first step is simply understanding what rights and relief programs exist for you. No judgment — just a path forward.",
    traits: { D:'Defiant', I:'Insolvent', C:'Chaotic', E:'Emotional' },
  },
  DEFAULT: {
    name: 'Your financial profile',
    short: 'Your profile',
    tone: 'cooperative',
    desc: "Based on your answers, your plan is personalized to your specific situation and goals.",
    traits: {},
  },
};

// Trait dimension definitions for the explainer
const TRAIT_DEFS = {
  W: { dim:'Willingness',    val:'Willing',    desc:'You want to resolve this and are prepared to engage with the process.' },
  D: { dim:'Willingness',    val:'Resistant',  desc:'You may feel skeptical, burned, or disengaged from the process — which shapes the tone of your guidance.' },
  A: { dim:'Financial ability', val:'Able',    desc:'Your income and situation give you some capacity to make payments or take action.' },
  I: { dim:'Financial ability', val:'Constrained', desc:'Financial resources are tight, which means your plan prioritizes relief and forgiveness options first.' },
  O: { dim:'Organization',  val:'Organized',  desc:'You tend to track things, follow through, and stick to plans — your plan builds on that.' },
  C: { dim:'Organization',  val:'Chaotic',    desc:"Keeping track of details is a challenge. Your plan provides clear, sequential steps and built-in reminders." },
  R: { dim:'Reasoning style', val:'Analytical', desc:'You respond well to data, numbers, and logical arguments — your plan leads with the evidence.' },
  E: { dim:'Reasoning style', val:'Emotional', desc:'Your financial decisions are often influenced by how you feel — your plan acknowledges that and leads with empathy.' },
};

// Top 5 dominant archetypes from PAIR research
const TOP5 = ['DICE','WAOE','WACE','WAOR','DICR'];

// ── STATE ────────────────────────────────────────────
let debtCounter = 0;
let quizAnswers  = {};
let currentArchetype = 'DEFAULT';

// ── NAVIGATION ──────────────────────────────────────
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById('page-' + id) || document.getElementById('page-s' + id.replace('s',''));
  if (el) el.classList.add('active');
  else {
    // fallback: try direct
    const fb = document.getElementById(id);
    if (fb) fb.classList.add('active');
  }
  document.getElementById('progress-wrap').style.display = 'none';
  window.scrollTo(0, 0);
}

function showStep(id, pct) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  const pw = document.getElementById('progress-wrap');
  pw.style.display = 'block';
  document.getElementById('progress-fill').style.width = pct + '%';
  ['ps1','ps2','ps3'].forEach((s,i) => {
    document.getElementById(s).classList.toggle('active', pct > i*33);
  });
  window.scrollTo(0, 0);
}

function startApp() {
  initDebts();
  showStep('s1', 33);
}

function resetApp() {
  debtCounter = 0;
  quizAnswers  = {};
  document.getElementById('debt-list').innerHTML = '';
  ['income','expenses'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('employment').value = '';
  document.getElementById('family').value = '1';
  document.getElementById('total-banner').style.display = 'none';
  showPage('home');
}

function toggleMobile() {
  const nav = document.getElementById('mobile-nav');
  nav.classList.toggle('open');
}

// ── DEBT MANAGEMENT ─────────────────────────────────
function initDebts() {
  if (document.getElementById('debt-list').children.length === 0) {
    addDebt('credit-card', '8500', '90');
    addDebt('student-federal', '34000', 'current');
  }
}

function addDebt(type = '', balance = '', status = 'current') {
  const id = 'd' + (++debtCounter);
  const el = document.createElement('div');
  el.className = 'debt-entry'; el.id = id;

  const tOpts = DEBT_TYPES.map(t =>
    `<option value="${t.v}"${t.v===type?' selected':''}>${t.l}</option>`).join('');
  const sOpts = STATUS_OPTS.map(s =>
    `<option value="${s.v}"${s.v===status?' selected':''}>${s.l}</option>`).join('');

  el.innerHTML = `
    <div class="debt-grid">
      <div>
        <label>Debt type</label>
        <select>${tOpts}</select>
      </div>
      <div>
        <label>Balance</label>
        <input type="number" placeholder="5,000" min="0" value="${balance}" oninput="calcTotal()">
      </div>
      <div>
        <label>Status</label>
        <select>${sOpts}</select>
      </div>
      <button class="remove-btn" onclick="removeDebt('${id}')" aria-label="Remove">×</button>
    </div>`;

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
    document.getElementById('total-val').textContent = fmt(total);
  } else {
    banner.style.display = 'none';
  }
}

// ── STEP FLOW ────────────────────────────────────────
function next1() {
  const debts = getDebts();
  const err   = document.getElementById('err1');
  if (!debts.length) { err.style.display = 'block'; return; }
  err.style.display = 'none';
  renderQuiz();
  showStep('s2', 66);
}

function next2() {
  const answered = Object.keys(quizAnswers).length;
  const err = document.getElementById('err2');
  if (answered < QUIZ.length) { err.style.display = 'block'; return; }
  err.style.display = 'none';
  generatePlan();
}

// ── QUIZ ─────────────────────────────────────────────
function renderQuiz() {
  const c = document.getElementById('quiz-container');
  c.innerHTML = QUIZ.map((q, i) => `
    <div class="quiz-block">
      <div class="q-num">Question ${i+1} of ${QUIZ.length}</div>
      <div class="q-text">${q.text}</div>
      <div class="opts">
        ${q.opts.map((o, j) => `
          <button class="opt${quizAnswers[q.id]===j?' sel':''}"
                  onclick="pick('${q.id}',${j},this)">${o}</button>
        `).join('')}
      </div>
    </div>
  `).join('');
}

function pick(qid, idx, el) {
  el.closest('.opts').querySelectorAll('.opt').forEach(o => o.classList.remove('sel'));
  el.classList.add('sel');
  quizAnswers[qid] = idx;
}

// ── ARCHETYPE SCORING ────────────────────────────────
function scoreArchetype() {
  let W=0, A=0, O=0, R=0;
  if (quizAnswers.q2 === 0) W += 2;
  else if (quizAnswers.q2 === 2) W -= 2;
  if (quizAnswers.q4 === 0) A -= 2;
  else if (quizAnswers.q4 === 1) A -= 0.5;
  else A += 1.5;
  if (quizAnswers.q1 === 0) O += 2;
  else if (quizAnswers.q1 === 2) O -= 2;
  if (quizAnswers.q3 === 0) R += 2;
  else if (quizAnswers.q3 === 1) R -= 1.5;
  else R -= 0.5;
  return (W>=0?'W':'D')+(A>=0?'A':'I')+(O>=0?'O':'C')+(R>=0?'R':'E');
}

// ── CONTEXT ──────────────────────────────────────────
function buildCtx() {
  const debts      = getDebts();
  const total      = debts.reduce((s, d) => s + d.balance, 0);
  const income     = parseFloat(document.getElementById('income').value)   || 0;
  const expenses   = parseFloat(document.getElementById('expenses').value) || 0;
  const employment = document.getElementById('employment').value;
  const family     = document.getElementById('family').value;
  const archetype  = scoreArchetype();
  currentArchetype = archetype;
  const info       = ARCHETYPES[archetype] || ARCHETYPES.DEFAULT;
  return {
    debts, total, income, expenses, employment, family, archetype, info,
    disposable:    income - expenses,
    dti:           income > 0 ? Math.round(total / (income * 12) * 100) : null,
    hasFedStudent: debts.some(d => d.type === 'student-federal'),
    hasPublicNP:   ['public','nonprofit'].includes(employment),
    inCollections: debts.some(d => ['collections','charged-off'].includes(d.status)),
    goal:          QUIZ[4].opts[quizAnswers.q5 ?? 0],
  };
}

// ── GENERATE ──────────────────────────────────────────
async function generatePlan() {
  showStep('loading', 90);
  const ctx = buildCtx();

  const msgs = [
    ['Analyzing your situation...', 'Calculating your debt-to-income ratio'],
    ['Building your profile...', `Scoring your ${ctx.archetype} behavioral type`],
    ['Generating your action plan...', 'Matching strategies to your situation'],
  ];
  let mi = 0;
  const iv = setInterval(() => {
    if (mi < msgs.length) {
      document.getElementById('load-msg').textContent = msgs[mi][0];
      document.getElementById('load-sub').textContent = msgs[mi][1];
      mi++;
    }
  }, 1300);

  try {
    const res = await fetch(API_URL, {
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
        messages: [{ role: 'user', content: buildPrompt(ctx) }],
      }),
    });
    const data = await res.json();
    clearInterval(iv);
    let raw = (data.content?.find(b => b.type==='text')?.text || '')
      .replace(/```json|```/g, '').trim();
    const plan = JSON.parse(raw);
    renderResults(ctx, plan);
  } catch (e) {
    clearInterval(iv);
    renderFallback(ctx);
  }
  showStep('s3', 100);
}

function buildPrompt(ctx) {
  return `You are a debt relief advisor. Generate a personalized action plan. Return ONLY valid JSON — no markdown, no preamble.

FINANCIAL PROFILE:
- Total debt: ${fmt(ctx.total)}
- Accounts: ${ctx.debts.map(d => `${d.type} ${fmt(d.balance)} (${d.status})`).join(' | ')}
- Monthly income: ${fmt(ctx.income)} | Expenses: ${fmt(ctx.expenses)} | Disposable: ${fmt(ctx.disposable)}
- Debt-to-income ratio: ${ctx.dti !== null ? ctx.dti+'%' : 'unknown'}
- Employment: ${ctx.employment} | Family size: ${ctx.family}
- Federal student loans: ${ctx.hasFedStudent}
- Public/nonprofit employer: ${ctx.hasPublicNP}
- Accounts in collections: ${ctx.inCollections}
- Behavioral archetype: ${ctx.archetype} — ${ctx.info.name} (${ctx.info.short})
- Communication tone required: ${ctx.info.tone}
- Primary goal: ${ctx.goal}

PRIORITIZATION RULES:
1. If federal student loans AND disposable income < $500/mo: action 1 = IDR eligibility check with specific savings estimate
2. If federal student loans AND public/nonprofit employer: PSLF screening in top 2 actions
3. If accounts in collections: FDCPA debt validation letter in top 3 actions
4. Tone: ${ctx.info.tone==='cooperative'?'warm, supportive, zero pressure':'ctx.info.tone==="reciprocity"?"mutual-benefit framing, we\'re in this together":"direct, data-driven, lead with numbers and specific outcomes'}
5. Actions 1–3 are free. Actions 4–5 are premium — valuable but clearly incremental.
6. Be specific: programs by name, dollar amounts, timelines, creditor categories.
7. Survey insight: users' top fears are cost (48%), data privacy (40%), and scams (38%). Acknowledge trustworthiness subtly in guidance.

Return ONLY this JSON:
{
  "headline": "max 12 words — personalized to their biggest opportunity",
  "summary": "2 sentences: honest assessment of their situation + the single biggest opportunity. Warm, no panic.",
  "actions": [
    {
      "title": "max 8 words — specific, not generic",
      "body": "2–3 sentences of specific, actionable guidance for their exact numbers and situation",
      "impact": "specific measurable impact — dollar amount or time saved",
      "priority": "high | medium | low"
    }
  ]
}`;
}

// ── RENDER RESULTS ────────────────────────────────────
function renderResults(ctx, plan) {
  document.getElementById('results-headline').textContent =
    plan.headline || 'Your personalized action plan';

  // Metrics
  const dtiCls = ctx.dti === null ? '' : ctx.dti > 50 ? 'warn' : '';
  const dspCls = ctx.disposable >= 0 ? 'pos' : 'neg';
  document.getElementById('metrics-row').innerHTML = `
    <div class="m-cell">
      <div class="m-val">${fmt(ctx.total)}</div>
      <div class="m-lbl">Total debt</div>
    </div>
    <div class="m-cell">
      <div class="m-val ${dtiCls}">${ctx.dti !== null ? ctx.dti+'%' : '—'}</div>
      <div class="m-lbl">Debt-to-income</div>
    </div>
    <div class="m-cell">
      <div class="m-val ${dspCls}">${fmt(Math.abs(ctx.disposable))}</div>
      <div class="m-lbl">${ctx.disposable >= 0 ? 'Monthly surplus' : 'Monthly shortfall'}</div>
    </div>`;

  // Profile card
  const info = ctx.info;
  document.getElementById('profile-card').innerHTML = `
    <div class="p-badge">${ctx.archetype}</div>
    <div>
      <div class="p-eyebrow">Your financial profile</div>
      <div class="p-name">${info.short} — ${info.name}</div>
      <div class="p-desc">${plan.summary || info.desc}</div>
    </div>`;

  // Profile explainer
  renderProfileExplainer(ctx.archetype, info);

  // Actions
  const container = document.getElementById('actions-list');
  container.innerHTML = '';
  const priCls = { high:'pri-high', medium:'pri-medium', low:'pri-low' };
  const priLbl = { high:'High priority', medium:'Next step', low:'Also consider' };
  (plan.actions || []).slice(0, 5).forEach((a, i) => {
    const locked = i >= 3;
    const div = document.createElement('div');
    div.className = 'action-card' + (locked ? ' locked' : '');
    const pc = priCls[a.priority] || 'pri-medium';
    const pl = priLbl[a.priority] || 'Next step';
    div.innerHTML = `
      <div class="a-head">
        <div class="a-num">${i+1}</div>
        <div>
          <div class="pri-tag ${pc}">${pl}</div>
          <div class="a-title">${a.title}</div>
        </div>
      </div>
      <div class="a-body">${a.body}</div>
      ${a.impact ? `<div class="a-impact">${a.impact}</div>` : ''}`;
    container.appendChild(div);
  });
}

function renderProfileExplainer(code, info) {
  const el = document.getElementById('profile-explainer');
  // Build trait cards from the archetype's trait letters
  const traitLetters = Object.keys(info.traits);
  const traitCards = traitLetters.map(letter => {
    const t = TRAIT_DEFS[letter];
    if (!t) return '';
    return `<div class="trait-card">
      <div class="trait-dim">${t.dim}</div>
      <div class="trait-val">${t.val}</div>
      <div class="trait-desc">${t.desc}</div>
    </div>`;
  }).join('');

  // Build all-profiles comparison
  const allProfiles = TOP5.map(c => {
    const a = ARCHETYPES[c] || ARCHETYPES.DEFAULT;
    const isYou = c === code;
    return `<div class="ap-row">
      <div class="ap-code">${c}</div>
      <div>
        <div class="ap-name">${a.short}</div>
        <div class="ap-desc">${a.desc.slice(0,90)}...</div>
      </div>
      ${isYou ? '<span class="ap-you">You</span>' : ''}
    </div>`;
  }).join('');

  el.innerHTML = `
    <button class="explainer-toggle" onclick="toggleExplainer(this)">
      What does my profile type mean? ↓
    </button>
    <div class="explainer-body" id="exp-body" style="display:none">
      <div class="explainer-intro">Your profile is built from four traits. Each one shapes how your plan is structured and the tone of guidance you receive.</div>
      <div class="trait-grid">${traitCards}</div>
      <div class="ap-label">The five most common profile types — and where you fit:</div>
      ${allProfiles}
    </div>`;
}

function toggleExplainer(btn) {
  const body = document.getElementById('exp-body');
  const open = body.style.display === 'block';
  body.style.display = open ? 'none' : 'block';
  btn.textContent = open ? 'What does my profile type mean? ↓' : 'Hide profile explanation ↑';
}

// ── FALLBACK ──────────────────────────────────────────
function renderFallback(ctx) {
  const actions = [];
  if (ctx.hasFedStudent && ctx.disposable < 500)
    actions.push({ title:'Check income-driven repayment eligibility', body:`With ${fmt(ctx.income)}/month take-home and a household of ${ctx.family}, you may qualify for $0/month payments on your federal loans under IDR. Visit studentaid.gov or call your servicer — it takes about 10 minutes.`, impact:'Could reduce payment to $0/month', priority:'high' });
  if (ctx.hasFedStudent && ctx.hasPublicNP)
    actions.push({ title:'Screen for Public Service Loan Forgiveness', body:'Working for government or a nonprofit makes you potentially eligible for full federal loan forgiveness after 120 qualifying payments. Verify your employer at studentaid.gov/pslf — takes 5 minutes.', impact:'Full forgiveness after 10 years', priority:'high' });
  if (ctx.inCollections)
    actions.push({ title:'Send a debt validation letter immediately', body:'Under the FDCPA, any collector must verify a debt before continuing collection activity. A certified validation letter legally pauses all contact and often reveals errors.', impact:'Legally halts collection activity', priority:'high' });
  while (actions.length < 3)
    actions.push({ title:'Build your complete debt inventory', body:'Pull all three credit reports free at AnnualCreditReport.com and list every creditor, balance, and status. This takes 30 minutes and is required before any negotiation or dispute strategy can begin.', impact:'Foundation for every next step', priority:'medium' });
  actions.push({ title:'Call your top creditor\'s hardship line', body:'Most major creditors have unpublished hardship programs that can freeze interest and reduce minimum payments for 6–12 months. Call their hardship line — not regular customer service.', impact:'Could cut payments by 30–50%', priority:'medium' });
  actions.push({ title:'Dispute any errors on your credit reports', body:'Studies show 30–40% of credit reports contain errors. Each inaccuracy you remove improves your negotiating position with creditors.', impact:'Improves your negotiating leverage', priority:'low' });

  const info = ARCHETYPES[currentArchetype] || ARCHETYPES.DEFAULT;
  renderResults(ctx, {
    headline: `${info.short} — here's your action plan`,
    summary: info.desc,
    actions: actions.slice(0,5),
  });
}

// ── TRIAL SIGNUP ──────────────────────────────────────
function handleTrialSignup() {
  const email = document.getElementById('trial-email').value.trim();
  const pw    = document.getElementById('trial-pw').value;
  if (!email || !email.includes('@')) {
    alert('Please enter a valid email address.');
    return;
  }
  if (!pw || pw.length < 8) {
    alert('Password must be at least 8 characters.');
    return;
  }
  // In production: send to your backend to create the account
  // For now, show confirmation
  showPage('confirm');
}

// ── FAQ TOGGLE ────────────────────────────────────────
function toggleFaq(el) {
  const answer = el.nextElementSibling;
  const isOpen = answer.classList.contains('open');
  // Close all
  document.querySelectorAll('.faq-a').forEach(a => a.classList.remove('open'));
  document.querySelectorAll('.faq-q').forEach(q => q.classList.remove('open'));
  if (!isOpen) {
    answer.classList.add('open');
    el.classList.add('open');
  }
}

// ── UTILS ─────────────────────────────────────────────
function fmt(n) {
  return '$' + Math.round(n).toLocaleString('en-US');
}

// ── INIT ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  showPage('home');
});
