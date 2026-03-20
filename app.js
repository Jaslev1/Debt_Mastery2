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
    ['Reviewing your accounts...', 'Calculating your debt-to-income ratio'],
    ['Building your profile...', `Scoring your ${ctx.archetype} behavior type`],
    ['Preparing your plan...', 'Matching strategies to your situation'],
  ];
  let mi = 0;
  const iv = setInterval(() => {
    if (mi < msgs.length) {
      document.getElementById('load-msg').textContent = msgs[mi][0];
      document.getElementById('load-sub').textContent = msgs[mi][1];
      mi++;
    }
  }, 1100);

  // Always generate a real rule-based plan first
  const basePlan = buildRulePlan(ctx);

  // Try to enhance actions 4-5 via API (non-blocking)
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
        max_tokens: 800,
        messages: [{ role: 'user', content: buildEnhancePrompt(ctx, basePlan) }],
      }),
    });
    const data = await res.json();
    clearInterval(iv);
    let raw = (data.content?.find(b => b.type==='text')?.text || '')
      .replace(/```json|```/g, '').trim();
    const enhanced = JSON.parse(raw);
    // Merge: keep first 3 rule-based, replace 4-5 with API
    if (enhanced.actions && enhanced.actions.length >= 2) {
      basePlan.actions = basePlan.actions.slice(0,3).concat(enhanced.actions.slice(0,2));
    }
    if (enhanced.summary) basePlan.summary = enhanced.summary;
  } catch (e) {
    clearInterval(iv);
    // Base plan already complete — just continue
  }

  renderResults(ctx, basePlan);
  showStep('s3', 100);
}

