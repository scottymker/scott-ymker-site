// ---------- price tables (cents) ----------
const PACKAGE_PRICES = { A:3200, A1:4100, B:2700, B1:3200, C:2200, C1:2700, D:1800, D1:2300, E:1200, E1:1700 };
const ADDON_PRICES   = { F:600, G:600, H:600, I:1800, J:600, K:600, L:700, M:800, N:1500 };
const ADDON_NAMES    = {
  F:"8x10 Print", G:"2x 5x7 Prints", H:"4x 3½x5 Prints", I:"24 Wallets",
  J:"8 Wallets", K:"16 Mini Wallets", L:"Retouching", M:"8x10 Class Composite", N:"Digital File"
};

// Breakdown text under packages
const PACKAGE_BREAKDOWN = {
  A:  ["1 × 8x10 Class Composite","2 × 8x10","2 × 5x7","8 × wallets","16 × mini wallets"],
  A1: ["Package A","1 × Digital File"],
  B:  ["1 × 8x10 Class Composite","1 × 8x10","2 × 5x7","16 × wallets"],
  B1: ["Package B","2 × extra 5x7"],
  C:  ["1 × 8x10 Class Composite","1 × 8x10","2 × 3.5x5","4 × wallets","16 × mini wallets"],
  C1: ["Package C","2 × 5x7"],
  D:  ["1 × 8x10 Class Composite","2 × 5x7","8 × wallets"],
  D1: ["Package D","16 × mini wallets"],
  E:  ["2 × 5x7","2 × 3.5x5","4 × wallets"],
  E1: ["Package E","8 × extra wallets"]
};

const MAX_STUDENTS = 6;

// ---------- helpers ----------
const $  = (s)=>document.querySelector(s);
const $$ = (s)=>Array.from(document.querySelectorAll(s));
const fmt= (c)=> (c/100).toLocaleString(undefined,{style:'currency',currency:'USD'});

const studentsEl = $('#students');
const addBtn = $('#addStudent');

function studentTemplate(i){
  return `
  <details class="student" data-i="${i}" ${i<=2?'open':''}>
    <summary>
      <span class="summ-left">Student ${i}</span>
      <span class="summ-right muted" data-summ="${i}">Click to expand</span>
    </summary>
    <div class="content">
      <div class="section-title">Student information</div>
      <div class="row">
        <input type="text" name="s${i}_first"   placeholder="First name" required>
        <input type="text" name="s${i}_last"    placeholder="Last name" required>
      </div>
      <div class="row" style="margin-top:10px">
        <input type="text" name="s${i}_teacher" placeholder="Teacher" required>
        <input type="text" name="s${i}_grade"   placeholder="Grade" required>
      </div>

      <div class="section-title" style="margin-top:14px">Package</div>
      <select name="s${i}_package">
        <option value="">— Select a Package —</option>
        <option value="A">Package A – $32</option>
        <option value="A1">Package A1 – $41</option>
        <option value="B">Package B – $27</option>
        <option value="B1">Package B1 – $32</option>
        <option value="C">Package C – $22</option>
        <option value="C1">Package C1 – $27</option>
        <option value="D">Package D – $18</option>
        <option value="D1">Package D1 – $23</option>
        <option value="E">Package E – $12</option>
        <option value="E1">Package E1 – $17</option>
      </select>

      <div class="section-title" style="margin-top:14px">Add-ons (optional)</div>
      <div>
        ${Object.entries(ADDON_NAMES).map(([code, name])=>(
          `<label class="addon">
             <input type="checkbox" name="s${i}_addons" value="${code}">
             ${code} — ${name} <span class="muted">($${(ADDON_PRICES[code]/100).toFixed(2)})</span>
           </label>`
        )).join('')}
      </div>

      <div class="section-title" style="margin-top:14px">Background</div>
      <select name="s${i}_background">
        <option value="F1" selected>F1 (Default)</option>
        <option value="F2">F2</option>
        <option value="F3">F3</option>
        <option value="F4">F4</option>
        <option value="F5">F5</option>
        <option value="F6">F6</option>
      </select>

      <div class="actions" style="justify-content:flex-end;margin-top:14px">
        <button type="button" class="btn small rm" data-remove="${i}">Remove student</button>
      </div>
    </div>
  </details>`;
}

