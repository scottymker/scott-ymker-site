// ---------- price tables (cents) ----------
const PACKAGE_PRICES = { A:3200, A1:4100, B:2700, B1:3200, C:2200, C1:2700, D:1800, D1:2300, E:1200, E1:1700 };
const ADDON_PRICES   = { F:600, G:600, H:600, I:1800, J:600, K:600, L:700, M:800, N:1500 };
const ADDON_NAMES    = {
  F:"8x10 Print", G:"2x 5x7 Prints", H:"4x 3½x5 Prints", I:"24 Wallets",
  J:"8 Wallets", K:"16 Mini Wallets", L:"Retouching", M:"8x10 Class Composite", N:"Digital File"
};

const PACKAGE_BREAKDOWN = {
  A:  ["1 × 8x10 Class Composite","2 × 8x10","2 × 5x7","8 × wallets","16 × mini wallets"],
  B:  ["1 × 8x10 Class Composite","1 × 8x10","2 × 5x7","16 × wallets"],
  C:  ["1 × 8x10 Class Composite","1 × 8x10","2 × 3.5x5","4 × wallets","16 × mini wallets"],
  D:  ["1 × 8x10 Class Composite","2 × 5x7","8 × wallets"],
  E:  ["2 × 5x7","2 × 3.5x5","4 × wallets"],
  A1: ["1 × 8x10 Class Composite","2 × 8x10","2 × 5x7","8 × wallets","16 × mini wallets","1 × Digital File"],
  B1: ["1 × 8x10 Class Composite","1 × 8x10","4 × 5x7","16 × wallets"],
  C1: ["1 × 8x10 Class Composite","1 × 8x10","2 × 3.5x5","2 × 5x7","4 × wallets","16 × mini wallets"],
  D1: ["1 × 8x10 Class Composite","2 × 5x7","8 × wallets","16 × mini wallets"],
  E1: ["2 × 5x7","2 × 3.5x5","12 × wallets"]
};

// Base packages first, then digital variants
const PACKAGES_ORDER = ['A','B','C','D','E','A1','B1','C1','D1','E1'];
const BACKGROUNDS = ['F1','F2','F3','F4','F5','F6'];

const VISIBLE_PKG_COUNT = 5;
const MAX_STUDENTS = 6;

const $  = (s)=>document.querySelector(s);
const $$ = (s)=>Array.from(document.querySelectorAll(s));
const fmt= (c)=> (c/100).toLocaleString(undefined,{style:'currency',currency:'USD'});
const fmtMoney = (c)=> fmt(c);
const safeCode = (v)=> (v||'').toString().trim().toUpperCase();

const studentsEl = $('#students');
const addBtn = $('#addStudent');

// ---------- Package cards HTML ----------
function pkgCardsHTML(i){
  const cards = PACKAGES_ORDER.map((code, idx) => {
    const price = PACKAGE_PRICES[code];
    const items = PACKAGE_BREAKDOWN[code] || [];
    const badge = code === 'A' ? '<span class="pkg-badge">Most Popular</span>' : '';
    return `<div class="pkg-card" data-student="${i}" data-pkg="${code}" onclick="window.__selectPkg(${i},'${code}')">
      ${badge}
      <div class="pkg-name">Package ${code}</div>
      <div class="pkg-price">${fmtMoney(price)}</div>
      <ul class="pkg-items">${items.map(x=>`<li>${x}</li>`).join('')}</ul>
    </div>`;
  });

  // First 5 visible, rest in hidden container
  const visible = cards.slice(0, VISIBLE_PKG_COUNT).join('');
  const hidden  = cards.slice(VISIBLE_PKG_COUNT).join('');

  return `<div class="pkg-grid">${visible}
    <div class="pkg-more" hidden>${hidden}</div>
  </div>
  <div class="pkg-show-more">
    <button type="button" class="btn small" onclick="window.__showMorePkgs(${i})">Show more packages</button>
  </div>`;
}