// ── RULE-BASED PLAN ENGINE ────────────────────────
// Generates real, specific first 3 actions from user data.
// No API required. Every action references the user's actual numbers.
function buildRulePlan(ctx) {
  const actions = [];
  const totalFmt = fmt(ctx.total);
  const incomeFmt = fmt(ctx.income);
  const dispFmt = fmt(Math.abs(ctx.disposable));

  // ── RULE 1: Collections / charged-off → FDCPA validation FIRST ──
  const collAccounts = ctx.debts.filter(d => ['collections','charged-off'].includes(d.status));
  if (collAccounts.length > 0) {
    const collTotal = fmt(collAccounts.reduce((s,d) => s+d.balance, 0));
    const collNames = collAccounts.map(d => DEBT_TYPES.find(t=>t.v===d.type)?.l || d.type).join(' and ');
    actions.push({
      title: 'Send a debt validation letter right now',
      body: `You have ${collAccounts.length > 1 ? collAccounts.length + ' accounts' : 'an account'} (${collNames}, totaling ${collTotal}) in collections or charged off. Under the Fair Debt Collection Practices Act, every collector must verify a debt in writing before continuing collection. Send a certified validation letter — collection calls and letters must legally stop until they comply, and errors are common.`,
      impact: `Legally pauses all collection activity on ${collTotal} of debt`,
      priority: 'high',
      urgent: true,
    });
  }

  // ── RULE 2: Federal student loans — IDR check ──
  if (ctx.hasFedStudent) {
    const fedLoans = ctx.debts.filter(d => d.type === 'student-federal');
    const fedTotal = fmt(fedLoans.reduce((s,d) => s+d.balance, 0));
    const familySize = parseInt(ctx.family) || 1;
    // Federal poverty guideline multiples (2024, 150% threshold for IBR/PAYE)
    const povertyLine = [0, 14580, 19720, 24860, 30000, 35140, 40280, 45420, 50560][Math.min(familySize, 8)] || 14580;
    const idrThreshold = povertyLine * 1.5;
    const annualIncome = ctx.income * 12;
    const qualifies = annualIncome < idrThreshold || ctx.disposable < 300;

    if (ctx.hasPublicNP) {
      actions.push({
        title: 'Screen for Public Service Loan Forgiveness',
        body: `You have ${fedTotal} in federal student loans and work for a ${ctx.employment === 'public' ? 'government' : 'nonprofit'} employer — which means you may qualify for full loan forgiveness after 120 monthly payments under Public Service Loan Forgiveness (PSLF). Visit studentaid.gov/pslf, complete the employer certification form, and submit it today. Your payments since ${new Date().getFullYear() - 3} may already count.`,
        impact: `Potential full forgiveness of ${fedTotal} after 120 payments`,
        priority: 'high',
        urgent: false,
      });
    } else if (qualifies || ctx.disposable < 500) {
      const idrPayment = Math.max(0, Math.round((annualIncome - idrThreshold) * 0.1 / 12));
      actions.push({
        title: 'Apply for income-driven repayment on your federal loans',
        body: `You have ${fedTotal} in federal student loans. Based on your income of ${incomeFmt}/month and household size of ${ctx.family}, you likely qualify for an income-driven repayment plan — which caps your monthly payment at ${idrPayment === 0 ? '$0' : fmt(idrPayment) + '/month'} instead of the standard amount. Call your servicer or apply at studentaid.gov/apply-for-aid/find-out-what-you-owe. It takes about 10 minutes.`,
        impact: idrPayment === 0 ? 'Could reduce your payment to $0/month' : `Could reduce payment to approximately ${fmt(idrPayment)}/month`,
        priority: 'high',
        urgent: false,
      });
    } else {
      actions.push({
        title: 'Review your federal loan repayment options',
        body: `You have ${fedTotal} in federal student loans. With your current income of ${incomeFmt}/month, your repayment options include income-driven plans, graduated repayment, and extended plans. Log into studentaid.gov to see your exact servicer, current balance, and all available plans side by side. If your situation changes, IDR plans can be adjusted at any time.`,
        impact: `Multiple options available on ${fedTotal} in federal loans`,
        priority: 'medium',
        urgent: false,
      });
    }
  }

  // ── RULE 3: High-rate credit card debt with capacity to pay ──
  const ccDebts = ctx.debts.filter(d => d.type === 'credit-card');
  if (ccDebts.length > 0 && actions.length < 3) {
    const ccTotal = ccDebts.reduce((s,d) => s+d.balance, 0);
    const ccFmt = fmt(ccTotal);
    const lateCC = ccDebts.filter(d => ['30','60','90'].includes(d.status));
    if (lateCC.length > 0 && ctx.disposable > 0) {
      const lateFmt = fmt(lateCC.reduce((s,d)=>s+d.balance,0));
      actions.push({
        title: 'Call your credit card hardship line — not customer service',
        body: `You have ${lateFmt} in credit card debt that is past due. Major issuers — Chase, Bank of America, Citi, Capital One, Discover — have unpublished hardship programs that can freeze interest, reduce minimum payments, and waive late fees for 6–12 months. Ask specifically for the "hardship program" or "financial assistance team" when you call. Get any agreement in writing before making a payment.`,
        impact: `Could reduce interest charges and stop late fees on ${lateFmt}`,
        priority: 'high',
        urgent: false,
      });
    } else if (ctx.disposable > 200) {
      const minPay = fmt(Math.round(ccTotal * 0.02)); // ~2% minimum
      const avalancheImpact = fmt(Math.round(ccTotal * 0.18 / 12)); // rough annual interest
      actions.push({
        title: 'Set up an avalanche payoff plan for your credit cards',
        body: `You have ${ccFmt} across ${ccDebts.length} credit card${ccDebts.length > 1 ? 's' : ''}. With ${dispFmt} available monthly after expenses, you can make meaningful progress. List your cards by interest rate — highest first — and direct every extra dollar to the highest-rate card while paying minimums on the rest. This approach minimizes total interest paid.`,
        impact: `Could save approximately ${avalancheImpact}/year in interest`,
        priority: 'medium',
        urgent: false,
      });
    }
  }

  // ── RULE 4: Medical debt ──
  const medDebts = ctx.debts.filter(d => d.type === 'medical');
  if (medDebts.length > 0 && actions.length < 3) {
    const medTotal = fmt(medDebts.reduce((s,d) => s+d.balance, 0));
    actions.push({
      title: 'Request an itemized bill and financial assistance application',
      body: `You have medical debt totaling ${medTotal}. Two steps to take this week: First, request a detailed itemized bill — studies show 30–40% of medical bills contain errors. Second, ask the hospital or provider for a financial assistance application — nonprofit hospitals (designated 501(c)(3)) are legally required to offer charity care, which can eliminate or significantly reduce balances based on income.`,
      impact: `Potential reduction or elimination of ${medTotal} in medical debt`,
      priority: 'high',
      urgent: false,
    });
  }

  // ── RULE 5: DTI too high with no other actions yet ──
  if (actions.length < 2 && ctx.dti !== null && ctx.dti > 40) {
    actions.push({
      title: 'Pull your free credit reports and build your debt map',
      body: `Your debt-to-income ratio of ${ctx.dti}% is above the threshold lenders consider healthy (36%). Before any other step, get the full picture: pull all three credit reports free at AnnualCreditReport.com. This shows every creditor, balance, and status — including accounts you may have forgotten — and is the foundation for every negotiation or dispute that follows.`,
      impact: 'Foundation step — required before negotiating anything',
      priority: 'medium',
      urgent: false,
    });
  }

  // ── FILL TO 3 if needed ──
  const fillers = [
    {
      title: 'Check your credit reports for errors',
      body: `Pull all three credit reports free at AnnualCreditReport.com. With ${totalFmt} in total debt, even one inaccurate account removed can improve your negotiating position and potentially lower your interest rates. Dispute any errors directly with the credit bureau — they have 30 days to investigate.`,
      impact: 'Could improve negotiating position immediately',
      priority: 'medium',
      urgent: false,
    },
    {
      title: 'Contact your largest creditor about a payment arrangement',
      body: `Your largest debt accounts for a significant portion of your ${totalFmt} total. Most creditors prefer a payment arrangement over default — call and ask about deferment, forbearance, or a reduced-rate payment plan. Be specific: tell them your income of ${incomeFmt}/month and what you can realistically pay each month.`,
      impact: 'Stops default risk on your largest account',
      priority: 'medium',
      urgent: false,
    },
  ];
  let fi = 0;
  while (actions.length < 3 && fi < fillers.length) {
    actions.push(fillers[fi++]);
  }

  // ── PLACEHOLDER actions 4-5 (shown blurred, replaced by API if available) ──
  actions.push({
    title: 'Negotiate a lump-sum settlement on charged-off accounts',
    body: 'Collectors who purchase charged-off debt typically pay 1–7 cents on the dollar. This gives you significant room to negotiate.',
    impact: 'Potential 40–60% reduction on settled accounts',
    priority: 'medium',
    urgent: false,
  });
  actions.push({
    title: 'Build your dispute and validation letter toolkit',
    body: 'A complete set of creditor-ready letters — customized to your accounts and state — gives you leverage at every stage.',
    impact: 'Legal protection across all your accounts',
    priority: 'low',
    urgent: false,
  });

  const info = ARCHETYPES[ctx.archetype] || ARCHETYPES.DEFAULT;
  return {
    headline: buildHeadline(ctx),
    summary: info.desc,
    actions: actions.slice(0, 5),
  };
}

