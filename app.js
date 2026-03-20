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
  { v: 'current',     l: 'Current — on time'  },
  { v: '30',          l: '30 days late'        },
  { v: '60',          l: '60 days late'        },
  { v: '90',          l: '90+ days late'       },
  { v: 'collections', l: 'In collections'      },
  { v: 'charged-off', l: 'Charged off'         },
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
    text: 'In the last 90 days, have you responded to any letters or calls from creditors?',
    opts: ["Yes, I've been in contact", "I've seen them but haven't responded", "No — I've been avoiding them"],
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
    <div><label>Balance</label><input type="number" placeholder="5,000" min="0" value="${balance}" oninput="calcTotal()"></div>
    <div><label>Status</label><select>${sOpts}</select></div>
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
    label:   DEBT_TYPES.find(t => t.v === row.querySelector('select').value)?.l || 'Debt',
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
    goal:          QUIZ[4].opts[quizAnswers.q5 ?? 0],
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
    <div class="m-cell"><div class="m-val ${dtiCls}">${ctx.dti!==null?ctx.dti+'%':'—'}</div><div class="m-lbl">Debt-to-income</div></div>
    <div class="m-cell"><div class="m-val ${dspCls}">${fmt(Math.abs(ctx.disposable))}</div><div class="m-lbl">${ctx.disposable>=0?'Monthly surplus':'Monthly shortfall'}</div></div>`;

  document.getElementById('profile-card').innerHTML = `
    <div class="p-badge">${ctx.info.name.split(' ').slice(-1)[0]}</div>
    <div>
      <div class="p-eyebrow">Your financial profile</div>
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

  // Metrics
  document.getElementById('report-metrics').innerHTML = `
    <div class="report-metric"><div class="rv">${fmt(ctx.total)}</div><div class="rl">Total debt</div></div>
    <div class="report-metric"><div class="rv">${ctx.dti!==null?ctx.dti+'%':'—'}</div><div class="rl">Debt-to-income</div></div>
    <div class="report-metric"><div class="rv ${ctx.disposable>=0?'pos':'neg'}">${fmt(Math.abs(ctx.disposable))}</div><div class="rl">${ctx.disposable>=0?'Monthly surplus':'Monthly shortfall'}</div></div>`;

  // Debt table
  const statusMap = { current:'current', '30':'late', '60':'late', '90':'late', collections:'collections', 'charged-off':'collections' };
  const statusLabelMap = { current:'Current', '30':'30 days late', '60':'60 days late', '90':'90+ days late', collections:'In collections', 'charged-off':'Charged off' };
  document.getElementById('report-debt-rows').innerHTML = ctx.debts.map(d => `
    <tr>
      <td>${d.label}</td>
      <td>${fmt(d.balance)}</td>
      <td><span class="status-badge status-${statusMap[d.status]||'late'}">${statusLabelMap[d.status]||d.status}</span></td>
    </tr>`).join('') + `<tr style="border-top:2px solid var(--espresso)">
      <td><strong>Total</strong></td>
      <td><strong>${fmt(ctx.total)}</strong></td>
      <td></td>
    </tr>`;

  // Profile
  document.getElementById('report-profile-wrap').innerHTML = `
    <div class="report-profile-badge">${ctx.info.name.split(' ').slice(-1)[0]}</div>
    <div>
      <div class="report-profile-name">${ctx.info.name}</div>
      <div class="report-profile-desc">${ctx.info.desc}</div>
      <div style="margin-top:8px;font-size:12px;color:var(--stone)">${ctx.info.guide}</div>
    </div>`;

  // All 5 actions
  const priLbl = { high:'High priority', medium:'Next step', low:'Also consider' };
  document.getElementById('report-actions').innerHTML = (plan.actions||[]).map((a,i) => `
    <div class="report-action${a.urgent?' urgent':''}">
      <div class="report-action-head">
        <div class="report-action-num">${i+1}</div>
        <div>
          <div class="pri-tag ${a.urgent?'pri-urgent':(a.priority==='high'?'pri-high':a.priority==='medium'?'pri-medium':'pri-low')}">${a.urgent?'Act now':(priLbl[a.priority]||'Next step')}</div>
          <div class="report-action-title">${a.title}</div>
        </div>
      </div>
      <div class="report-action-body">${a.body}</div>
      ${a.impact?`<div class="report-action-impact">${a.impact}</div>`:''}
    </div>`).join('');

  // Rights section — dynamic based on situation
  const rights = [];
  if (ctx.inCollections) rights.push({ title:'Right to debt validation', body:'Under FDCPA §809(b), you have the right to demand written verification of any debt within 30 days of first collector contact. The collector must stop all collection activity until they verify.' });
  if (ctx.inCollections) rights.push({ title:'Right to stop contact', body:'Under FDCPA §805(c), you can demand in writing that a collector stop all contact. They may only contact you once more to confirm — then must cease.' });
  rights.push({ title:'Right to dispute credit report errors', body:'Under FCRA §611, you have the right to dispute any inaccurate information on your credit report. The bureau must investigate within 30 days.' });
  if (ctx.hasFedStudent) rights.push({ title:'Right to income-driven repayment', body:'All federal student loan borrowers have the right to enroll in at least one income-driven repayment plan, which can reduce payments as low as $0/month based on income.' });

  document.getElementById('report-rights').innerHTML = rights.map(r => `
    <div style="padding:12px 0;border-bottom:1px solid var(--offwhite)">
      <div style="font-size:14px;font-weight:600;margin-bottom:4px;color:var(--red)">${r.title}</div>
      <div style="font-size:13px;color:var(--stone);line-height:1.6">${r.body}</div>
    </div>`).join('');
}