// ---------- Show more packages ----------
window.__showMorePkgs = function(i){
  const det = studentsEl.querySelector(`details[data-i="${i}"]`);
  if (!det) return;
  const more = det.querySelector('.pkg-more');
  const btnWrap = det.querySelector('.pkg-show-more');
  if (more) more.hidden = false;
  if (btnWrap) btnWrap.hidden = true;
};

// ---------- Background thumbnails HTML ----------
function bgThumbsHTML(i){
  return BACKGROUNDS.map((code, idx) => {
    const sel = idx === 0 ? ' selected' : '';
    const badge = code === 'F1' ? '<span class="bg-badge">Default</span>' : '';
    return `<div class="bg-thumb${sel}" data-student="${i}" data-bg="${code}" onclick="window.__selectBg(${i},'${code}')">
      ${badge}
      <img src="${code}_Background_Example.jpg" alt="${code} background" loading="lazy">
      <span class="bg-label">${code}</span>
    </div>`;
  }).join('');
}

// ---------- Selection handlers ----------
window.__selectPkg = function(i, code){
  const det = studentsEl.querySelector(`details[data-i="${i}"]`);
  if (!det) return;
  det.querySelectorAll('.pkg-card').forEach(c => c.classList.toggle('selected', c.dataset.pkg === code));
  det.querySelector(`input[name="s${i}_package"]`).value = code;
  enforceAddonRules(det);

  // Reveal add-ons section
  const addonSection = det.querySelector('.addon-section');
  if (addonSection && addonSection.hidden) addonSection.hidden = false;

  renderSummary();
};

window.__selectBg = function(i, code){
  const det = studentsEl.querySelector(`details[data-i="${i}"]`);
  if (!det) return;
  det.querySelectorAll('.bg-thumb').forEach(t => t.classList.toggle('selected', t.dataset.bg === code));
  det.querySelector(`input[name="s${i}_background"]`).value = code;
  renderSummary();
};

// ---------- "Same school?" shortcut ----------
window.__copySchool = function(i){
  const s1 = studentsEl.querySelector('details[data-i="1"]');
  const det = studentsEl.querySelector(`details[data-i="${i}"]`);
  if (!s1 || !det) return;
  const teacher1 = s1.querySelector('[name$="_teacher"]')?.value || '';
  const grade1   = s1.querySelector('[name$="_grade"]')?.value || '';
  const teacherInput = det.querySelector('[name$="_teacher"]');
  const gradeInput   = det.querySelector('[name$="_grade"]');
  if (teacherInput) teacherInput.value = teacher1;
  if (gradeInput)   gradeInput.value   = grade1;
  renderSummary();
};

function studentTemplate(i){
  const sameSchoolLink = i > 1
    ? `<button type="button" class="btn-link same-school" onclick="window.__copySchool(${i})">Same school as Student 1?</button>`
    : '';

  return `
  <details class="student" data-i="${i}" ${i<=1?'open':''}>
    <summary>
      <span class="summ-left">Student ${i}</span>
      <span class="summ-right muted" data-summ="${i}">New student</span>
    </summary>
    <div class="content">
      <div class="section-title">Student information</div>
      <div class="row">
        <input type="text" name="s${i}_first"   placeholder="First name" required oninput="window.renderSummary()">
        <input type="text" name="s${i}_last"    placeholder="Last name" required oninput="window.renderSummary()">
      </div>
      ${sameSchoolLink}
      <div class="row" style="margin-top:10px">
        <input type="text" name="s${i}_teacher" placeholder="Teacher" required oninput="window.renderSummary()">
        <input type="text" name="s${i}_grade"   placeholder="Grade" required oninput="window.renderSummary()">
      </div>

      <div class="section-title" style="margin-top:14px">Choose a package</div>
      <input type="hidden" name="s${i}_package" value="">
      ${pkgCardsHTML(i)}

      <div class="addon-section" hidden>
        <div class="section-title" style="margin-top:14px">Add-ons (optional)</div>
        <div class="addon-grid">
          ${Object.entries(ADDON_NAMES).map(([code, name])=>(
            `<label class="addon">
               <input type="checkbox" name="s${i}_addons" value="${code}" disabled onchange="window.renderSummary()">
               ${code} — ${name} <span class="muted">($${(ADDON_PRICES[code]/100).toFixed(2)})</span>
             </label>`
          )).join('')}
        </div>
      </div>

      <div class="section-title" style="margin-top:14px">Choose a background</div>
      <input type="hidden" name="s${i}_background" value="F1">
      <div class="bg-grid">${bgThumbsHTML(i)}</div>

      <div class="actions" style="justify-content:flex-end;margin-top:14px">
        <button type="button" class="btn small rm" data-remove="${i}" onclick="window.__removeStudent(${i})">Remove student</button>
      </div>
    </div>
  </details>`;
}