function buildHeadline(ctx) {
  if (ctx.inCollections && ctx.hasFedStudent) return `Stop the collectors and lower your student loan payment`;
  if (ctx.inCollections) return `Your legal rights can stop those collection calls`;
  if (ctx.hasFedStudent && ctx.hasPublicNP) return `You may qualify for full student loan forgiveness`;
  if (ctx.hasFedStudent && ctx.disposable < 500) return `You may qualify for a $0 student loan payment`;
  if (ctx.dti > 50) return `A high debt load — here's where to start`;
  if (ctx.disposable < 0) return `Monthly shortfall — here's how to find breathing room`;
  return `Here's your personalized debt action plan`;
}

// Prompt for API to generate enhanced actions 4-5 only
function buildEnhancePrompt(ctx, basePlan) {
  return `You are a debt relief advisor. The user already has their first 3 action steps. Generate ONLY actions 4 and 5 — these are the premium steps shown behind a paywall. Make them genuinely valuable and specific to this situation.

PROFILE: ${ctx.archetype} — ${ctx.info.short}
Total debt: ${fmt(ctx.total)} | Disposable: ${fmt(ctx.disposable)}/mo | Goal: ${ctx.goal}
Accounts: ${ctx.debts.map(d=>`${d.type} ${fmt(d.balance)} (${d.status})`).join(', ')}
Employment: ${ctx.employment} | Family: ${ctx.family}
Tone required: ${ctx.info.tone}

Return ONLY this JSON (2 actions only):
{"summary":"2 sentences personalized to their situation — warm, specific","actions":[{"title":"max 8 words","body":"2-3 sentences specific guidance","impact":"specific dollar or time outcome","priority":"medium"}]}`;
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
    const urgentClass = (!locked && a.urgent) ? ' urgent' : '';
    div.className = 'action-card' + (locked ? ' locked' : '') + urgentClass;
    const pc = a.urgent ? 'pri-urgent' : (priCls[a.priority] || 'pri-medium');
    const pl = a.urgent ? 'Act now' : (priLbl[a.priority] || 'Next step');
    div.innerHTML = `
      <div class="a-head">
        <div class="a-num${a.urgent && !locked ? ' red' : ''}">${i+1}</div>
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