// ── PDF DOWNLOAD ─────────────────────────────────────
function downloadReport() {
  if (!currentCtx || !currentPlan) return;
  const ctx  = currentCtx;
  const plan = currentPlan;

  // Build a clean printable HTML page and trigger browser print-to-PDF
  const html = `<!DOCTYPE html><html><head>
  <meta charset="UTF-8">
  <title>DebtSnap Report — ${ctx.generatedAt}</title>
  <style>
    body { font-family: Georgia, serif; max-width: 680px; margin: 40px auto; color: #1E110A; font-size: 14px; line-height: 1.6; }
    h1 { font-size: 28px; margin-bottom: 4px; }
    h2 { font-size: 18px; margin: 32px 0 8px; border-bottom: 2px solid #8B1A1A; padding-bottom: 6px; color: #8B1A1A; }
    h3 { font-size: 15px; margin: 16px 0 4px; }
    .meta { font-size: 12px; color: #8A7A6A; margin-bottom: 32px; }
    .action { border: 1px solid #ccc; border-radius: 8px; padding: 14px; margin-bottom: 12px; }
    .action.urgent { border-color: #8B1A1A; }
    .action-num { display: inline-block; width: 24px; height: 24px; border-radius: 50%; background: #F4DADA; border: 1px solid #8B1A1A; text-align: center; line-height: 22px; font-size: 12px; font-weight: bold; color: #8B1A1A; margin-right: 8px; }
    .impact { display: inline-block; margin-top: 8px; font-size: 12px; font-weight: bold; padding: 2px 10px; border-radius: 20px; border: 1px solid #8B1A1A; color: #8B1A1A; background: #F4DADA; }
    .tag { display: inline-block; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: .05em; padding: 2px 7px; border-radius: 3px; background: #1E110A; color: white; margin-bottom: 4px; }
    .tag.urgent-t { background: #8B1A1A; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 16px; }
    th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: #8A7A6A; border-bottom: 2px solid #1E110A; padding: 6px 0; }
    td { padding: 8px 0; border-bottom: 1px solid #eee; }
    .metric-row { display: flex; gap: 20px; margin-bottom: 16px; }
    .metric { background: #f7f3ee; padding: 12px; border-radius: 6px; flex: 1; text-align: center; }
    .metric .v { font-size: 22px; font-weight: bold; }
    .metric .l { font-size: 10px; text-transform: uppercase; letter-spacing: .05em; color: #8A7A6A; }
    .disclaimer { font-size: 11px; color: #8A7A6A; font-style: italic; margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; }
    @media print { body { margin: 20px; } }
  </style></head><body>
  <h1>DebtSnap Debt Relief Report</h1>
  <div class="meta">Generated ${ctx.generatedAt} &nbsp;·&nbsp; Profile: ${ctx.info.name}</div>

  <h2>Your debt picture</h2>
  <div class="metric-row">
    <div class="metric"><div class="v">${fmt(ctx.total)}</div><div class="l">Total debt</div></div>
    <div class="metric"><div class="v">${ctx.dti!==null?ctx.dti+'%':'—'}</div><div class="l">Debt-to-income</div></div>
    <div class="metric"><div class="v">${fmt(Math.abs(ctx.disposable))}</div><div class="l">${ctx.disposable>=0?'Monthly surplus':'Monthly shortfall'}</div></div>
  </div>
  <table>
    <thead><tr><th>Account</th><th>Balance</th><th>Status</th></tr></thead>
    <tbody>${ctx.debts.map(d=>`<tr><td>${d.label}</td><td>${fmt(d.balance)}</td><td>${d.status}</td></tr>`).join('')}
    <tr><td><strong>Total</strong></td><td><strong>${fmt(ctx.total)}</strong></td><td></td></tr></tbody>
  </table>

  <h2>Your financial profile</h2>
  <p><strong>${ctx.info.name}:</strong> ${ctx.info.desc}</p>

  <h2>Your complete action plan</h2>
  ${(plan.actions||[]).map((a,i)=>`
  <div class="action${a.urgent?' urgent':''}">
    <div><span class="tag${a.urgent?' urgent-t':''}">${a.urgent?'Act now':a.priority}</span></div>
    <h3><span class="action-num">${i+1}</span>${a.title}</h3>
    <p>${a.body}</p>
    ${a.impact?`<span class="impact">${a.impact}</span>`:''}
  </div>`).join('')}

  <div class="disclaimer">This report is for educational and informational purposes only and does not constitute legal or financial advice. Consult a licensed consumer law attorney for complex legal situations. Many work on contingency for FDCPA violations.</div>
  </body></html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `DebtSnap-Report-${ctx.generatedAt.replace(/,?\s/g,'-')}.html`;
  a.click();
  URL.revokeObjectURL(url);
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
  showPage('process');
});