function renumberStudents(){
  [...studentsEl.children].forEach((det, idx)=>{
    const i = idx+1;
    det.dataset.i = i;
    det.querySelector('.summ-left').textContent = `Student ${i}`;

    // Rename form inputs
    det.querySelectorAll('[name]').forEach(inp=>{
      inp.name = inp.name.replace(/s\d+_/,'s'+i+'_');
    });

    // Update remove button
    const rm = det.querySelector('[data-remove]');
    if (rm) {
      rm.dataset.remove = i;
      rm.setAttribute('onclick', `window.__removeStudent(${i})`);
    }

    // Update summary header
    const span = det.querySelector('[data-summ]');
    if (span) span.setAttribute('data-summ', i);

    // Update package card onclick handlers and data-student
    det.querySelectorAll('.pkg-card').forEach(card => {
      card.dataset.student = i;
      card.setAttribute('onclick', `window.__selectPkg(${i},'${card.dataset.pkg}')`);
    });

    // Update background thumb onclick handlers and data-student
    det.querySelectorAll('.bg-thumb').forEach(thumb => {
      thumb.dataset.student = i;
      thumb.setAttribute('onclick', `window.__selectBg(${i},'${thumb.dataset.bg}')`);
    });

    // Update show-more button onclick
    const showMoreBtn = det.querySelector('.pkg-show-more .btn');
    if (showMoreBtn) {
      showMoreBtn.setAttribute('onclick', `window.__showMorePkgs(${i})`);
    }

    // Update same-school link
    const sameSchool = det.querySelector('.same-school');
    if (sameSchool) {
      if (i <= 1) {
        sameSchool.remove();
      } else {
        sameSchool.setAttribute('onclick', `window.__copySchool(${i})`);
      }
    } else if (i > 1) {
      // Add same-school link if missing (student was previously #1)
      const firstRow = det.querySelector('.row');
      if (firstRow && firstRow.nextElementSibling) {
        firstRow.insertAdjacentHTML('afterend',
          `<button type="button" class="btn-link same-school" onclick="window.__copySchool(${i})">Same school as Student 1?</button>`);
      }
    }
  });
  updateSummaryHeaders();
}

function addStudent(){
  const count = studentsEl.children.length;
  if (count>=MAX_STUDENTS) { alert(`Limit ${MAX_STUDENTS} students per order.`); return; }
  const i = count+1;
  studentsEl.insertAdjacentHTML('beforeend', studentTemplate(i));
  updateSummaryHeaders();
  renderSummary();
}

function removeStudent(i){
  const el = studentsEl.querySelector(`details[data-i="${i}"]`);
  if (el){ el.remove(); renumberStudents(); renderSummary(); }
}

window.__removeStudent = removeStudent;

// Wire up "Add another student" button
addBtn.addEventListener('click', addStudent);

// seed with 1 student
addStudent();

// -------- Header helpers ----------
function studentName(det){
  const first = det.querySelector('[name$="_first"]')?.value.trim() || '';
  const last  = det.querySelector('[name$="_last"]')?.value.trim()  || '';
  if (first || last) return `${first} ${last}`.trim();
  return "";
}

