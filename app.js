/* ═══════════════════════════════════════════════════
   DebtSnap — app.js  v4
   Non-judgmental profiles · Real action engine
   Full report page · PDF download · Double password
   ═══════════════════════════════════════════════════ */

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL   = 'claude-sonnet-4-20250514';
// Replace with your key for local testing only.
// In production, proxy via a serverless function — see README.
const ANTHROPIC_API_KEY = 'YOUR_API_KEY_HERE';

// ── DEBT TYPES ──────────────────────────────────────
const DEBT_TYPES = [
  { v: 'credit-card',     l: 'Credit card'            },
  { v: 'student-federal', l: 'Student loan (federal)' },
  { v: 'student-private', l: 'Student loan (private)' },
  { v: 'medical',         l: 'Medical debt'           },
  { v: 'personal',        l: 'Personal loan'          },
  { v: 'other',           l: 'Other unsecured'        },
];

const STATUS_OPTS = [
  { v: 'current',     l: 'Current — on time'          },
  { v: '30',          l: '30 days late'                },
  { v: '60',          l: '60 days late'                },
  { v: '90',          l: '90+ days late'               },
  { v: 'collections', l: 'In collections'              },
  { v: 'charged-off', l: 'Charged off'                 },
  { v: 'no-contact',  l: 'No letters or calls received'},
];

// ── QUIZ ────────────────────────────────────────────
const QUIZ = [
  {
    id: 'q1',
    text: 'Do you know exactly what you owe and to whom — every balance and creditor?',
    opts: ['Yes — I know every account precisely', 'Roughly, but not the exact numbers', "No — I've been avoiding looking at it"],
  },
  {
    id: 'q2',
    text: 'In the last 90 days, have you had contact from creditors — letters, calls, or notices?',
    opts: [
      "Yes — I've responded and been in contact",
      "Yes — received them but haven't responded yet",
      "No — I've been avoiding them",
      "No — I haven't received any contact",
    ],
  },
  {
    id: 'q3',
    text: 'When you think about your debt, what comes up first?',
    opts: ['The numbers and what I need to do', 'Stress, anxiety, or feeling overwhelmed', 'Frustration or feeling stuck'],
  },
  {
    id: 'q4',
    text: 'Has your income dropped significantly in the last 6 months?',
    opts: ['Yes, significantly', 'Somewhat', "No — it's been stable or has increased"],
  },
  {
    id: 'q5',
    text: 'Have you previously tried to negotiate, settle, or get help with any of this debt?',
    opts: [
      'Yes — I contacted creditors directly and it went nowhere',
      'Yes — I tried a debt relief company and it did not work out',
      'I looked into it but did not follow through',
      'No — I have not tried anything yet',
    ],
  },
  {
    id: 'q6',
    text: 'What is your primary goal right now?',
    opts: [
      'Get the lowest possible monthly payment',
      'Pay this off as fast as I can',
      'Stop the collection calls',
      'Understand all my options first',
    ],
  },
];

// ── ARCHETYPES — Non-judgmental names ───────────────
// Original PAIR codes kept for research accuracy.
// Display names are plain-English and neutral.
const ARCHETYPES = {
  WAOR: {
    name:  'The Focused Planner',
    code:  'WAOR',
    tone:  'informative',
    desc:  "You have a clear sense of your situation and the capacity to act on it. Your plan focuses on efficiency — the fastest, most cost-effective path through, with specific milestones you can track.",
    traits: { W:'Engaged', A:'Capable', O:'Organized', R:'Analytical' },
    guide: "You respond well to data and clear options. Your plan leads with numbers, timelines, and specific programs.",
  },
  WAOE: {
    name:  'The Ready Worrier',
    code:  'WAOE',
    tone:  'cooperative',
    desc:  "You're in a reasonably solid position — organized and able — but stress may be making this feel larger than it is. Visible, early wins will build confidence and momentum.",
    traits: { W:'Engaged', A:'Capable', O:'Organized', E:'Feeling-led' },
    guide: "You respond well to reassurance and structured steps. Your plan starts with the most achievable wins first.",
  },
  WACE: {
    name:  'The Well-Intentioned Juggler',
    code:  'WACE',
    tone:  'reciprocity',
    desc:  "You want to resolve this and have the financial capacity — keeping organized and on track is the main challenge. Your plan includes a clear sequence and built-in reminders.",
    traits: { W:'Engaged', A:'Capable', C:'Scattered', E:'Feeling-led' },
    guide: "You respond well to structured sequences and accountability prompts. Your plan is step-by-step with clear checkpoints.",
  },
  WACR: {
    name:  'The Analytical Juggler',
    code:  'WACR',
    tone:  'informative',
    desc:  "You respond well to data and logic but benefit from organizational scaffolding. Your plan provides the full picture with clear milestones to keep things on track.",
    traits: { W:'Engaged', A:'Capable', C:'Scattered', R:'Analytical' },
    guide: "You respond well to data. Your plan leads with specifics and includes checkpoints.",
  },
  WICR: {
    name:  'The Determined Rebuilder',
    code:  'WICR',
    tone:  'informative',
    desc:  "You're motivated and analytical but under real financial pressure right now. Your plan focuses on relief programs, forgiveness eligibility, and creating breathing room before anything else.",
    traits: { W:'Engaged', I:'Constrained', C:'Scattered', R:'Analytical' },
    guide: "Your plan prioritizes immediate financial relief, then builds a path forward.",
  },
  WIOR: {
    name:  'The Organized Rebuilder',
    code:  'WIOR',
    tone:  'informative',
    desc:  "You're organized and want to move forward, but your financial options are currently limited. Your plan identifies the most impactful relief and forgiveness pathways available to you.",
    traits: { W:'Engaged', I:'Constrained', O:'Organized', R:'Analytical' },
    guide: "Your plan focuses on relief eligibility and the highest-impact low-cost steps.",
  },
  WIOE: {
    name:  'The Anxious Organizer',
    code:  'WIOE',
    tone:  'cooperative',
    desc:  "You're organized and want resolution — the financial constraint is the main barrier. Your plan surfaces immediate relief options and gives you a clear, calm path to follow.",
    traits: { W:'Engaged', I:'Constrained', O:'Organized', E:'Feeling-led' },
    guide: "Your plan leads with reassurance and immediate relief steps.",
  },
  WICE: {
    name:  'The Overwhelmed Doer',
    code:  'WICE',
    tone:  'cooperative',
    desc:  "You want to make progress and you mean to — you're just dealing with a lot at once. Your plan starts with the single highest-impact action and builds one clear step at a time.",
    traits: { W:'Engaged', I:'Constrained', C:'Scattered', E:'Feeling-led' },
    guide: "Your plan starts with just one thing. Then the next. No overwhelm.",
  },
  DICR: {
    name:  'The Cautious Realist',
    code:  'DICR',
    tone:  'cooperative',
    desc:  "You're skeptical about solutions — possibly because you've been let down before — and your finances are under real pressure. Your plan focuses on legal protections and no-pressure options. No one is going to push you.",
    traits: { D:'Guarded', I:'Constrained', C:'Scattered', R:'Analytical' },
    guide: "Your plan respects your skepticism. Every step is optional, no pressure.",
  },
  DICE: {
    name:  'The Exhausted Avoider',
    code:  'DICE',
    tone:  'cooperative',
    desc:  "Debt has taken a toll — emotionally and financially. The most important thing right now is just understanding what options exist. No judgment, no pressure. There is a path forward.",
    traits: { D:'Guarded', I:'Constrained', C:'Scattered', E:'Feeling-led' },
    guide: "Your plan starts with what you have a right to know. Nothing more is required.",
  },
  DEFAULT: {
    name:  'Your financial profile',
    code:  'YOUR',
    tone:  'cooperative',
    desc:  "Based on your answers, your plan is personalized to your specific situation and goals.",
    traits: {},
    guide: "",
  },
};

// Top 5 from PAIR research (display in explainer)
const TOP5 = ['WAOE','WACE','WAOR','DICR','DICE'];

// Trait labels for the explainer
const TRAIT_DEFS = {
  W: { dim: 'Engagement',    val: 'Engaged',      desc: 'You want to resolve this and are prepared to work through the steps.' },
  D: { dim: 'Engagement',    val: 'Guarded',       desc: 'You may be skeptical or exhausted — which shapes how your guidance is framed. No pressure approach.' },
  A: { dim: 'Financial room', val: 'Capable',      desc: 'You have some financial capacity to make payments or take action.' },
  I: { dim: 'Financial room', val: 'Constrained',  desc: 'Financial resources are tight — your plan prioritizes relief and forgiveness pathways first.' },
  O: { dim: 'Organization',  val: 'Organized',     desc: 'You tend to track things and follow through — your plan builds on that.' },
  C: { dim: 'Organization',  val: 'Scattered',     desc: 'Keeping track of details is a challenge. Your plan is step-by-step with no juggling required.' },
  R: { dim: 'Thinking style', val: 'Analytical',   desc: 'You respond well to data and logical reasoning — your plan leads with numbers and specifics.' },
  E: { dim: 'Thinking style', val: 'Feeling-led',  desc: 'Your financial choices are often shaped by how you feel — your plan acknowledges that and leads with clarity and calm.' },
};

// ── STATE ────────────────────────────────────────────
let debtCounter   = 0;
let quizAnswers   = {};
let currentCtx    = null;
let currentPlan   = null;

// ── NAVIGATION ──────────────────────────────────────
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  // 'home' maps to page-home, 's1' maps to page-s1, etc.
  const pageId = 'page-' + id;
  const el = document.getElementById(pageId);
  if (el) {
    el.classList.add('active');
  } else {
    // fallback: try page-sN format
    const el2 = document.getElementById('page-s' + id.replace(/^s/,''));
    if (el2) el2.classList.add('active');
  }
  document.getElementById('progress-wrap').style.display = 'none';
  window.scrollTo(0, 0);
}

// Navigate to report — ensures report is built before showing
function goToReport() {
  if (!currentCtx || !currentPlan) {
    alert('Your plan data is not available. Please complete the questionnaire first.');
    showPage('home');
    return;
  }
  buildReportPage();
  showPage('report');
}

function showStep(id, pct) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  const pw = document.getElementById('progress-wrap');
  pw.style.display = 'block';
  document.getElementById('progress-fill').style.width = pct + '%';
  ['ps1','ps2','ps3'].forEach((s,i) => {
    document.getElementById(s).classList.toggle('active', pct > i * 33);
  });
  window.scrollTo(0, 0);
}

function startApp() {
  initDebts();
  showStep('s1', 33);
}

function resetApp() {
  debtCounter = 0;
  quizAnswers = {};
  currentCtx  = null;
  currentPlan = null;
  document.getElementById('debt-list').innerHTML = '';
  ['income','expenses'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('employment').value = '';
  document.getElementById('family').value = '1';
  document.getElementById('total-banner').style.display = 'none';
  showPage('home');
}

function toggleMobile() {
  document.getElementById('mobile-nav').classList.toggle('open');
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
  el.innerHTML = `<div class="debt-grid">
    <div><label>Debt type</label><select>${tOpts}</select></div>
    <div><label>Balance ($)</label><input type="number" class="d-balance" placeholder="5,000" min="0" value="${balance}" oninput="calcTotal()"></div>
    <div><label>Status</label><select class="d-status">${sOpts}</select></div>
    <button class="remove-btn" onclick="removeDebt('${id}')" aria-label="Remove">×</button>
  </div>
  <div class="debt-grid-2">
    <div>
      <label>Approximate interest rate</label>
      <select class="d-rate-band">
        <option value="">Not sure / don't know</option>
        <option value="5">Under 10% (e.g. personal loan, low-rate card)</option>
        <option value="12">10–15% (e.g. credit union, balance transfer)</option>
        <option value="17">15–20% (e.g. average credit card)</option>
        <option value="22">20–25% (e.g. store card, high-rate card)</option>
        <option value="28">Over 25% (e.g. subprime, payday-adjacent)</option>
        <option value="0">0% (e.g. intro rate, medical payment plan)</option>
      </select>
    </div>
    <div><label>Min. monthly payment ($)</label><input type="number" class="d-minpay" placeholder="150" min="0"></div>
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
  return Array.from(document.querySelectorAll('.debt-entry')).map(row => {
    const rateBand = row.querySelector('.d-rate-band')?.value;
    const rateVal  = rateBand ? parseFloat(rateBand) : null;
    const bandLabel = row.querySelector('.d-rate-band')?.selectedOptions[0]?.text || '';
    return {
      type:      row.querySelector('select').value,
      balance:   parseFloat(row.querySelector('.d-balance')?.value) || 0,
      status:    row.querySelector('.d-status')?.value || 'current',
      rate:      rateVal,
      rateBand:  bandLabel.split(' (')[0] || '',
      minPay:    parseFloat(row.querySelector('.d-minpay')?.value) || null,
      label:     DEBT_TYPES.find(t => t.v === row.querySelector('select').value)?.l || 'Debt',
    };
  }).filter(d => d.balance > 0);
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
    </div>`).join('');
}