function renumberStudents(){
  [...studentsEl.children].forEach((det, idx)=>{
    const i = idx+1;
    det.dataset.i = i;
    det.querySelector('.summ-left').textContent = `Student ${i}`;
    det.querySelectorAll('[name]').forEach(inp=>{
      inp.name = inp.name.replace(/s\d+_/,'s'+i+'_');
    });
    const rm = det.querySelector('[data-remove]');
    if (rm) rm.dataset.remove = i;
    const span = det.querySelector('[data-summ]');
    if (span) span.setAttribute('data-summ', i);
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

addBtn.addEventListener('click', (e)=>{ e.preventDefault(); addStudent(); });
studentsEl.addEventListener('click',(e)=>{
  const rm = e.target.closest('[data-remove]');
  if (rm){ e.preventDefault(); removeStudent(+rm.dataset.remove); }
});

// seed with 2 students by default
addStudent(); addStudent();

// -------- Name label helpers ----------
function studentName(det){
  const first = det.querySelector('[name$="_first"]')?.value.trim() || '';
  const last  = det.querySelector('[name$="_last"]')?.value.trim()  || '';
  if (first || last) return `${first} ${last}`.trim();
  const i = det.dataset.i || '';
  return `Student ${i}`.trim();
}
function studentSubLabel(det){
  const t = det.querySelector('[name$="_teacher"]')?.value.trim() || '';
  const g = det.querySelector('[name$="_grade"]')?.value.trim()   || '';
  if (t && g) return `${t} / ${g}`;
  if (t) return t;
  if (g) return g;
  return '';
}
function updateSummaryHeaders(){
  [...studentsEl.children].forEach((det)=>{
    const i = det.dataset.i || '';
    const name = studentName(det);
    const extra = studentSubLabel(det);
    const span = det.querySelector('[data-summ]');
    const left = det.querySelector('.summ-left');
    const base = `Student ${i}`;

    if (left){
      if (/^Student \d+$/.test(name)) left.textContent = base;
      else left.textContent = `${base}: ${name}`;
    }

    if (!span) return;
    if (extra){
      span.textContent = `${name} — ${extra}`;
      span.classList.remove('muted');
    }else if (!/^Student \d+$/.test(name)){
      span.textContent = name;
      span.classList.remove('muted');
    }else{
      span.textContent = 'Click to expand';
      span.classList.add('muted');
    }
  });
}

// -------- Collect + Summary ----------
const fmtMoney = (c)=> fmt(c);

function displayName(det){
  // Prefer typed name; fall back to the left label ("Student i")
  const typed = studentName(det);
  return typed;
}

function collect(){
  const parent = {
    name: $('[name="parent_name"]')?.value.trim() || '',
    phone: $('[name="parent_phone"]')?.value.trim() || '',
    email: $('[name="parent_email"]')?.value.trim() || ''
  };

  const students = [...studentsEl.querySelectorAll('details')].map((det)=>{
    const pkgSel = det.querySelector('[name$="_package"]');
    const bgSel  = det.querySelector('[name$="_background"]');
    const addons = [...det.querySelectorAll('[name$="_addons"]:checked')].map(x=>x.value);
    return {
      det,
      name: displayName(det),
      teacher: det.querySelector('[name$="_teacher"]')?.value.trim() || '',
      grade:   det.querySelector('[name$="_grade"]')?.value.trim()   || '',
      pkg:     pkgSel?.value || '',
      bg:      bgSel?.value  || 'F1',
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

  const body = $('#sumItems'); body.innerHTML='';
  let total = 0;

  students.forEach(s=>{
    if (s.pkg && PACKAGE_PRICES[s.pkg]){
      const amt = PACKAGE_PRICES[s.pkg]; total += amt;
      // main package line
      body.insertAdjacentHTML('beforeend',
        `<tr><td>${s.name} — Package ${s.pkg}</td><td>1</td><td>${fmtMoney(amt)}</td></tr>`);
      // breakdown row
      const breakdown = PACKAGE_BREAKDOWN[s.pkg] || [];
      if (breakdown.length){
        body.insertAdjacentHTML('beforeend',
          `<tr class="subrow"><td colspan="3"><div class="sub">• ${breakdown.join('<br>• ')}</div></td></tr>`);
      }
    }
    s.addons.forEach(code=>{
      const amt = ADDON_PRICES[code]; if (!amt) return;
      total += amt;
      body.insertAdjacentHTML('beforeend',
        `<tr><td>${s.name} — Add-on ${code} — ${ADDON_NAMES[code]||''}</td><td>1</td><td>${fmtMoney(amt)}</td></tr>`);
    });
  });

  $('#sumTotal').textContent = fmtMoney(total);
  updateSummaryHeaders();
}

// live updates (any change inside form)
document.addEventListener('input', (e)=>{
  if (e.target.closest('#multiForm')) { renderSummary(); }
});

// initial render
renderSummary();

// -------- Submit ----------
$('#multiForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const { parent, students } = collect();

  if (!parent.name || !parent.phone || !parent.email){
    alert('Please complete parent name, phone, and email.'); return;
  }
  if (!students.length){ alert('Please add at least one student.'); return; }
  if (!students.some(s=>s.pkg)){ alert('Pick a package for at least one student.'); return; }

  // Build Stripe line_items (aggregate)
  const line_items = [];
  students.forEach(s=>{
    if (s.pkg && PACKAGE_PRICES[s.pkg]){
      line_items.push({
        price_data: {
          currency:"usd",
          product_data:{ name:`${s.name} — Package ${s.pkg}` },
          unit_amount: PACKAGE_PRICES[s.pkg]
        },
        quantity:1
      });
    }
    s.addons.forEach(code=>{
      const amt = ADDON_PRICES[code]; if (!amt) return;
      line_items.push({
        price_data:{
          currency:"usd",
          product_data:{ name:`${s.name} — Add-on ${code} — ${ADDON_NAMES[code]||''}` },
          unit_amount: amt
        },
        quantity:1
      });
    });
  });

  // Metadata: compact but includes names
  const metadata = {
    parent_name: parent.name,
    parent_phone: parent.phone,
    parent_email: parent.email,
    students_count: String(students.length)
  };
  students.forEach((s, idx)=>{
    const k = idx+1;
    metadata[`s${k}_name`] = s.name;
    metadata[`s${k}_teacher`] = s.teacher;
    metadata[`s${k}_grade`] = s.grade;
    metadata[`s${k}_bg`] = s.bg;
    metadata[`s${k}_pkg`] = s.pkg || '';
    metadata[`s${k}_addons`] = s.addons.join(', ');
  });

  const email = parent.email;
  const btn = $('#checkout'); const orig=btn.textContent; btn.disabled=true; btn.textContent='Processing…';

  try{
    const res = await fetch('/.netlify/functions/create-checkout-session', {
      method:'POST',
      headers:{'Content-Type':'application/json','Accept':'application/json'},
      body: JSON.stringify({
        line_items,
        email,
        metadata,
        // small echo payload for your function if it's expecting "package/addons" style too
        students: students.map(s=>({package:s.pkg, addons:s.addons}))
      })
    });
    const json = await res.json();
    if(!res.ok){
      console.error(json);
      alert(json?.details?.error?.message || json?.error || 'Stripe error');
      btn.disabled=false; btn.textContent=orig; return;
    }
    if(json.url){ window.location.href=json.url; }
    else{ alert('No checkout URL returned.'); btn.disabled=false; btn.textContent=orig; }
  }catch(err){
    console.error(err);
    alert('Network error. Please try again.');
    btn.disabled=false; btn.textContent=orig;
  }
});