function updateSummaryHeaders(){
  [...studentsEl.children].forEach((det)=>{
    const i = det.dataset.i || '';
    const name = studentName(det);
    const span = det.querySelector('[data-summ]');
    const left = det.querySelector('.summ-left');

    if (left) left.textContent = `Student ${i}`;
    if (!span) return;

    if (name){
      span.textContent = name;
      span.classList.remove('muted');
    } else {
      span.textContent = 'New student';
      span.classList.add('muted');
    }
  });
}

// -------- Progress Indicator ----------
function updateProgress(){
  const parentName = $('[name="parent_name"]')?.value.trim();
  const parentEmail = $('[name="parent_email"]')?.value.trim();
  const parentStarted = !!(parentName || parentEmail);
  const parentDone = !!(parentName && parentEmail);

  const students = [...studentsEl.querySelectorAll('details')];
  const anyStudentStarted = students.some(det => {
    const first = det.querySelector('[name$="_first"]')?.value.trim();
    const pkg = det.querySelector('[name$="_package"]')?.value.trim();
    return first || pkg;
  });
  const studentsDone = students.length > 0 && students.every(det => {
    const first = det.querySelector('[name$="_first"]')?.value.trim();
    const last = det.querySelector('[name$="_last"]')?.value.trim();
    const pkg = det.querySelector('[name$="_package"]')?.value.trim();
    return first && last && pkg;
  });

  const reviewReady = parentDone && studentsDone;

  const steps = $$('.step');
  if (steps.length < 4) return;

  // Step 1: Parent Info — active only when user has started typing
  steps[0].classList.toggle('done', parentDone);
  steps[0].classList.toggle('active', parentStarted && !parentDone);

  // Step 2: Students — active only when parent done and student has started
  steps[1].classList.toggle('done', studentsDone);
  steps[1].classList.toggle('active', parentDone && anyStudentStarted && !studentsDone);

  // Step 3: Review — active when everything is filled
  steps[2].classList.toggle('done', false);
  steps[2].classList.toggle('active', reviewReady);

  // Step 4: Checkout (only active during submit — set in submit handler)

  // Connecting lines
  const lines = $$('.step-line');
  if (lines[0]) lines[0].classList.toggle('done', parentDone);
  if (lines[1]) lines[1].classList.toggle('done', studentsDone);
  if (lines[2]) lines[2].classList.toggle('done', false);
}

// -------- Collect + Summary ----------
function enforceAddonRules(det){
  const hasPkg = !!safeCode(det.querySelector('[name$="_package"]')?.value);
  det.querySelectorAll('[name$="_addons"]').forEach(cb=>{
    cb.disabled = !hasPkg;
    if (!hasPkg && cb.checked) cb.checked = false;
  });
}

function collect(){
  const parent = {
    name: $('[name="parent_name"]')?.value.trim() || '',
    phone: $('[name="parent_phone"]')?.value.trim() || '',
    email: $('[name="parent_email"]')?.value.trim() || ''
  };

  const students = [...studentsEl.querySelectorAll('details')].map((det)=>{
    enforceAddonRules(det);
    const pkgInput = det.querySelector('[name$="_package"]');
    const bgInput  = det.querySelector('[name$="_background"]');
    const addons = [...det.querySelectorAll('[name$="_addons"]:checked')].map(x=>safeCode(x.value));
    return {
      det,
      name: studentName(det) || `Student ${det.dataset.i || ''}`.trim(),
      teacher: det.querySelector('[name$="_teacher"]')?.value.trim() || '',
      grade:   det.querySelector('[name$="_grade"]')?.value.trim()   || '',
      pkg:     safeCode(pkgInput?.value),
      bg:      safeCode(bgInput?.value) || 'F1',
      addons
    };
  });

  return { parent, students };
}