function pick(qid, idx, el) {
  el.closest('.opts').querySelectorAll('.opt').forEach(o => o.classList.remove('sel'));
  el.classList.add('sel');
  quizAnswers[qid] = idx;
}

// ── ARCHETYPE SCORING ────────────────────────────────
function scoreArchetype() {
  let W=0, A=0, O=0, R=0;
  if      (quizAnswers.q2 === 0) W += 2;
  else if (quizAnswers.q2 === 2) W -= 2;
  if      (quizAnswers.q4 === 0) A -= 2;
  else if (quizAnswers.q4 === 1) A -= 0.5;
  else                           A += 1.5;
  if      (quizAnswers.q1 === 0) O += 2;
  else if (quizAnswers.q1 === 2) O -= 2;
  if      (quizAnswers.q3 === 0) R += 2;
  else if (quizAnswers.q3 === 1) R -= 1.5;
  else                           R -= 0.5;
  return (W>=0?'W':'D') + (A>=0?'A':'I') + (O>=0?'O':'C') + (R>=0?'R':'E');
}

// ── BUILD CONTEXT ────────────────────────────────────
function buildCtx() {
  const debts      = getDebts();
  const total      = debts.reduce((s, d) => s + d.balance, 0);
  const income     = parseFloat(document.getElementById('income').value)   || 0;
  const expenses   = parseFloat(document.getElementById('expenses').value) || 0;
  const employment = document.getElementById('employment').value;
  const family     = document.getElementById('family').value;
  const archetype  = scoreArchetype();
  const info       = ARCHETYPES[archetype] || ARCHETYPES.DEFAULT;
  return {
    debts, total, income, expenses, employment, family, archetype, info,
    disposable:    income - expenses,
    dti:           income > 0 ? Math.round(total / (income * 12) * 100) : null,
    hasFedStudent: debts.some(d => d.type === 'student-federal'),
    hasPublicNP:   ['public','nonprofit'].includes(employment),
    inCollections: debts.some(d => ['collections','charged-off'].includes(d.status)),
    goal:          QUIZ[5].opts[quizAnswers.q6 ?? 0],
    priorNegotiation: QUIZ[4].opts[quizAnswers.q5 ?? 3],
    hasTriedBefore: (quizAnswers.q5 ?? 3) < 3,
    generatedAt:   new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' }),
  };
}

// ── RULE-BASED PLAN ENGINE ────────────────────────────
// Generates real, specific steps from actual user data.
// No API call required — always delivers genuine value.
function buildRulePlan(ctx) {
  const actions = [];
  const totalFmt   = fmt(ctx.total);
  const incomeFmt  = fmt(ctx.income);
  const dispFmt    = fmt(Math.abs(ctx.disposable));
  const familySize = parseInt(ctx.family) || 1;
  const triedBefore = ctx.hasTriedBefore;
  const triedCompany = ctx.priorNegotiation && ctx.priorNegotiation.includes('debt relief company');

  // RULE 1 — Collections / charged-off: FDCPA validation is always first
  const collAccounts = ctx.debts.filter(d => ['collections','charged-off'].includes(d.status));
  if (collAccounts.length > 0) {
    const collTotal = fmt(collAccounts.reduce((s,d) => s+d.balance, 0));
    const collTypes = [...new Set(collAccounts.map(d => d.label))].join(' and ');
    actions.push({
      title: 'Send a debt validation letter — do this first',
      body:  `You have ${collAccounts.length > 1 ? collAccounts.length + ' accounts' : 'an account'} (${collTypes}, totaling ${collTotal}) in collections or charged off. Under the Fair Debt Collection Practices Act (FDCPA), every collector must verify a debt in writing before continuing collection activity. A certified validation letter legally requires them to stop all calls and letters until they comply — and errors are common. This step costs nothing and buys you time.`,
      impact: `Legally pauses all collection activity on ${collTotal} of debt`,
      priority: 'high',
      urgent: true,
    });
  }

  // RULE 2 — Federal student loans
  if (ctx.hasFedStudent) {
    const fedLoans = ctx.debts.filter(d => d.type === 'student-federal');
    const fedTotal = fmt(fedLoans.reduce((s,d) => s+d.balance, 0));
    // Federal poverty guideline 150% threshold (IBR/PAYE/SAVE), 2024
    const povertyBases = [0,14580,19720,24860,30000,35140,40280,45420,50560];
    const povertyBase  = povertyBases[Math.min(familySize, 8)] || 14580;
    const idrThreshold = povertyBase * 1.5;
    const annualIncome = ctx.income * 12;
    const idrPayment   = Math.max(0, Math.round(Math.max(0, annualIncome - idrThreshold) * 0.1 / 12));

    if (ctx.hasPublicNP) {
      actions.push({
        title: 'Apply for Public Service Loan Forgiveness today',
        body:  `You have ${fedTotal} in federal student loans and work for a ${ctx.employment === 'public' ? 'government' : 'nonprofit'} employer. This makes you a strong candidate for Public Service Loan Forgiveness (PSLF) — full forgiveness of your remaining federal loan balance after 120 qualifying monthly payments. File the employer certification form at studentaid.gov/pslf immediately. Any qualifying payments you've made since 2007 may already count.`,
        impact: `Full forgiveness of ${fedTotal} after 120 qualifying payments`,
        priority: 'high',
        urgent: false,
      });
    } else if (annualIncome < idrThreshold * 1.2 || ctx.disposable < 500) {
      actions.push({
        title: 'Apply for income-driven repayment on your student loans',
        body:  `You have ${fedTotal} in federal student loans. Based on your income of ${incomeFmt}/month and a household of ${ctx.family}, you likely qualify for income-driven repayment — which would cap your monthly payment at approximately ${idrPayment === 0 ? '$0' : fmt(idrPayment) + '/month'} instead of the standard amount. Apply at studentaid.gov or call your servicer. The application takes about 10 minutes and relief is usually applied within 60 days.`,
        impact: idrPayment === 0 ? 'Could reduce your payment to $0/month' : `Could reduce your payment to approximately ${fmt(idrPayment)}/month`,
        priority: 'high',
        urgent: false,
      });
    } else {
      actions.push({
        title: 'Review all repayment plans for your student loans',
        body:  `You have ${fedTotal} in federal student loans. Log into studentaid.gov to compare all your available repayment options side by side — standard, graduated, extended, and income-driven plans. Your income of ${incomeFmt}/month means you have real options here. If your situation changes at any point, you can switch plans without penalty.`,
        impact: `Multiple repayment options available on ${fedTotal}`,
        priority: 'medium',
        urgent: false,
      });
    }
  }

  // RULE 3 — Medical debt
  const medDebts = ctx.debts.filter(d => d.type === 'medical');
  if (medDebts.length > 0 && actions.length < 3) {
    const medTotal = fmt(medDebts.reduce((s,d) => s+d.balance, 0));
    actions.push({
      title: 'Request an itemized bill and financial assistance application',
      body:  `You have ${medTotal} in medical debt. Two steps to take this week: First, call the billing department and request a line-by-line itemized bill — studies show 30–40% of medical bills contain errors. Second, ask specifically for a "financial assistance application" or "charity care form." Nonprofit hospitals (designated 501(c)(3)) are legally required to offer this, and it can eliminate or significantly reduce your balance based on income.`,
      impact: `Potential reduction or elimination of ${medTotal} in medical debt`,
      priority: 'high',
      urgent: false,
    });
  }

  // RULE 4 — Past-due credit cards with some capacity
  const ccDebts = ctx.debts.filter(d => d.type === 'credit-card');
  const lateCC  = ccDebts.filter(d => ['30','60','90'].includes(d.status));
  if (lateCC.length > 0 && actions.length < 3) {
    const lateFmt = fmt(lateCC.reduce((s,d) => s+d.balance, 0));
    actions.push({
      title: 'Call your card issuer\'s hardship line — not customer service',
      body:  `You have ${lateFmt} in credit card debt that is past due. Major issuers — Chase, Bank of America, Citi, Capital One, Discover, Wells Fargo — have hardship programs that can freeze interest, waive late fees, and reduce minimum payments for 6–12 months. These programs are real but rarely advertised. When you call, ask specifically for the "hardship program" or "financial assistance team." Get any agreement confirmed in writing before making a payment.`,
      impact: `Could freeze interest and reduce payments on ${lateFmt}`,
      priority: 'high',
      urgent: false,
    });
  } else if (ccDebts.length > 0 && ctx.disposable > 200 && actions.length < 3) {
    const ccTotal = fmt(ccDebts.reduce((s,d) => s+d.balance, 0));
    const annualInterest = fmt(Math.round(ccDebts.reduce((s,d)=>s+d.balance,0) * 0.20 / 12));
    actions.push({
      title: 'Set up an avalanche payoff plan for your credit cards',
      body:  `You have ${ccTotal} across ${ccDebts.length} credit card${ccDebts.length>1?'s':''}. With ${dispFmt}/month available after essential expenses, you can make real progress. List your cards by interest rate — highest first — and put every extra dollar toward the highest-rate card while making minimum payments on the rest. This eliminates the most expensive debt first and minimizes total interest paid over time.`,
      impact: `Could save approximately ${annualInterest}/month in interest charges`,
      priority: 'medium',
      urgent: false,
    });
  }

  // RULE 5 — High DTI with no other actions yet
  if (actions.length < 2 && ctx.dti !== null && ctx.dti > 36) {
    actions.push({
      title: 'Pull your free credit reports — all three bureaus',
      body:  `Your debt-to-income ratio of ${ctx.dti}% is above what lenders consider healthy. Before any other step, get the complete picture: pull all three credit reports free at AnnualCreditReport.com. This gives you every creditor, balance, and status — including accounts you may have forgotten — and is the foundation for every negotiation or dispute that follows. About 30–40% of credit reports contain errors that may be hurting your position.`,
      impact: 'Foundation step — required before any negotiation strategy',
      priority: 'medium',
      urgent: false,
    });
  }

  // Fill to 3 minimum
  const fillers = [
    {
      title: 'Pull your free credit reports and check for errors',
      body:  `Pull all three reports at AnnualCreditReport.com — it's free once a year from each bureau. With ${totalFmt} in total debt, each inaccurate account you get removed can improve your negotiating position and potentially lower your interest rates going forward.`,
      impact: 'Could improve your negotiating position immediately',
      priority: 'medium',
      urgent: false,
    },
    {
      title: 'Contact your largest creditor about a payment arrangement',
      body:  `Most creditors prefer a payment arrangement over default — it costs them less than collections. Call your largest creditor, explain your situation clearly (income of ${incomeFmt}/month), and ask what they can offer. Specific ask: deferment, reduced interest rate, or a lower minimum payment for 3–6 months.`,
      impact: 'Stops default risk on your largest account',
      priority: 'medium',
      urgent: false,
    },
  ];
  // If tried before and failed — specific credibility/strategy action
  if (triedBefore && actions.length < 3) {
    if (triedCompany) {
      actions.push({
        title: 'Understand what went wrong — and what to do differently',
        body: `Previous debt relief companies often collect fees upfront without resolving accounts, or enroll people in settlement programs that damage credit before delivering any benefit. Your situation now is different: you have specific legal rights, a personalized plan, and the tools to negotiate directly. The approach in this report is fundamentally different from what you experienced.`,
        impact: 'Direct negotiation typically achieves 40–60% reductions on charged-off accounts',
        priority: 'medium',
        urgent: false,
      });
    } else {
      actions.push({
        title: 'Build your negotiation position before calling again',
        body: `You have already tried to negotiate directly — which means you know how creditors respond. The difference this time: you have a documented profile, a sequenced plan, and knowledge of your specific legal rights. The validation letter and hardship call scripts in your report are designed to open doors that a general inquiry does not.`,
        impact: 'Informed negotiation achieves measurably better outcomes',
        priority: 'medium',
        urgent: false,
      });
    }
  }

  let fi = 0;
  while (actions.length < 3 && fi < fillers.length) actions.push(fillers[fi++]);

  // Actions 4–5: premium placeholders (replaced by API if available)
  actions.push({
    title: 'Negotiate a settlement on your highest-priority accounts',
    body:  'Collectors who purchase charged-off debt typically pay 1–7 cents on the dollar — giving you significant room to negotiate a lump-sum settlement well below face value.',
    impact: 'Potential 40–60% reduction on settled balances',
    priority: 'medium',
    urgent: false,
  });
  actions.push({
    title: 'Build your complete dispute and letter toolkit',
    body:  'A complete set of creditor-ready letters — validation requests, dispute letters, hardship requests, settlement offers — customized to your accounts and your state.',
    impact: 'Legal protection and negotiating leverage on all accounts',
    priority: 'low',
    urgent: false,
  });

  const info = ARCHETYPES[ctx.archetype] || ARCHETYPES.DEFAULT;
  return {
    headline:   buildHeadline(ctx),
    summary:    info.desc,
    actions:    actions.slice(0, 5),
  };
}

function buildHeadline(ctx) {
  if (ctx.inCollections && ctx.hasFedStudent) return 'Stop the collectors and reduce your student loan payment';
  if (ctx.inCollections)                      return 'Your legal rights can stop those collection calls';
  if (ctx.hasFedStudent && ctx.hasPublicNP)   return 'You may qualify for full student loan forgiveness';
  if (ctx.hasFedStudent && ctx.disposable < 500) return 'You may qualify for a $0 student loan payment';
  if (ctx.dti > 50)                           return 'A high debt load — here is where to start';
  if (ctx.disposable < 0)                     return 'Monthly shortfall — here is how to find breathing room';
  return 'Your personalized debt action plan';
}

// ── GENERATE PLAN ────────────────────────────────────
async function generatePlan() {
  showStep('loading', 90);
  const ctx = buildCtx();
  currentCtx = ctx;

  const msgs = [
    ['Reviewing your accounts...', 'Calculating your debt-to-income ratio'],
    ['Building your profile...', `Matching your ${ctx.info.name} type`],
    ['Preparing your plan...', 'Prioritizing steps for your situation'],
  ];
  let mi = 0;
  const iv = setInterval(() => {
    if (mi < msgs.length) {
      document.getElementById('load-msg').textContent = msgs[mi][0];
      document.getElementById('load-sub').textContent = msgs[mi][1];
      mi++;
    }
  }, 1100);

  // Always build rule-based plan first
  const plan = buildRulePlan(ctx);
  currentPlan = plan;

  // Try API for enhanced actions 4-5
  try {
    if (ANTHROPIC_API_KEY !== 'YOUR_API_KEY_HERE') {
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
          max_tokens: 700,
          messages: [{ role: 'user', content: buildEnhancePrompt(ctx) }],
        }),
      });
      const data = await res.json();
      const raw = (data.content?.find(b=>b.type==='text')?.text||'').replace(/```json|```/g,'').trim();
      const enhanced = JSON.parse(raw);
      if (enhanced.actions?.length >= 2) {
        plan.actions = plan.actions.slice(0,3).concat(enhanced.actions.slice(0,2));
      }
      if (enhanced.summary) plan.summary = enhanced.summary;
      currentPlan = plan;
    }
  } catch(e) { /* use rule-based plan */ }

  clearInterval(iv);
  renderResults(ctx, plan);
  showStep('s3', 100);
}

function buildEnhancePrompt(ctx) {
  return `Debt relief advisor. Generate ONLY actions 4 and 5 (premium steps behind paywall). Be specific to this situation.

Profile: ${ctx.archetype} — ${ctx.info.name} | Tone: ${ctx.info.tone}
Total: ${fmt(ctx.total)} | Disposable: ${fmt(ctx.disposable)}/mo | Goal: ${ctx.goal}
Accounts: ${ctx.debts.map(d=>`${d.type} ${fmt(d.balance)} (${d.status})`).join(', ')}

Return ONLY: {"summary":"2 personalized sentences — warm, specific","actions":[{"title":"max 8 words","body":"2-3 sentences specific guidance","impact":"dollar or time outcome","priority":"medium"}]}`;
}

// ── RENDER RESULTS ────────────────────────────────────
function renderResults(ctx, plan) {
  document.getElementById('results-headline').textContent = plan.headline || 'Your personalized action plan';

  const dtiCls = ctx.dti === null ? '' : ctx.dti > 50 ? 'warn' : ctx.dti > 36 ? '' : 'pos';
  const dspCls = ctx.disposable >= 0 ? 'pos' : 'neg';
  document.getElementById('metrics-row').innerHTML = `
    <div class="m-cell"><div class="m-val">${fmt(ctx.total)}</div><div class="m-lbl">Total debt</div></div>
    <div class="m-cell"><div class="m-val ${dtiCls}">${ctx.dti!==null?ctx.dti+'%':'—'}</div><div class="m-lbl">Debt-to-income</div>${ctx.dti!==null?'<div class="m-note">Advisable: under 36%</div>':''}</div>
    <div class="m-cell"><div class="m-val ${dspCls}">${fmt(Math.abs(ctx.disposable))}</div><div class="m-lbl">${ctx.disposable>=0?'Monthly surplus':'Monthly shortfall'}</div></div>`;

  const profileEl = document.getElementById('profile-card'); profileEl.innerHTML = `
    <div class="p-badge-device">
      <div class="p-badge-code">${ctx.archetype}</div>
      <div class="p-badge-label">Your financial profile</div>
    </div>
    <div>
      <div class="p-name">${ctx.info.name}</div>
      <div class="p-desc">${plan.summary || ctx.info.desc}</div>
    </div>`;

  renderProfileExplainer(ctx);

  const container = document.getElementById('actions-list');
  container.innerHTML = '';
  const priCls = { high:'pri-high', medium:'pri-medium', low:'pri-low' };
  const priLbl = { high:'High priority', medium:'Next step', low:'Also consider' };

  (plan.actions||[]).slice(0,5).forEach((a,i) => {
    const locked = i >= 3;
    const div = document.createElement('div');
    div.className = 'action-card' + (locked?' locked':'') + (a.urgent&&!locked?' urgent':'');
    const pc = a.urgent ? 'pri-urgent' : (priCls[a.priority]||'pri-medium');
    const pl = a.urgent ? 'Act now' : (priLbl[a.priority]||'Next step');
    div.innerHTML = `
      <div class="a-head">
        <div class="a-num">${i+1}</div>
        <div>
          <div class="pri-tag ${pc}">${pl}</div>
          <div class="a-title">${a.title}</div>
        </div>
      </div>
      <div class="a-body">${a.body}</div>
      ${a.impact?`<div class="a-impact">${a.impact}</div>`:''}`;
    container.appendChild(div);
  });
}

function renderProfileExplainer(ctx) {
  const info   = ctx.info;
  const traits = info.traits || {};
  const traitCards = Object.keys(traits).map(letter => {
    const t = TRAIT_DEFS[letter];
    if (!t) return '';
    return `<div class="trait-card">
      <div class="trait-dim">${t.dim}</div>
      <div class="trait-val">${t.val}</div>
      <div class="trait-desc">${t.desc}</div>
    </div>`;
  }).join('');

  const allProfiles = TOP5.map(c => {
    const a   = ARCHETYPES[c] || ARCHETYPES.DEFAULT;
    const you = c === ctx.archetype;
    return `<div class="ap-row">
      <div class="ap-code">${a.name}</div>
      <div><div class="ap-desc">${a.desc.substring(0,85)}…</div></div>
      ${you?'<span class="ap-you">You</span>':''}
    </div>`;
  }).join('');

  document.getElementById('profile-explainer').innerHTML = `
    <button class="explainer-toggle" onclick="toggleExplainer(this)">
      What does my profile mean? ↓
    </button>
    <div class="explainer-body" id="exp-body" style="display:none">
      <div class="explainer-intro">Your profile is built from four traits, each shaping how your plan is structured.</div>
      <div class="trait-grid">${traitCards}</div>
      <div class="ap-label">How the five most common profiles compare:</div>
      ${allProfiles}
    </div>`;
}

function toggleExplainer(btn) {
  const body = document.getElementById('exp-body');
  const open = body.style.display === 'block';
  body.style.display = open ? 'none' : 'block';
  btn.textContent    = open ? 'What does my profile mean? ↓' : 'Hide profile explanation ↑';
}