function renderSummary(){
  const { parent, students } = collect();
  $('#kvParent').textContent = parent.name || '—';
  $('#kvEmail').textContent  = parent.email || '—';
  $('#kvPhone').textContent  = parent.phone || '—';

  const body = $('#sumItems'); if (!body) return;
  body.innerHTML='';
  let total = 0;

  students.forEach((s)=>{
    if (!s.pkg && !s.addons.length) return;

    if (s.pkg){
      const amt = PACKAGE_PRICES[s.pkg] ?? 0;
      total += amt;
      body.insertAdjacentHTML('beforeend',
        `<tr><td>${s.name} — Package ${s.pkg}</td><td>1</td><td>${fmtMoney(amt)}</td></tr>`);
      const breakdown = PACKAGE_BREAKDOWN[s.pkg] || [];
      if (breakdown.length){
        body.insertAdjacentHTML('beforeend',
          `<tr class="subrow"><td colspan="3"><div class="sub">• ${breakdown.join('<br>• ')}</div></td></tr>`);
      }
    }
    s.addons.forEach(code=>{
      const amt = ADDON_PRICES[code] ?? 0;
      total += amt;
      body.insertAdjacentHTML('beforeend',
        `<tr><td>${s.name} — Add-on ${code} — ${ADDON_NAMES[code]||''}</td><td>1</td><td>${fmtMoney(amt)}</td></tr>`);
    });
  });

  if (!body.children.length){
    body.insertAdjacentHTML('beforeend',
      `<tr><td class="muted">Select a package to build your order…</td><td></td><td></td></tr>`);
  }

  $('#sumTotal').textContent = fmtMoney(total);
  updateSummaryHeaders();
  updateProgress();
}

window.renderSummary = renderSummary;
renderSummary();

// -------- Promo toggle ----------
window.__togglePromo = function(){
  const note = $('#promoNote');
  if (note) note.hidden = !note.hidden;
};

// -------- Inline Validation ----------
function clearErrors(){
  $$('.error').forEach(el => el.classList.remove('error'));
  $$('.error-message').forEach(el => el.remove());
}

function showErrors(fields){
  clearErrors();
  fields.forEach(({el, msg}) => {
    if (el) {
      el.classList.add('error');
      el.insertAdjacentHTML('afterend', `<div class="error-message">${msg}</div>`);
    }
  });
  // Scroll to first error
  if (fields.length && fields[0].el) {
    fields[0].el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// -------- Stripe Payment Element ----------
let stripe = null;
let elements = null;
let paymentElement = null;

function buildLineItems(students) {
  const line_items = [];
  students.forEach(s => {
    if (s.pkg) {
      line_items.push({
        price_data: {
          currency: "usd",
          product_data: { name: `${s.name} — Package ${s.pkg}` },
          unit_amount: PACKAGE_PRICES[s.pkg] ?? 0
        },
        quantity: 1
      });
    }
    s.addons.forEach(code => {
      line_items.push({
        price_data: {
          currency: "usd",
          product_data: { name: `${s.name} — Add-on ${code} — ${ADDON_NAMES[code] || ''}` },
          unit_amount: ADDON_PRICES[code] ?? 0
        },
        quantity: 1
      });
    });
  });
  return line_items;
}

function buildMetadata(parent, students) {
  const metadata = {
    parent_name: parent.name,
    parent_phone: parent.phone,
    parent_email: parent.email,
    students_count: String(students.length)
  };
  students.forEach((s, idx) => {
    const k = idx + 1;
    metadata[`s${k}_name`] = s.name;
    metadata[`s${k}_teacher`] = s.teacher;
    metadata[`s${k}_grade`] = s.grade;
    metadata[`s${k}_bg`] = s.bg;
    metadata[`s${k}_pkg`] = s.pkg || '';
    metadata[`s${k}_addons`] = s.addons.join(', ');
  });
  return metadata;
}

function showPaymentStep() {
  $('#orderStep').hidden = true;
  $('#paymentStep').hidden = false;
  // Copy summary into payment sidebar
  const src = $('#summaryCard');
  const dest = $('#paymentSummary');
  if (src && dest) dest.innerHTML = src.innerHTML;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showOrderStep() {
  $('#paymentStep').hidden = true;
  $('#orderStep').hidden = false;
  // Clean up Stripe elements
  if (paymentElement) { paymentElement.destroy(); paymentElement = null; }
  elements = null;
  stripe = null;
  $('#payment-element').innerHTML = '';
  const msg = $('#payment-message');
  if (msg) { msg.hidden = true; msg.textContent = ''; }
  const steps = $$('.step');
  if (steps[3]) steps[3].classList.remove('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Back button
document.getElementById('backToOrder').addEventListener('click', showOrderStep);

// -------- Submit ----------
document.getElementById('multiForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearErrors();

  const { parent, students } = collect();

  // Inline validation
  const errors = [];
  const nameInput = $('[name="parent_name"]');
  const phoneInput = $('[name="parent_phone"]');
  const emailInput = $('[name="parent_email"]');

  if (!parent.name)  errors.push({ el: nameInput, msg: 'Parent name is required.' });
  if (!parent.phone) errors.push({ el: phoneInput, msg: 'Phone number is required.' });
  if (!parent.email) errors.push({ el: emailInput, msg: 'Email is required.' });

  if (!students.some(s => !!s.pkg)) {
    const firstPkgGrid = studentsEl.querySelector('.pkg-grid');
    errors.push({ el: firstPkgGrid, msg: 'Pick a package for at least one student.' });
  }

  if (errors.length) {
    showErrors(errors);
    return;
  }

  // Activate checkout step
  const steps = $$('.step');
  if (steps[3]) steps[3].classList.add('active');

  const line_items = buildLineItems(students);
  const metadata = buildMetadata(parent, students);
  const email = parent.email;

  const btn = $('#checkout');
  const orig = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Processing…';

  try {
    const res = await fetch('/.netlify/functions/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ line_items, email, metadata })
    });
    const json = await res.json();
    if (!res.ok) {
      console.error(json);
      alert(json?.details?.error?.message || json?.error || 'Stripe error');
      btn.disabled = false; btn.textContent = orig;
      if (steps[3]) steps[3].classList.remove('active');
      return;
    }

    // Init Stripe + mount Payment Element
    stripe = Stripe(json.publishableKey);
    elements = stripe.elements({
      clientSecret: json.clientSecret,
      appearance: {
        theme: 'stripe',
        variables: {
          colorPrimary: '#c4703f',
          colorBackground: '#ffffff',
          colorText: '#1a1a1a',
          fontFamily: 'Outfit, system-ui, sans-serif',
          borderRadius: '12px',
        }
      }
    });

    paymentElement = elements.create('payment');
    paymentElement.mount('#payment-element');

    // Show payment step
    showPaymentStep();
    $('#payAmount').textContent = fmtMoney(json.amount);
    const payBtn = $('#payBtn');
    payBtn.disabled = false;
    payBtn.textContent = `Pay ${fmtMoney(json.amount)}`;

    // Store order number for success redirect
    payBtn.dataset.orderNumber = json.orderNumber;

    btn.disabled = false;
    btn.textContent = orig;

  } catch (err) {
    console.error(err);
    alert('Network error. Please try again.');
    btn.disabled = false; btn.textContent = orig;
    if (steps[3]) steps[3].classList.remove('active');
  }
});

// -------- Pay button ----------
document.getElementById('payBtn').addEventListener('click', async () => {
  if (!stripe || !elements) return;

  const payBtn = $('#payBtn');
  const origText = payBtn.textContent;
  payBtn.disabled = true;
  payBtn.textContent = 'Processing…';

  const msgEl = $('#payment-message');
  msgEl.hidden = true;

  const { error } = await stripe.confirmPayment({
    elements,
    confirmParams: {
      return_url: `${window.location.origin}/success.html`,
    },
  });

  // Only reaches here if there's an error (otherwise redirects)
  if (error) {
    msgEl.textContent = error.message || 'An unexpected error occurred.';
    msgEl.hidden = false;
  }
  payBtn.disabled = false;
  payBtn.textContent = origText;
});