// ── PLAN CARD SELECTION ───────────────────────────
function selectPlan(el) {
  document.querySelectorAll('.plan-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
}

// ── TRIAL / SIGNUP ─────────────────────────────────
function handleTrialSignup() {
  const email = (document.getElementById('trial-email').value || '').trim();
  const pw    = document.getElementById('trial-pw').value;
  const pw2   = document.getElementById('trial-pw2').value;

  let valid = true;

  // Email
  if (!email || !email.includes('@') || !email.includes('.')) {
    document.getElementById('trial-email').classList.add('error');
    valid = false;
  } else {
    document.getElementById('trial-email').classList.remove('error');
  }

  // Password length
  if (!pw || pw.length < 8) {
    document.getElementById('trial-pw').classList.add('error');
    document.getElementById('pw-err').classList.add('show');
    valid = false;
  } else {
    document.getElementById('trial-pw').classList.remove('error');
    document.getElementById('pw-err').classList.remove('show');
  }

  // Password match
  if (pw !== pw2) {
    document.getElementById('trial-pw2').classList.add('error');
    document.getElementById('pw2-err').classList.add('show');
    valid = false;
  } else {
    document.getElementById('trial-pw2').classList.remove('error');
    document.getElementById('pw2-err').classList.remove('show');
  }

  if (!valid) return;

  // Store email for confirmation display
  document.getElementById('confirm-email-display').textContent = email;
  document.getElementById('report-date').textContent = currentCtx?.generatedAt || new Date().toLocaleDateString();

  // In production: POST to your backend to create account + trigger confirmation email
  // Stub: simulate email send, show confirmation, build report
  showPage('confirm');
}

// ── REPORT PAGE ─────────────────────────────────────
function buildReportPage() {
  if (!currentCtx || !currentPlan) return;
  const ctx  = currentCtx;
  const plan = currentPlan;
  const info = ctx.info;

  document.getElementById('report-date').textContent = ctx.generatedAt;

  // ── Pre-compute analytics ─────────────────────────────────────
  const totalDebt    = ctx.total;
  const income       = ctx.income;
  const expenses     = ctx.expenses;
  const disposable   = ctx.disposable;
  const dti          = ctx.dti;

  // Annual interest cost across accounts with known rates
  const knownRateDebts  = ctx.debts.filter(d => d.rate);
  const annualInterest  = knownRateDebts.reduce((s, d) => s + d.balance * (d.rate / 100), 0);
  const monthlyInterest = annualInterest / 12;

  // Total min payments
  const knownMinDebts   = ctx.debts.filter(d => d.minPay);
  const totalMinPay     = knownMinDebts.reduce((s, d) => s + d.minPay, 0);

  // Avalanche payoff estimate (rough): with $X above minimums to highest rate
  const extraMonthly    = Math.max(0, disposable - totalMinPay);

  // Highest interest account
  const highestRate     = ctx.debts.reduce((best, d) => (!best || (d.rate && d.rate > best.rate)) ? d : best, null);

  // Years to pay off at minimum only (rough: min pay barely covers interest for high-rate debt)
  // Default rates by debt type when user selects "not sure"
  const DEFAULT_RATES = {
    'credit-card': 20, 'student-federal': 6, 'student-private': 9,
    'medical': 0, 'personal': 14, 'other': 18
  };

  function payoffMonths(balance, rate, monthly, debtType) {
    if (!monthly || monthly <= 0) return null;
    // Use default rate for type if not specified
    const effectiveRate = rate || DEFAULT_RATES[debtType] || 18;
    const r = effectiveRate / 100 / 12;
    if (r <= 0) return Math.ceil(balance / monthly); // 0% interest
    if (monthly <= balance * r) return null; // payment too low, never pays off
    return Math.ceil(-Math.log(1 - (balance * r / monthly)) / Math.log(1 + r));
  }

  const statusMap   = { current:'Current', '30':'30 days late', '60':'60 days late', '90':'90+ days late', collections:'In collections', 'charged-off':'Charged off' };
  const statusClass = { current:'status-current', '30':'status-late', '60':'status-late', '90':'status-late', collections:'status-collections', 'charged-off':'status-collections' };

  // DTI context
  const dtiRating = !dti ? '' : dti <= 20 ? 'Healthy' : dti <= 36 ? 'Manageable' : dti <= 50 ? 'Elevated' : 'Critical';
  const dtiColor  = !dti ? '' : dti <= 36 ? 'pos' : dti <= 50 ? 'warn' : 'neg';

  // ── SECTION 1: Debt picture ───────────────────────────────────
  document.getElementById('report-metrics').innerHTML = `
    <div class="report-metric">
      <div class="rv">${fmt(totalDebt)}</div>
      <div class="rl">Total unsecured debt</div>
    </div>
    <div class="report-metric">
      <div class="rv ${dtiColor}">${dti !== null ? dti + '%' : '—'}</div>
      <div class="rl">Debt-to-income${dtiRating ? ' · ' + dtiRating : ''}</div>
      ${dti !== null ? '<div class="rm-note">Advisable: under 36%</div>' : ''}
    </div>
    <div class="report-metric">
      <div class="rv ${disposable >= 0 ? 'pos' : 'neg'}">${fmt(Math.abs(disposable))}</div>
      <div class="rl">${disposable >= 0 ? 'Monthly surplus' : 'Monthly shortfall'}</div>
    </div>
    ${annualInterest > 0 ? `<div class="report-metric">
      <div class="rv neg">${fmt(Math.round(annualInterest))}</div>
      <div class="rl">Est. annual interest cost</div>
    </div>` : ''}`;

  // Debt table with payoff column
  document.getElementById('report-debt-rows').innerHTML =
    ctx.debts.map(d => {
      const mos    = d.minPay ? payoffMonths(d.balance, d.rate, d.minPay, d.type) : null;
      const mosStr = mos === null ? '—' : mos > 360 ? '30+ yrs' : mos > 24 ? Math.ceil(mos/12) + ' yrs' : mos + ' mos';
      return `<tr>
        <td>${d.label}</td>
        <td style="font-weight:600">${fmt(d.balance)}</td>
        <td>${d.rate ? d.rate + '%' : '—'}</td>
        <td>${d.minPay ? fmt(d.minPay) + '/mo' : '—'}</td>
        <td><span class="status-badge ${statusClass[d.status]||'status-late'}">${statusMap[d.status]||d.status}</span></td>
        <td style="color:${mos > 48 || mos === null ? 'var(--red)' : 'var(--stone)'}">${mosStr}</td>
      </tr>`;
    }).join('') +
    `<tr class="report-total-row">
      <td><strong>Total</strong></td>
      <td><strong>${fmt(totalDebt)}</strong></td>
      <td>${annualInterest > 0 ? fmt(Math.round(annualInterest)) + '/yr' : '—'}</td>
      <td>${totalMinPay > 0 ? fmt(totalMinPay) + '/mo' : '—'}</td>
      <td colspan="2"></td>
    </tr>`;

  // Context callouts
  const contextBoxes = [];

  if (dti !== null) {
    const dtiMsg = dti <= 20
      ? `Your debt-to-income ratio of ${dti}% is healthy. Lenders consider anything under 36% manageable. You have room to address this strategically rather than urgently.`
      : dti <= 36
      ? `Your DTI of ${dti}% is within the range lenders consider acceptable, but you are carrying meaningful debt. A structured plan now prevents this from becoming a crisis later.`
      : dti <= 50
      ? `A DTI of ${dti}% is above the 36% threshold most lenders flag as a concern. This level of debt relative to income limits your financial flexibility and costs you more each month than it should.`
      : `A DTI of ${dti}% is in the critical range. At this level, debt is likely consuming a large portion of your income and may feel impossible to escape. That is exactly what a structured plan addresses — and it is more achievable than it feels.`;
    contextBoxes.push(dtiMsg);
  }

  if (annualInterest > 0) {
    contextBoxes.push(`Based on the interest rates you provided, your debt is costing you approximately <strong>${fmt(Math.round(annualInterest))} per year</strong> — or <strong>${fmt(Math.round(monthlyInterest))} every month</strong> — just in interest charges. That is money that reduces your balance by nothing. Eliminating even one high-rate account materially changes this number.`);
  }

  if (disposable < 0) {
    contextBoxes.push(`Your monthly expenses exceed your income by ${fmt(Math.abs(disposable))}. Before any accelerated debt payoff is possible, this shortfall needs to be addressed — either through reduced expenses, additional income, or by negotiating lower minimum payments on existing accounts. Your action plan addresses this directly.`);
  } else if (disposable > 0 && totalMinPay > 0 && disposable > totalMinPay) {
    const extra = disposable - totalMinPay;
    contextBoxes.push(`After minimum payments, you have approximately <strong>${fmt(extra)}/month</strong> available. Directed strategically to your highest-interest account, this can significantly accelerate your payoff timeline and reduce total interest paid.`);
  }

  document.getElementById('report-context-boxes').innerHTML = contextBoxes.map(msg =>
    `<div class="report-context-box">${msg}</div>`).join('');

  // ── SECTION 2: Profile ────────────────────────────────────────
  const traitCards = Object.entries(info.traits || {}).map(([letter, label]) => {
    const t = TRAIT_DEFS[letter];
    if (!t) return '';
    return `<div class="report-trait">
      <div class="report-trait-dim">${t.dim}</div>
      <div class="report-trait-val">${t.val}</div>
      <div class="report-trait-desc">${t.desc}</div>
    </div>`;
  }).join('');

  document.getElementById('report-profile-wrap').innerHTML = `
    <div class="rp-name-device">
      <div class="rp-code">${ctx.archetype}</div>
      <div class="rp-name">${info.name}</div>
    </div>
    <p class="rp-desc">${info.desc}</p>
    ${traitCards ? `<div class="report-trait-grid">${traitCards}</div>` : ''}
    <div class="rp-guide-box">
      <div class="rp-guide-label">How this shapes your plan</div>
      <div class="rp-guide-body">${info.guide || 'Your plan is sequenced and toned to match how you respond best to guidance and action prompts.'}</div>
    </div>`;

  // ── SECTION 3: Full action plan ───────────────────────────────
  const priLbl   = { high:'High priority', medium:'Next step', low:'Also consider' };
  const whatNext = [
    {
      heading: "Before you start",
      body: "Gather your account numbers and the collector's full mailing address from the collection notice. Send your letter via USPS Certified Mail with Return Receipt Requested — keep the green card when it comes back. The moment they sign for it, the clock starts and all collection activity must legally stop."
    },
    {
      heading: "What to expect",
      body: "Your servicer must process IDR applications within 30 days. If you are behind on payments, you may be eligible for immediate forbearance while the application is reviewed. Your new payment amount is recalculated each year based on your tax return. If your income drops further, your payment drops too — potentially to $0."
    },
    {
      heading: "What to say on the call",
      body: "Call the main billing number and say: \"I would like to apply for your financial hardship program.\" Do not say 'I cannot pay' — say 'I am experiencing a temporary hardship and want to find a payment solution.' Ask for the hardship or retention team specifically. Get the agent's name and employee ID, and ask them to email you a written summary of any arrangement before you make a payment."
    },
    {
      heading: "What to prepare first",
      body: "Pull your free credit reports from AnnualCreditReport.com before contacting any creditor — you need to know exactly what they know. Verify the balance, the account open date, and the date of first delinquency on each account. These dates determine your statute of limitations, which affects your negotiating position significantly."
    },
    {
      heading: "After this step",
      body: "Once complete, update your debt list with the new balance or status. Every completed step shifts your numbers — your DTI improves, your credit profile changes, and your leverage with remaining creditors increases. Track each win. The subscription coaching layer will prompt you at the right time for each subsequent action."
    }
  ];

  document.getElementById('report-actions').innerHTML = (plan.actions||[]).slice(0,5).map((a, i) => {
    const wn = whatNext[i] || whatNext[4];
    return `
    <div class="report-action${a.urgent ? ' urgent' : ''}">
      <div class="report-action-head">
        <div class="report-action-num">${i+1}</div>
        <div style="flex:1">
          <span class="pri-tag ${a.urgent ? 'pri-urgent' : a.priority==='high' ? 'pri-high' : a.priority==='medium' ? 'pri-medium' : 'pri-low'}">${a.urgent ? 'Act now' : priLbl[a.priority]||'Next step'}</span>
          <div class="report-action-title">${a.title}</div>
        </div>
      </div>
      <div class="report-action-body">${a.body}</div>
      ${a.impact ? `<div class="report-action-impact">${a.impact}</div>` : ''}
      <div class="report-what-next">
        <div class="rwn-label">${wn.heading}</div>
        <div class="rwn-body">${wn.body}</div>
      </div>
    </div>`;
  }).join('');

  // ── SECTION 4: Legal rights ───────────────────────────────────
  const rights = [];

  if (ctx.inCollections) {
    rights.push({
      law: 'FDCPA §809(b)',
      title: 'Right to demand debt validation',
      body: 'Any debt collector must provide written verification of a debt upon your written request made within 30 days of first contact. Verification must include the name and address of the original creditor, the exact amount owed, and confirmation of their authority to collect. Until they respond, all collection activity — calls, letters, credit reporting — must stop completely.',
      action: 'Send a certified Debt Validation Letter within 30 days of first collector contact. Do not wait. A template is available with the ongoing support subscription.',
      urgent: true,
    });
    rights.push({
      law: 'FDCPA §805(c)',
      title: 'Right to demand all contact cease',
      body: 'You may send a written cease-and-desist letter demanding the collector stop all contact with you. After receiving it, they may only contact you once more — to confirm they are stopping, or to notify you of a specific legal action such as a lawsuit. Any other contact after your letter is a federal violation worth up to $1,000 in statutory damages per incident, plus attorney fees.',
      action: 'Send via certified mail. Keep the return receipt. Log every contact that occurs afterward — date, time, method, and content.',
      urgent: true,
    });
    rights.push({
      law: 'FDCPA §807–808',
      title: 'Right against deceptive and abusive collection practices',
      body: 'Collectors are prohibited from: threatening arrest or legal action they do not intend to take; misrepresenting the amount owed; contacting you before 8am or after 9pm; calling your workplace if told not to; using obscene language; or publishing your name as a debtor. Violations are actionable in federal court without needing to prove actual damages.',
      action: 'Document every violation with date, time, and content. File complaints at consumerfinance.gov/complaint and your state attorney general. Consider consulting a consumer law attorney — many take FDCPA cases on contingency.',
    });
  }

  rights.push({
    law: 'FCRA §611',
    title: 'Right to dispute and correct your credit report',
    body: 'You are entitled to a free credit report from each of the three bureaus (Equifax, Experian, TransUnion) at AnnualCreditReport.com — now available weekly. Any information you dispute must be investigated within 30 days. Items that cannot be verified must be removed. Studies consistently show 30–40% of credit reports contain errors — inaccurate balances, wrong account statuses, accounts that do not belong to you.',
    action: 'Pull all three reports now. Dispute any inaccuracy directly with the bureau in writing. You do not need a credit repair company to do this — it is your legal right and costs nothing.',
  });

  if (ctx.hasFedStudent) {
    rights.push({
      law: 'Higher Education Act §493C',
      title: 'Right to income-driven repayment on federal loans',
      body: 'Every federal student loan borrower has a statutory right to enroll in at least one income-driven repayment plan, regardless of credit history, employment status, or how long they have been in repayment. Available plans include SAVE, IBR, PAYE, and ICR. Your monthly payment is calculated as a percentage of your discretionary income — which can be $0 for many borrowers. Any remaining balance after 20–25 years of qualifying payments is forgiven.',
      action: 'Apply at studentaid.gov or call your servicer. The application takes about 10 minutes. Relief can be retroactive to the beginning of the plan year.',
    });

    if (ctx.hasPublicNP) {
      rights.push({
        law: 'College Cost Reduction Act (PSLF)',
        title: 'Right to pursue Public Service Loan Forgiveness',
        body: `Working full-time for a qualifying public service employer — any level of government, or most 501(c)(3) nonprofits — entitles you to apply for PSLF. After 120 qualifying monthly payments under an income-driven repayment plan, your remaining federal loan balance is forgiven entirely, tax-free. Qualifying payments do not need to be consecutive. Payments made under the wrong plan can sometimes be recounted under the limited PSLF waiver.`,
        action: 'Submit the PSLF employer certification form immediately at studentaid.gov/pslf. Every month you delay is a qualifying payment you are not counting.',
        urgent: true,
      });
    }
  }

  if (ctx.debts.some(d => d.type === 'medical')) {
    rights.push({
      law: 'ACA §501(r) + IRS Rev. Rul. 56-185',
      title: 'Right to financial assistance on medical debt',
      body: 'All 501(c)(3) nonprofit hospitals — which includes most major hospital systems in the US — are legally required to have financial assistance (charity care) programs and must make them widely available. They are prohibited from engaging in "extraordinary collection actions," including reporting to credit bureaus, filing lawsuits, or placing liens, without first screening you for financial assistance eligibility. Income thresholds vary by hospital but often reach 200–400% of the federal poverty level.',
      action: 'Call the billing department and ask specifically for a "financial assistance application" or "charity care form." This is a legal requirement, not a discretionary favour. Ask for their written FAP (Financial Assistance Policy) as well.',
    });
  }

  document.getElementById('report-rights').innerHTML = rights.map(r => `
    <div class="rights-item${r.urgent ? ' urgent' : ''}">
      <div class="rights-header">
        <span class="rights-law">${r.law}</span>
        ${r.urgent ? '<span class="rights-urgent-tag">Applies to your accounts</span>' : ''}
      </div>
      <div class="rights-title">${r.title}</div>
      <div class="rights-body">${r.body}</div>
      <div class="rights-action">
        <svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5l3.5 3.5 6.5-6.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        ${r.action}
      </div>
    </div>`).join('');

  // ── SECTION 5: What comes next ────────────────────────────────
  const subItems = [
    {
      title: 'Negotiation scripts',
      body: 'Word-for-word call scripts for hardship programs, settlement offers, creditor disputes, and debt validation follow-ups. Each script is matched to your profile type and the specific type of account — a credit card hardship call reads very differently from a medical billing dispute.',
    },
    {
      title: 'Timed check-ins and nudges',
      body: `Based on the PAIR research behind your ${info.name} profile, you respond best to ${info.tone === 'cooperative' ? 'calm, supportive prompts that acknowledge your situation without pressure' : info.tone === 'informative' ? 'clear, data-driven updates with specific next steps' : 'mutual-benefit framing that connects action to outcomes'}. Your check-ins are calibrated accordingly — sent at the moments most likely to keep you moving.`,
    },
    {
      title: 'Personal coaching layer',
      body: 'Ask questions, work through sticking points, and get guidance on specific creditors and situations — from a coaching layer that knows your full debt picture, your profile type, and where you are in the plan. Not generic advice. Contextual guidance for your specific situation.',
    },
    {
      title: 'Monthly progress tracking',
      body: 'A running view of your debt picture as it changes — balances, DTI, credit impact, completed steps. Seeing the numbers move is one of the most powerful motivators for staying on track. Your profile type is updated if your situation changes.',
    },
  ];

  
  // ── SECTION 4b: Sample letter ──────────────────────────────
  const hasCollections = ctx.inCollections;
  const letterTitle = hasCollections ? 'Debt Validation Letter' : 'Hardship Request Letter';
  const letterLaw   = hasCollections ? 'FDCPA §809(b)' : 'General consumer rights';

  const validationLetter = `
    <p>[Your Full Name]<br>[Your Address]<br>[City, State ZIP]<br>[Date]</p>
    <p>[Collector Company Name]<br>[Collector Address]</p>
    <p>Re: Account #<span class="sl-placeholder">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span> &nbsp;|&nbsp; Original Creditor: <span class="sl-placeholder">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></p>
    <p>To Whom It May Concern,</p>
    <p>I am writing in response to your recent communication regarding the above-referenced account. I am exercising my rights under the Fair Debt Collection Practices Act (FDCPA), 15 U.S.C. §1692g, to request validation of this debt.</p>
    <p>Please provide the following within 30 days of receipt of this letter:</p>
    <p>1. The name and address of the original creditor<br>
    2. A complete statement of the account showing the amount owed<br>
    3. Proof that your firm is licensed to collect debt in my state<br>
    4. Proof that you are authorized to collect this particular debt</p>
    <p>Until you have provided this verification, please <strong>cease all collection activity</strong> including phone calls, letters, and credit reporting, as required by 15 U.S.C. §1692g(b).</p>
    <p>This is not a refusal to pay. This is a formal request for debt validation as guaranteed by federal law.</p>
    <p>Sincerely,<br><span class="sl-placeholder">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></p>
    <p><em>Send via USPS Certified Mail with Return Receipt. Keep the green card.</em></p>`;

  const hardshipLetter = `
    <p>[Your Full Name]<br>[Your Address]<br>[City, State ZIP]<br>[Date]</p>
    <p>[Creditor Name] — Financial Hardship Department<br>[Address]</p>
    <p>Re: Account #<span class="sl-placeholder">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></p>
    <p>Dear Hardship Review Team,</p>
    <p>I am writing to request a financial hardship arrangement on the above account. I have been a customer since <span class="sl-placeholder">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span> and have every intention of honoring my obligation. However, due to <span class="sl-placeholder">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>, I am temporarily unable to maintain my current payment level.</p>
    <p>My current situation: Monthly income of <span class="sl-placeholder">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span> and essential expenses of <span class="sl-placeholder">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span> leave very limited funds available for debt service.</p>
    <p>I am requesting consideration for one or more of the following:<br>
    &mdash; Temporary reduction in minimum payment<br>
    &mdash; Interest rate reduction for a defined period<br>
    &mdash; Waiver of recent late fees<br>
    &mdash; A short-term payment deferral</p>
    <p>I am committed to working toward a full repayment plan as my situation stabilizes. Please contact me to discuss available options.</p>
    <p>Sincerely,<br><span class="sl-placeholder">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></p>`;

  document.getElementById('report-sample-letter').innerHTML = `
    <div class="sample-letter">
      <div class="sl-header">
        <span class="sl-header-title">Sample: ${letterTitle}</span>
        <span class="sl-header-tag">${letterLaw}</span>
      </div>
      <div class="sl-body">
        ${hasCollections ? validationLetter : hardshipLetter}
      </div>
      <div class="sl-footer">
        Fill in the highlighted fields. Send certified mail. Full subscription includes pre-filled versions matched to each of your specific accounts.
      </div>
    </div>`;

  // ── SECTION 4c: Call script ─────────────────────────────────
  const hasCCLate = ctx.debts.some(d => d.type === 'credit-card' && ['30','60','90'].includes(d.status));
  const scriptTitle = ctx.hasPublicNP ? 'PSLF Employer Certification Call' : hasCCLate ? 'Credit Card Hardship Call' : 'Creditor Negotiation Call';

  const hardshipScript = `
    <div class="ss-line"><span class="ss-speaker">You</span><span class="ss-text">"Hello, I'm calling about my account — account number <span class="sl-placeholder">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>. My name is <span class="sl-placeholder">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>."</span></div>
    <div class="ss-note">Wait for them to pull up your account. Write down the agent's name.</div>
    <div class="ss-line"><span class="ss-speaker">You</span><span class="ss-text">"I'm experiencing a financial hardship and I want to find a solution before this account gets further behind. Can you transfer me to your hardship program or retention team?"</span></div>
    <div class="ss-note">Do not say "I can't pay." Always frame it as seeking a solution. If they say they have no hardship program, ask for a supervisor.</div>
    <div class="ss-line"><span class="ss-speaker">Them</span><span class="ss-text">[They may ask about your hardship situation]</span></div>
    <div class="ss-line"><span class="ss-speaker">You</span><span class="ss-text">"I've had a reduction in income due to [brief explanation]. My monthly take-home is now [amount] and after essential expenses I have very limited funds available. I want to stay current — I'm hoping you can offer a temporary interest rate reduction or a lower minimum payment for a defined period."</span></div>
    <div class="ss-note">Have your numbers ready: income, expenses, and what you could realistically pay. Be specific.</div>
    <div class="ss-line"><span class="ss-speaker">Them</span><span class="ss-text">[They offer an arrangement]</span></div>
    <div class="ss-line"><span class="ss-speaker">You</span><span class="ss-text">"Thank you. Before I agree, can you send me the terms of that arrangement in writing — by email or letter — before I make any payment? I want to make sure I have the details correct."</span></div>
    <div class="ss-note">Never make a payment based on a verbal promise. Always get it in writing first.</div>`;

  const pslfScript = `
    <div class="ss-line"><span class="ss-speaker">You</span><span class="ss-text">"Hello, I'm calling to ask about the Public Service Loan Forgiveness program and submitting my employer certification form. My name is <span class="sl-placeholder">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span> and my account number is <span class="sl-placeholder">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>."</span></div>
    <div class="ss-line"><span class="ss-speaker">You</span><span class="ss-text">"I work for [employer name], which is a [government / 501(c)(3) nonprofit]. I want to confirm my loans are eligible for PSLF and get my employment certification form reviewed. Can you walk me through the current process?"</span></div>
    <div class="ss-note">Ask them to confirm: (1) your loan type is eligible, (2) your repayment plan qualifies, (3) how many qualifying payments are already on record.</div>
    <div class="ss-line"><span class="ss-speaker">You</span><span class="ss-text">"Can you also confirm my current repayment plan qualifies for PSLF? If not, what do I need to switch to, and can we do that today?"</span></div>
    <div class="ss-note">Many people are on the wrong plan and don't know it. IDR plans qualify; standard 10-year plans do not count toward PSLF.</div>`;

  document.getElementById('report-sample-script').innerHTML = `
    <div class="sample-script">
      <div class="ss-header">
        <span class="ss-header-title">Sample script: ${scriptTitle}</span>
        <span class="ss-header-tag">Word-for-word guidance</span>
      </div>
      <div class="ss-body">
        ${ctx.hasPublicNP ? pslfScript : hardshipScript}
      </div>
      <div class="ss-footer">
        Adapt to your situation. Full subscription includes scripts for every creditor type, tailored to your ${info.name} profile.
      </div>
    </div>`;

  // ── SECTION 4d: Pro tips ────────────────────────────────────
  const tips = [
    "Never make a payment on a debt in collections before receiving written validation — a payment can reset the statute of limitations clock, potentially extending how long they can sue you.",
    "Record the date, time, agent name, and employee ID of every creditor call. Violations of your rights are worth up to $1,000 each in statutory damages — documentation is your leverage.",
    "Creditors typically become more willing to negotiate as accounts age. Charged-off debt sold to collectors was often purchased for 1–7 cents on the dollar — they have enormous room to settle.",
    "Your credit score matters less than you think right now. If you are already behind, your score is already affected. Focus on resolving the debt, not protecting a number that is already impacted.",
    "Medical debt under $500 was removed from all three major credit reports in 2023 under new rules. If you have older medical debt under that threshold, it may already be removable from your report.",
  ];

  if (ctx.hasFedStudent) {
    tips.push("Student loan interest capitalizes when you leave forbearance — it gets added to your principal balance and you then pay interest on a larger amount. Enrol in IDR before forbearance ends to avoid this.");
  }

  document.getElementById('report-pro-tips').innerHTML = `
    <div class="tips-box">
      <div class="tips-box-title">Pro tips — things most people don't know</div>
      ${tips.map(t => `<div class="tip-item"><div class="tip-dot"></div><div>${t}</div></div>`).join('')}
    </div>`;

  // ── SECTION 5b: All profiles comparison ─────────────────────
  const ALL_PROFILES = [
    { code:'WAOR', name:'The Focused Planner',       traits:'Engaged · Capable · Organized · Analytical' },
    { code:'WAOE', name:'The Ready Worrier',         traits:'Engaged · Capable · Organized · Feeling-led' },
    { code:'WACR', name:'The Analytical Juggler',    traits:'Engaged · Capable · Scattered · Analytical' },
    { code:'WACE', name:'The Well-Intentioned Juggler', traits:'Engaged · Capable · Scattered · Feeling-led' },
    { code:'WIOR', name:'The Organized Rebuilder',   traits:'Engaged · Constrained · Organized · Analytical' },
    { code:'WIOE', name:'The Anxious Organizer',     traits:'Engaged · Constrained · Organized · Feeling-led' },
    { code:'WICR', name:'The Determined Rebuilder',  traits:'Engaged · Constrained · Scattered · Analytical' },
    { code:'WICE', name:'The Overwhelmed Doer',      traits:'Engaged · Constrained · Scattered · Feeling-led' },
    { code:'DICR', name:'The Cautious Realist',      traits:'Guarded · Constrained · Scattered · Analytical' },
    { code:'DICE', name:'The Exhausted Avoider',     traits:'Guarded · Constrained · Scattered · Feeling-led' },
  ];

  document.getElementById('report-profile-table').innerHTML = `
    <div class="profile-table-wrap">
      <table class="profile-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Profile name</th>
            <th>Key traits</th>
          </tr>
        </thead>
        <tbody>
          ${ALL_PROFILES.map(p => {
            const isYou = p.code === ctx.archetype;
            return `<tr class="${isYou ? 'your-profile' : ''}">
              <td class="pt-code">${p.code}</td>
              <td class="pt-name">${p.name}${isYou ? '<span class="pt-you-badge">You</span>' : ''}</td>
              <td class="pt-traits">${p.traits}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;


  document.getElementById('report-next').innerHTML = `
    <p class="report-next-intro">Your report covers the foundational picture and your first five steps. What comes next — actually executing those steps, handling the responses, navigating the follow-ups — is where most people stall. That is what the ongoing support covers.</p>

    <div class="report-next-grid">
      ${subItems.map(item => `
        <div class="rng-item">
          <div class="rng-title">${item.title}</div>
          <div class="rng-body">${item.body}</div>
        </div>`).join('')}
    </div>

    <div class="report-enroll-card">
      <div class="rec-eyebrow"><strong>Optional — ongoing support</strong></div>
      <div class="rec-intro">When you're ready to go further, ongoing support gives you the tools to execute every step: coaching, check-ins timed to your profile, and guidance as your situation evolves.</div>
      <div class="rec-price-row"><span class="rec-price-sm">$69</span><span class="rec-per-sm">/month &nbsp;·&nbsp; cancel anytime</span></div>
      <button class="btn-secondary rec-btn-soft" onclick="showPage('trial')">Learn more about ongoing support</button>
      <div class="rec-note">No contracts. No percentage of your debt. Start when you're ready.</div>
    </div>`;
}


// ── PDF DOWNLOAD — jsPDF + html2canvas ──────────────────────
async function downloadReport() {
  if (!currentCtx || !currentPlan) return;
  const ctx  = currentCtx;
  const plan = currentPlan;
  const info = ctx.info;

  // Show loading state
  const btn = document.querySelector('.report-actions-bar .btn-primary');
  const origText = btn ? btn.textContent : '';
  if (btn) { btn.textContent = 'Generating PDF…'; btn.disabled = true; }

  try {
    // Load jsPDF and html2canvas from CDN
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const pageW = 210; const pageH = 297;
    const margin = 16; const contentW = pageW - margin * 2;

    // Helper: add a rendered section to the PDF
    async function addSection(el, isFirst) {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#F7F3EE',
        logging: false,
        windowWidth: 794,
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const imgW    = contentW;
      const imgH    = (canvas.height / canvas.width) * imgW;
      const maxH    = pageH - margin * 2;

      if (!isFirst) pdf.addPage();

      // If content fits on one page, center it
      if (imgH <= maxH) {
        pdf.addImage(imgData, 'JPEG', margin, margin, imgW, imgH);
      } else {
        // Slice into pages
        let yOffset = 0;
        while (yOffset < imgH) {
          const sliceH  = Math.min(maxH, imgH - yOffset);
          const slicePct = sliceH / imgH;
          const srcY    = (yOffset / imgH) * canvas.height;
          const srcH    = slicePct * canvas.height;
          // Create a slice canvas
          const slice = document.createElement('canvas');
          slice.width  = canvas.width;
          slice.height = srcH;
          const sctx = slice.getContext('2d');
          sctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);
          const sliceData = slice.toDataURL('image/jpeg', 0.92);
          pdf.addImage(sliceData, 'JPEG', margin, margin, imgW, sliceH);
          yOffset += maxH;
          if (yOffset < imgH) { pdf.addPage(); }
        }
      }
    }

    // Build a hidden off-screen render container
    const container = document.createElement('div');
    container.style.cssText = `
      position:fixed; top:-9999px; left:-9999px;
      width:794px; background:#F7F3EE;
      font-family:'DM Sans',Georgia,sans-serif;
      color:#1E110A; font-size:13px; line-height:1.65;
    `;
    document.body.appendChild(container);

    // Shared styles injected into the container
    const style = document.createElement('style');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@400;500;600&display=swap');
      * { box-sizing:border-box; margin:0; padding:0; }
      body, div { font-family:'DM Sans',Georgia,sans-serif; }
      .pdf-cover { background:#3D2314; color:#F7F3EE; padding:52px 48px 48px; min-height:auto; height:277mm; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; }
      .pdf-eyebrow { font-size:10px; font-weight:600; letter-spacing:.12em; text-transform:uppercase; color:#8A7A6A; margin-bottom:20px; }
      .pdf-title { font-family:'DM Serif Display',serif; font-size:52px; line-height:1.05; letter-spacing:-0.02em; color:#F7F3EE; margin-bottom:16px; }
      .pdf-sub { font-size:14px; color:#8A7A6A; line-height:1.6; max-width:480px; margin-bottom:40px; }
      .pdf-divider { width:40px; height:3px; background:#C47A3A; margin-bottom:24px; border-radius:2px; }
      .pdf-meta { font-size:12px; color:#C4B5A0; border-top:1px solid #5C3D2E; padding-top:16px; display:flex; flex-wrap:wrap; gap:24px; }
      .pdf-section { padding:32px 40px; background:#F7F3EE; }
      .pdf-section + .pdf-section { border-top: 1px solid #EDE5DA; }
      h2 { font-family:'DM Serif Display',serif; font-size:20px; letter-spacing:-0.01em; color:#1E110A; margin:0 0 10px; padding-bottom:8px; border-bottom:1.5px solid #1E110A; }
      h3 { font-size:14px; font-weight:600; margin:14px 0 5px; color:#1E110A; }
      p { font-size:13px; color:#7A6A58; line-height:1.65; margin-bottom:10px; }
      .metrics { display:flex; gap:10px; margin:14px 0; }
      .metric { flex:1; background:#EDE5DA; border-radius:8px; padding:13px; text-align:center; }
      .metric .v { font-family:'DM Serif Display',serif; font-size:22px; margin-bottom:2px; color:#1E110A; }
      .metric .l { font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:.05em; color:#7A6A58; }
      .metric .n { font-size:10px; color:#7A6A58; margin-top:2px; }
      table { width:100%; border-collapse:collapse; font-size:12px; margin:12px 0; }
      th { text-align:left; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:#7A6A58; padding:6px 0; border-bottom:1.5px solid #1E110A; }
      td { padding:8px 0; border-bottom:1px solid #EDE5DA; vertical-align:top; color:#1E110A; }
      .context-box { background:#EDE5DA; border-left:2px solid #5C3D2E; padding:10px 13px; border-radius:0 6px 6px 0; margin:10px 0; font-size:12px; color:#5C3D2E; line-height:1.65; }
      .context-box strong { color:#1E110A; }
      .profile-device { display:flex; align-items:center; gap:14px; border:1.5px solid #1E110A; border-radius:10px; padding:14px 18px; margin:12px 0; }
      .pcode { font-family:'DM Serif Display',serif; font-size:13px; color:#F7F3EE; background:#1E110A; padding:8px 11px; border-radius:6px; text-align:center; line-height:1.25; flex-shrink:0; }
      .pcode-sub { font-size:8px; font-weight:600; letter-spacing:.07em; text-transform:uppercase; color:#8A7A6A; margin-top:3px; display:block; }
      .pname { font-size:14px; font-weight:600; color:#1E110A; margin-bottom:3px; }
      .pdesc { font-size:12px; color:#7A6A58; line-height:1.6; }
      .traits { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin:12px 0; }
      .trait { background:#EDE5DA; border-radius:6px; padding:10px; }
      .trait-dim { font-size:9px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:#7A6A58; }
      .trait-val { font-size:12px; font-weight:600; color:#5C3D2E; margin:2px 0; }
      .trait-desc { font-size:11px; color:#7A6A58; line-height:1.5; }
      .guide-box { background:#EDE5DA; border-left:2px solid #5C3D2E; border-radius:0 6px 6px 0; padding:10px 13px; font-size:12px; color:#5C3D2E; line-height:1.6; margin-top:10px; }
      .action { border:1.5px solid #1E110A; border-radius:10px; padding:14px; margin-bottom:12px; background:#F7F3EE; }
      .action.urgent { border-color:#8B1A1A; }
      .a-head { display:flex; gap:10px; align-items:flex-start; margin-bottom:8px; }
      .a-num { width:44px; height:44px; border-radius:50%; background:#EDE5DA; border:2px solid #5C3D2E; display:flex; align-items:center; justify-content:center; font-family:'DM Serif Display',serif; font-size:20px; color:#5C3D2E; flex-shrink:0; }
      .action.urgent .a-num { background:#8B1A1A; border-color:#8B1A1A; color:#F7F3EE; }
      .a-tag { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; padding:2px 7px; border-radius:3px; background:#1E110A; color:#F7F3EE; display:inline-block; margin-bottom:3px; }
      .a-tag.urgent { background:#8B1A1A; }
      .a-title { font-size:13px; font-weight:600; line-height:1.4; color:#1E110A; }
      .a-body { font-size:12px; color:#7A6A58; line-height:1.65; margin:6px 0; padding-left:54px; }
      .a-impact { display:inline-block; margin:4px 0 0 54px; font-size:11px; font-weight:700; padding:2px 9px; border-radius:20px; border:1px solid #5C3D2E; color:#5C3D2E; }
      .a-next { margin-top:10px; padding:10px 12px 10px 54px; border-top:1px dashed #EDE5DA; }
      .a-next-lbl { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:#5C3D2E; margin-bottom:4px; }
      .a-next-body { font-size:11px; color:#7A6A58; line-height:1.65; }
      .rights-hd { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.08em; color:#5C3D2E; margin-bottom:4px; }
      .rights-badge { display:inline-block; font-size:9px; font-weight:700; background:#8B1A1A; color:#F7F3EE; padding:1px 6px; border-radius:3px; margin-left:6px; }
      .rights-title { font-size:13px; font-weight:600; margin:4px 0; color:#1E110A; }
      .rights-body { font-size:12px; color:#7A6A58; line-height:1.65; margin-bottom:6px; }
      .rights-action { font-size:11px; font-weight:600; color:#2A6040; }
      .rights-item { padding:12px 0; border-bottom:1px solid #EDE5DA; }
      .rights-item:last-child { border-bottom:none; }
      .rights-item.urgent { background:#FAF3F3; padding:12px; border-radius:6px; margin-bottom:8px; border:1px solid #F0DADA; }
      .sl { border:1.5px solid #1E110A; border-radius:8px; overflow:hidden; margin:12px 0; }
      .sl-hd { background:#1E110A; color:#F7F3EE; padding:9px 14px; display:flex; justify-content:space-between; }
      .sl-hd-t { font-size:12px; font-weight:600; }
      .sl-hd-tag { font-size:10px; color:#8A7A6A; text-transform:uppercase; letter-spacing:.05em; }
      .sl-bd { padding:14px; font-size:12px; line-height:1.75; color:#1E110A; background:#F7F3EE; }
      .sl-bd p { margin-bottom:9px; }
      .sl-ph { border-bottom:1px dashed #5C3D2E; display:inline-block; min-width:80px; color:#7A6A58; font-style:italic; }
      .sl-ft { padding:8px 14px; background:#EDE5DA; border-top:1px solid #C4B5A0; font-size:10px; color:#7A6A58; }
      .ss { border:1.5px solid #5C3D2E; border-radius:8px; overflow:hidden; margin:12px 0; }
      .ss-hd { background:#5C3D2E; color:#F7F3EE; padding:9px 14px; display:flex; justify-content:space-between; }
      .ss-hd-t { font-size:12px; font-weight:600; }
      .ss-hd-tag { font-size:10px; color:#C4B5A0; text-transform:uppercase; letter-spacing:.05em; }
      .ss-bd { padding:14px; background:#F7F3EE; }
      .ss-ln { display:flex; gap:8px; margin-bottom:8px; align-items:flex-start; }
      .ss-spk { font-size:9px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:#7A6A58; min-width:40px; margin-top:2px; flex-shrink:0; }
      .ss-txt { font-size:12px; color:#1E110A; line-height:1.6; }
      .ss-note { font-size:10px; color:#7A6A58; background:#EDE5DA; border-radius:4px; padding:5px 9px; margin:2px 0 7px 48px; font-style:italic; }
      .ss-ft { padding:8px 14px; background:#EDE5DA; border-top:1px solid #C4B5A0; font-size:10px; color:#7A6A58; }
      .tips { background:#EDE5DA; border-radius:8px; padding:14px 16px; margin:12px 0; }
      .tips-t { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:#5C3D2E; margin-bottom:8px; }
      .tip { display:flex; gap:8px; font-size:12px; color:#1E110A; margin-bottom:6px; align-items:flex-start; line-height:1.55; }
      .tip:last-child { margin-bottom:0; }
      .tip-d { width:5px; height:5px; border-radius:50%; background:#8B1A1A; flex-shrink:0; margin-top:5px; }
      .pt { width:100%; border-collapse:collapse; font-size:12px; margin:10px 0; }
      .pt th { text-align:left; font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:#7A6A58; padding:6px 8px; border-bottom:1.5px solid #1E110A; background:#EDE5DA; }
      .pt td { padding:7px 8px; border-bottom:1px solid #EDE5DA; vertical-align:top; }
      .pt tr.you { background:#FAF3F3; }
      .pt tr.you td { font-weight:500; }
      .pt .code { font-family:'DM Serif Display',serif; font-size:12px; color:#5C3D2E; }
      .pt tr.you .code { color:#8B1A1A; }
      .pt .pn { font-weight:600; }
      .pt tr.you .pn { color:#8B1A1A; }
      .you-b { display:inline-block; font-size:8px; font-weight:700; background:#8B1A1A; color:#F7F3EE; padding:1px 5px; border-radius:3px; margin-left:4px; }
      .pt-tr { font-size:10.5px; color:#7A6A58; }
      .enroll-box { background:#1E110A; border-radius:10px; padding:24px; text-align:center; color:#F7F3EE; margin:16px 0; }
      .enroll-eyebrow { font-size:10px; font-weight:600; letter-spacing:.1em; text-transform:uppercase; color:#8A7A6A; margin-bottom:8px; }
      .enroll-price { font-family:'DM Serif Display',serif; font-size:36px; margin-bottom:4px; }
      .enroll-price span { font-family:'DM Sans',sans-serif; font-size:16px; color:#8A7A6A; font-weight:400; }
      .enroll-desc { font-size:12px; color:#8A7A6A; margin-bottom:8px; line-height:1.6; }
      .enroll-compare { font-size:12px; color:#4A3728; margin-bottom:14px; }
      .enroll-compare strong { color:#F7F3EE; }
      .enroll-cta-t { font-size:13px; font-weight:600; color:#F0DADA; margin-bottom:8px; }
      .enroll-note { font-size:10px; color:#4A3728; }
      .disc { font-size:11px; color:#8A7A6A; font-style:italic; margin-top:24px; padding-top:14px; border-top:1px solid #EDE5DA; line-height:1.6; }
      .fn { font-size:10px; color:#8A7A6A; margin-top:4px; }
    `;
    container.appendChild(style);

    // ── Build report sections as DOM nodes ──────────────────────────

    const DEFAULT_RATES_R = { 'credit-card':20,'student-federal':6,'student-private':9,'medical':0,'personal':14,'other':18 };
    function poMonths(bal, rate, monthly, dtype) {
      if (!monthly) return null;
      const r = (rate || DEFAULT_RATES_R[dtype] || 18) / 100 / 12;
      if (r <= 0) return Math.ceil(bal/monthly);
      if (monthly <= bal*r) return null;
      return Math.ceil(-Math.log(1-(bal*r/monthly))/Math.log(1+r));
    }
    function poStr(mos) {
      if (mos === null) return '—';
      if (mos > 360) return '30+ yrs';
      if (mos > 24) return Math.ceil(mos/12)+' yrs';
      return mos+' mos';
    }

    const annualInt = ctx.debts.filter(d=>d.rate).reduce((s,d)=>s+d.balance*(d.rate/100),0);
    const statusLbl = {current:'Current','30':'30d late','60':'60d late','90':'90d+ late',collections:'Collections','charged-off':'Charged off','no-contact':'No contact'};
    const priLbl = {high:'High priority',medium:'Next step',low:'Also consider'};
    const whatNextHeadings = ['Before you start','What to expect','What to say','What to prepare','After this step'];
    const whatNextBodies = [
      "Gather account numbers and the collector's mailing address. Send via USPS Certified Mail with Return Receipt. The clock starts when they receive it.",
      "Your servicer must process IDR applications within 30 days. You may qualify for immediate forbearance while reviewing.",
      "Say: 'I'd like to apply for your hardship program.' Ask for the hardship or retention team. Get the agent name and any arrangement in writing before paying.",
      "Pull your free credit reports from AnnualCreditReport.com first. Verify balances, open dates, and first delinquency dates.",
      "Once complete, update your debt list. Every completed step shifts your DTI and your leverage with remaining creditors."
    ];

    const ALL_PROFILES_R = [
      ['WAOR','The Focused Planner','Engaged · Capable · Organized · Analytical'],
      ['WAOE','The Ready Worrier','Engaged · Capable · Organized · Feeling-led'],
      ['WACR','The Analytical Juggler','Engaged · Capable · Scattered · Analytical'],
      ['WACE','The Well-Intentioned Juggler','Engaged · Capable · Scattered · Feeling-led'],
      ['WIOR','The Organized Rebuilder','Engaged · Constrained · Organized · Analytical'],
      ['WIOE','The Anxious Organizer','Engaged · Constrained · Organized · Feeling-led'],
      ['WICR','The Determined Rebuilder','Engaged · Constrained · Scattered · Analytical'],
      ['WICE','The Overwhelmed Doer','Engaged · Constrained · Scattered · Feeling-led'],
      ['DICR','The Cautious Realist','Guarded · Constrained · Scattered · Analytical'],
      ['DICE','The Exhausted Avoider','Guarded · Constrained · Scattered · Feeling-led'],
    ];

    function sec(titleStr, subStr, bodyHtml) {
      return `<div class="pdf-section"><h2>${titleStr}</h2>${subStr ? `<p style="color:#7A6A58;font-style:italic;margin-bottom:12px">${subStr}</p>` : ''}${bodyHtml}</div>`;
    }

    // Cover
    container.innerHTML += `<div class="pdf-cover">
      <div>
        <div class="pdf-eyebrow">DebtSnap · Personal Debt Relief Report</div>
        <div class="pdf-divider"></div>
        <div class="pdf-title">Your Debt<br>Relief Report</div>
        <div class="pdf-sub">A personalized analysis of your debt situation, your legal rights, and your complete action plan — in order of priority.</div>
      </div>
      <div class="pdf-meta">
        <span>Generated: ${ctx.generatedAt}</span>
        <span>Profile: ${info.name}</span>
        <span>Total: ${fmt(ctx.total)}</span>
      </div>
    </div>`;

    // Section 1: Debt picture
    container.innerHTML += sec('Your Debt Picture', null,
      `<div class="metrics">
        <div class="metric"><div class="v">${fmt(ctx.total)}</div><div class="l">Total debt</div></div>
        <div class="metric"><div class="v">${ctx.dti !== null ? ctx.dti+'%' : '—'}</div><div class="l">Debt-to-income</div><div class="n">Advisable: under 36%</div></div>
        <div class="metric"><div class="v">${fmt(Math.abs(ctx.disposable))}</div><div class="l">${ctx.disposable>=0?'Surplus':'Shortfall'}/mo</div></div>
        ${annualInt>0?`<div class="metric"><div class="v">${fmt(Math.round(annualInt))}</div><div class="l">Annual interest</div></div>`:''}
      </div>
      <table>
        <thead><tr><th>Account</th><th>Balance</th><th>Rate</th><th>Min pay</th><th>Status</th><th>Payoff*</th></tr></thead>
        <tbody>
          ${ctx.debts.map(d=>{
            const mos = poMonths(d.balance,d.rate,d.minPay,d.type);
            return `<tr>
              <td>${d.label}</td>
              <td><strong>${fmt(d.balance)}</strong></td>
              <td>${d.rateBand||d.rate?d.rateBand||d.rate+'%':'est. '+(DEFAULT_RATES_R[d.type]||18)+'%'}</td>
              <td>${d.minPay?fmt(d.minPay)+'/mo':'—'}</td>
              <td>${statusLbl[d.status]||d.status}</td>
              <td>${poStr(mos)}</td>
            </tr>`;
          }).join('')}
          <tr><td><strong>Total</strong></td><td><strong>${fmt(ctx.total)}</strong></td><td colspan="4"></td></tr>
        </tbody>
      </table>
      <div class="fn">* Payoff at minimum payment only. Where rate not specified, a typical rate for that debt type is used as an estimate.</div>
      ${ctx.dti>36?`<div class="context-box">Your DTI of ${ctx.dti}% is ${ctx.dti>50?'in the critical range — debt is consuming a substantial portion of your income.':'above the 36% threshold most lenders consider healthy.'}</div>`:''}
      ${annualInt>0?`<div class="context-box">Your accounts cost approximately <strong>${fmt(Math.round(annualInt/12))}/month</strong> — ${fmt(Math.round(annualInt))}/year — in pure interest. Eliminating your highest-rate account first changes this significantly.</div>`:''}`
    );

    // Section 2: Profile
    const traitCards = Object.entries(info.traits||{}).map(([l])=>{
      const t = TRAIT_DEFS[l]; if(!t) return '';
      return `<div class="trait"><div class="trait-dim">${t.dim}</div><div class="trait-val">${t.val}</div><div class="trait-desc">${t.desc}</div></div>`;
    }).join('');
    container.innerHTML += sec('Your Financial Profile', null,
      `<div class="profile-device">
        <div class="pcode">${ctx.archetype}<span class="pcode-sub">Your financial<br>profile</span></div>
        <div><div class="pname">${info.name}</div><div class="pdesc">${info.desc}</div></div>
      </div>
      ${traitCards?`<div class="traits">${traitCards}</div>`:''}
      <div class="guide-box">${info.guide||'Your plan is sequenced and toned to match how you respond best.'}</div>`
    );

    // Section 3: Action plan
    container.innerHTML += sec('Your Complete Action Plan', 'All 5 priority steps — with what to say, what to expect, and what to do.',
      (plan.actions||[]).slice(0,5).map((a,i)=>`
        <div class="action${a.urgent?' urgent':''}">
          <div class="a-head">
            <div class="a-num">${i+1}</div>
            <div>
              <span class="a-tag${a.urgent?' urgent':''}">${a.urgent?'Act now':priLbl[a.priority]||'Next step'}</span>
              <div class="a-title">${a.title}</div>
            </div>
          </div>
          <div class="a-body">${a.body}</div>
          ${a.impact?`<div class="a-impact">${a.impact}</div>`:''}
          <div class="a-next">
            <div class="a-next-lbl">${whatNextHeadings[i]||'Next'}</div>
            <div class="a-next-body">${whatNextBodies[i]||whatNextBodies[4]}</div>
          </div>
        </div>`).join('')
    );

    // Section 4: Legal rights
    const rightsItems = [];
    if (ctx.inCollections) {
      rightsItems.push({law:'FDCPA §809(b)',title:'Right to demand debt validation',body:'Any collector must provide written verification upon request within 30 days. All collection activity must stop until they comply.',action:'Send a certified Debt Validation Letter. See sample below.',urgent:true});
      rightsItems.push({law:'FDCPA §805(c)',title:'Right to stop all contact',body:'A written cease-and-desist limits collectors to one final contact. Further contact is a federal violation worth up to $1,000 per incident.',action:'Send certified mail. Log every subsequent contact.',urgent:true});
    }
    rightsItems.push({law:'FCRA §611',title:'Right to dispute credit report errors',body:'Free reports weekly at AnnualCreditReport.com. Disputed items must be investigated within 30 days. Unverifiable items must be removed.',action:'Pull all three reports. Dispute directly with each bureau — no third party needed.'});
    if (ctx.hasFedStudent) rightsItems.push({law:'Higher Education Act §493C',title:'Right to income-driven repayment',body:'Every federal borrower has the right to an IDR plan regardless of credit history. Payments can be as low as $0/month.',action:'Apply at studentaid.gov. Takes 10 minutes.'});
    if (ctx.debts.some(d=>d.type==='medical')) rightsItems.push({law:'ACA §501(r)',title:'Right to charity care on medical debt',body:'All 501(c)(3) hospitals must offer financial assistance and cannot take collection action without screening you first.',action:"Ask the billing department for a 'financial assistance application' by name."});

    container.innerHTML += sec('Your Legal Rights', null,
      rightsItems.map(r=>`<div class="rights-item${r.urgent?' urgent':''}">
        <div class="rights-hd">${r.law}${r.urgent?'<span class="rights-badge">Applies to your accounts</span>':''}</div>
        <div class="rights-title">${r.title}</div>
        <div class="rights-body">${r.body}</div>
        <div class="rights-action">${r.action}</div>
      </div>`).join('')
    );

    // Section 5: Sample letter
    const hasCol = ctx.inCollections;
    container.innerHTML += sec(hasCol?'Sample Letter — Debt Validation':'Sample Letter — Hardship Request',
      'Fill in the highlighted fields. Send by USPS Certified Mail with Return Receipt.',
      `<div class="sl">
        <div class="sl-hd"><span class="sl-hd-t">${hasCol?'Debt Validation Letter (FDCPA §809(b))':'Hardship Request Letter'}</span><span class="sl-hd-tag">${hasCol?'FDCPA §809(b)':'Consumer rights'}</span></div>
        <div class="sl-bd">
          ${hasCol?`
          <p>[Your Full Name] &nbsp;|&nbsp; [Your Address] &nbsp;|&nbsp; [Date]</p>
          <p>[Collector Company Name] &nbsp;|&nbsp; [Collector Address]</p>
          <p>Re: Account # <span class="sl-ph">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span> &nbsp;|&nbsp; Original Creditor: <span class="sl-ph">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></p>
          <p>To Whom It May Concern,</p>
          <p>I am exercising my rights under the Fair Debt Collection Practices Act, 15 U.S.C. §1692g, to request written validation of the above-referenced debt. Please provide: (1) the name and address of the original creditor; (2) a complete account statement showing the amount owed; (3) proof that your firm is licensed to collect debt in my state; (4) proof of your authority to collect this particular debt.</p>
          <p>Until you have provided this verification in writing, please <strong>cease all collection activity</strong> — including phone calls, letters, and credit bureau reporting — as required by 15 U.S.C. §1692g(b). This is a formal validation request, not a refusal to pay.</p>
          <p>Sincerely, <span class="sl-ph">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></p>
          <p><em>Send via USPS Certified Mail with Return Receipt. Keep the green card when it returns.</em></p>` :
          `<p>[Your Full Name] &nbsp;|&nbsp; [Your Address] &nbsp;|&nbsp; [Date]</p>
          <p>[Creditor Name] — Financial Hardship Department &nbsp;|&nbsp; Re: Account # <span class="sl-ph">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></p>
          <p>Dear Hardship Review Team,</p>
          <p>I am writing to request a financial hardship arrangement on the above account. Due to <span class="sl-ph">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>, my monthly take-home income is currently ${fmt(ctx.income)} and essential expenses are ${fmt(ctx.expenses)}, leaving very limited funds available for debt service.</p>
          <p>I request consideration for: a temporary reduction in minimum payment, an interest rate reduction, waiver of recent late fees, or a short-term deferral. I am committed to a full repayment plan as my situation stabilizes. Please contact me to discuss available options.</p>
          <p>Sincerely, <span class="sl-ph">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></p>`}
        </div>
        <div class="sl-ft">Subscription includes pre-filled versions matched to each of your specific accounts.</div>
      </div>`
    );

    // Section 6: Call script
    container.innerHTML += sec(ctx.hasPublicNP?'Call Script — PSLF Certification':'Call Script — Hardship Program',
      'Word-for-word guidance for your first creditor call.',
      `<div class="ss">
        <div class="ss-hd"><span class="ss-hd-t">${ctx.hasPublicNP?'PSLF Employer Certification Call':'Credit Card / Loan Hardship Call'}</span><span class="ss-hd-tag">Word-for-word</span></div>
        <div class="ss-bd">
          ${ctx.hasPublicNP?`
          <div class="ss-ln"><span class="ss-spk">You</span><span class="ss-txt">"Hello — I'm calling about my student loans and the PSLF program. My name is [name] and my account number is [number]."</span></div>
          <div class="ss-ln"><span class="ss-spk">You</span><span class="ss-txt">"I work for [employer name], which is a [government/501(c)(3) nonprofit]. I want to confirm my loans are eligible for PSLF, that my repayment plan qualifies, and how many qualifying payments I have on record."</span></div>
          <div class="ss-note">Ask them to confirm your loan type and repayment plan qualify. Standard 10-year plans do not count toward PSLF — only IDR plans do.</div>
          <div class="ss-ln"><span class="ss-spk">You</span><span class="ss-txt">"Can you also switch me to an IDR plan if I'm not on one? And can you confirm the date of my last qualifying payment?"</span></div>
          <div class="ss-note">If your employer is not yet certified, ask them to walk you through submitting the PSLF Form at studentaid.gov/pslf.</div>` :
          `<div class="ss-ln"><span class="ss-spk">You</span><span class="ss-txt">"Hello, I'm calling about account number [number]. I'm experiencing a financial hardship and I'd like to discuss a hardship arrangement — can you transfer me to your hardship or retention team?"</span></div>
          <div class="ss-note">Do not say 'I can't pay.' Always frame it as seeking a solution. If told no program exists, ask for a supervisor.</div>
          <div class="ss-ln"><span class="ss-spk">You</span><span class="ss-txt">"My income is [amount]/month and after essential expenses I have very limited funds available. I want to stay current — I'm hoping for a temporary interest rate reduction or a lower minimum payment for a defined period."</span></div>
          <div class="ss-note">Have your numbers ready and be specific. Write down the agent name and employee ID number.</div>
          <div class="ss-ln"><span class="ss-spk">Them</span><span class="ss-txt">[They offer an arrangement]</span></div>
          <div class="ss-ln"><span class="ss-spk">You</span><span class="ss-txt">"Thank you — can you send the terms of that arrangement in writing before I make any payment? I want to confirm the details are correct."</span></div>
          <div class="ss-note">Never pay based on a verbal promise. Always get written confirmation first.</div>`}
        </div>
        <div class="ss-ft">Subscription includes scripts for all creditor types, matched to your ${info.name} profile.</div>
      </div>`
    );

    // Section 7: Pro tips
    const tips = [
      "Never make a payment on a collections debt before receiving written validation — a payment can reset the statute of limitations, extending how long they can sue you.",
      "Document every creditor contact: date, time, agent name, and employee ID. Violations of your FDCPA rights are worth up to $1,000 each in statutory damages.",
      "Charged-off debt is commonly sold to collectors for 1–7 cents on the dollar. They have enormous room to settle — knowing this changes your negotiating posture significantly.",
      "Medical debt under $500 was removed from all three major credit reports in 2023. If you have older medical debt below this threshold, check whether it's still appearing.",
    ];
    if (ctx.hasFedStudent) tips.push("Student loan interest capitalizes when you exit forbearance — added to your principal balance. Enrol in IDR before forbearance ends to avoid paying interest on a larger amount.");

    container.innerHTML += sec('Pro Tips',
      'Things most people in debt don\'t know — that can materially change your position.',
      `<div class="tips">
        <div class="tips-t">Things most people in debt don't know</div>
        ${tips.map(t=>`<div class="tip"><div class="tip-d"></div><div>${t}</div></div>`).join('')}
      </div>`
    );

    // Section 8: All profiles
    container.innerHTML += sec('All Financial Profiles',
      'The 10 behavioral profiles used in DebtSnap\'s framework — yours is highlighted.',
      `<table class="pt">
        <thead><tr><th>Code</th><th>Profile name</th><th>Key traits</th></tr></thead>
        <tbody>
          ${ALL_PROFILES_R.map(([c,n,t])=>`<tr class="${c===ctx.archetype?'you':''}">
            <td class="code">${c}</td>
            <td class="pn">${n}${c===ctx.archetype?'<span class="you-b">You</span>':''}</td>
            <td class="pt-tr">${t}</td>
          </tr>`).join('')}
        </tbody>
      </table>`
    );

    // Section 9: What comes next
    container.innerHTML += sec('What Comes Next',
      'Your report covers the foundations. Execution is what changes the numbers.',
      `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0">
        <div style="background:#F7F3EE;border:1.5px solid #1E110A;border-radius:8px;padding:12px"><strong style="font-size:12px">Negotiation scripts</strong><p style="font-size:11px;margin-top:4px">Word-for-word calls matched to your profile and each creditor type.</p></div>
        <div style="background:#F7F3EE;border:1.5px solid #1E110A;border-radius:8px;padding:12px"><strong style="font-size:12px">Timed check-ins</strong><p style="font-size:11px;margin-top:4px">Prompts calibrated to your ${info.name} profile at the moments most likely to keep you moving.</p></div>
        <div style="background:#F7F3EE;border:1.5px solid #1E110A;border-radius:8px;padding:12px"><strong style="font-size:12px">Personal coaching</strong><p style="font-size:11px;margin-top:4px">Contextual guidance for your specific situation — not generic advice.</p></div>
        <div style="background:#F7F3EE;border:1.5px solid #1E110A;border-radius:8px;padding:12px"><strong style="font-size:12px">Progress tracking</strong><p style="font-size:11px;margin-top:4px">A running view of your numbers as they improve — balances, DTI, completed steps.</p></div>
      </div>
      <div class="enroll-box">
        <div class="enroll-eyebrow">Optional — ongoing support</div>
        <div class="enroll-price">$69<span>/month</span></div>
        <div class="enroll-desc">When you're ready to go further. Cancel anytime · No contracts.</div>
        <div class="enroll-compare">Traditional agencies charge 15–25% of your balance. On ${fmt(ctx.total)}, that is <strong>${fmt(Math.round(ctx.total*0.2))} or more</strong>.</div>
        <div class="enroll-cta-t">debtsnap.com — Learn more about ongoing support</div>
        <div class="enroll-note">Scripts · Coaching · Check-ins · Progress tracking</div>
      </div>
      <div class="disc">This report is for educational and informational purposes only and does not constitute legal or financial advice. DebtSnap is not a law firm. For complex legal situations, consult a licensed consumer law attorney. Many work on contingency for FDCPA violations. AnnualCreditReport.com is the only federally authorized source for free annual credit reports.</div>`
    );

    // ── Render cover page separately (full bleed) ─────────────────
    const coverEl = container.querySelector('.pdf-cover');
    if (coverEl) {
      const coverCanvas = await html2canvas(coverEl, {
        scale: 2, useCORS: true, backgroundColor: '#3D2314',
        logging: false, windowWidth: 794,
        height: coverEl.offsetHeight,
      });
      const coverData = coverCanvas.toDataURL('image/jpeg', 0.92);
      // Fill entire A4 page
      pdf.addImage(coverData, 'JPEG', 0, 0, pageW, pageH);
    }

    // ── Render all content sections as one continuous flow ─────────
    const contentEl = document.createElement('div');
    contentEl.style.cssText = 'width:762px;background:#F7F3EE;padding:0;';
    const sections = container.querySelectorAll('.pdf-section');
    sections.forEach(s => {
      const clone = s.cloneNode(true);
      clone.style.borderTop = '1px solid #EDE5DA';
      contentEl.appendChild(clone);
    });
    container.appendChild(contentEl);
    // Let it render
    await new Promise(r => setTimeout(r, 200));

    const contentCanvas = await html2canvas(contentEl, {
      scale: 2, useCORS: true, backgroundColor: '#F7F3EE',
      logging: false, windowWidth: 762,
    });

    // Slice into pages — respect action card boundaries
    const scale    = contentCanvas.width / contentEl.offsetWidth;
    const pxPerMm  = contentCanvas.width / contentW;
    const pageHpx  = (pageH - margin * 2) * pxPerMm;
    let   yPx      = 0;
    let   pageNum  = 0;

    while (yPx < contentCanvas.height) {
      pdf.addPage();
      // Try to find a clean break point — don't cut mid-action-card
      let sliceH = Math.min(pageHpx, contentCanvas.height - yPx);

      // Render this slice
      const slice = document.createElement('canvas');
      slice.width  = contentCanvas.width;
      slice.height = sliceH;
      const sctx = slice.getContext('2d');
      sctx.drawImage(contentCanvas, 0, yPx, contentCanvas.width, sliceH, 0, 0, contentCanvas.width, sliceH);
      const sliceData = slice.toDataURL('image/jpeg', 0.92);
      const sliceHmm  = sliceH / pxPerMm;
      pdf.addImage(sliceData, 'JPEG', margin, margin, contentW, sliceHmm);
      yPx += pageHpx;
      pageNum++;
    }

    container.removeChild(contentEl);

    document.body.removeChild(container);

    // Save
    const safeFilename = `DebtSnap-Report-${ctx.generatedAt.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`;
    pdf.save(safeFilename);

  } catch (err) {
    console.error('PDF error:', err);
    alert('PDF generation encountered an issue. Please try again or use your browser\'s Print to PDF option.');
  } finally {
    if (btn) { btn.textContent = origText; btn.disabled = false; }
  }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}


// ── FAQ ──────────────────────────────────────────────
function toggleFaq(el) {
  const answer = el.nextElementSibling;
  const isOpen = answer.classList.contains('open');
  document.querySelectorAll('.faq-a').forEach(a => a.classList.remove('open'));
  document.querySelectorAll('.faq-q').forEach(q => q.classList.remove('open'));
  if (!isOpen) { answer.classList.add('open'); el.classList.add('open'); }
}

// ── UTILS ────────────────────────────────────────────
function fmt(n) { return '$' + Math.round(n).toLocaleString('en-US'); }

// ── INIT ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  showPage('home');
  startDebtCounter();
});

function startDebtCounter() {
  const el = document.getElementById('debt-counter');
  if (!el) return;
  const target = 1280000000000; // $1.28T
  const duration = 3800;
  const steps = 120;
  const increment = target / steps;
  const startFrom = 800000000000; // start from $800B
  let current = startFrom;
  let step = 0;
  const ease = t => t < 0.5 ? 2*t*t : -1+(4-2*t)*t; // ease in-out
  const timer = setInterval(() => {
    step++;
    const t = step / steps;
    current = startFrom + (target - startFrom) * ease(t);
    if (step >= steps) { current = target; clearInterval(timer); }
    // Format as $X.XXT or $XXXb
    let display;
    if (current >= 1e12) display = '$' + (current / 1e12).toFixed(2) + 'T';
    else display = '$' + Math.round(current / 1e9) + 'B';
    el.textContent = display;
  }, duration / steps);

  // Restart when About page is revisited (intersection observer on stat-strip)
  const strip = document.querySelector('.stat-strip');
  if (strip && 'IntersectionObserver' in window) {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { step = 0; current = 0; } });
    }, { threshold: 0.3 });
    obs.observe(strip);
  }
}
