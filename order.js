// ---- price tables (cents) ----
const PACKAGE_PRICES = { A:3200, A1:4100, B:2700, B1:3200, C:2200, C1:2700, D:1800, D1:2300, E:1200, E1:1700 };
const ADDON_PRICES   = { F:600, G:600, H:600, I:1800, J:600, K:600, L:700, M:800, N:1500 };
const ADDON_NAMES    = {
  F:"8x10 Print", G:"2x 5x7 Prints", H:"4x 3½x5 Prints", I:"24 Wallets",
  J:"8 Wallets", K:"16 Mini Wallets", L:"Retouching", M:"8x10 Class Composite", N:"Digital File"
};

// ---- helpers ----
const $  = (s)=>document.querySelector(s);
const $$ = (s)=>Array.from(document.querySelectorAll(s));
const v  = (sel)=>{ const el=$(sel); return el? el.value.trim() : ""; };
const fmt= (c)=> (c/100).toLocaleString(undefined,{style:'currency',currency:'USD'});

function renderSummary(){
  const pkg = $('select[name="package"]').value;
  const addons = $$('input[name="addons"]:checked').map(el=>el.value);
  const body = $('#sumItems'); body.innerHTML='';
  let total = 0;
  if(pkg && PACKAGE_PRICES[pkg]){
    const amt = PACKAGE_PRICES[pkg]; total += amt;
    body.insertAdjacentHTML('beforeend', `<tr><td>Package ${pkg}</td><td>1</td><td>${fmt(amt)}</td></tr>`);
  }
  addons.forEach(code=>{
    const amt = ADDON_PRICES[code]; if(!amt) return;
    total += amt;
    body.insertAdjacentHTML('beforeend', `<tr><td>Add-on ${code} — ${ADDON_NAMES[code]||''}</td><td>1</td><td>${fmt(amt)}</td></tr>`);
  });
  $('#sumTotal').textContent = fmt(total);
  $('#kvBg').textContent = $('select[name="background"]').value || '—';
  const student = [v('input[name="student_first"]'), v('input[name="student_last"]')].filter(Boolean).join(' ');
  $('#kvStudent').textContent = student || '—';
  const tg = [v('input[name="teacher"]'), v('input[name="grade"]')].filter(Boolean).join(' / ');
  $('#kvTG').textContent = tg || '—';
  $('#kvSchool').textContent = v('input[name="school"]') || '—';
  $('#kvParent').textContent = v('input[name="parent_name"]') || '—';
}

function clearErrors(){
  $$('#orderForm .error').forEach(el=>el.classList.remove('error'));
  $$('#orderForm .error-message').forEach(el=>el.remove());
}
function showError(el,msg){
  el.classList.add('error');
  el.insertAdjacentHTML('afterend', `<div class="error-message">${msg}</div>`);
}

document.addEventListener('input', (e)=>{
  if (e.target.closest('#orderForm')) {
    renderSummary();
    if(e.target.classList.contains('error') && e.target.value.trim()){
      e.target.classList.remove('error');
      const msg = e.target.nextElementSibling;
      if(msg && msg.classList.contains('error-message')) msg.remove();
    }
  }
});
renderSummary();

$('#orderForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  clearErrors();
  let hasErr = false;
  $$('#orderForm [required]').forEach(el=>{
    if(!el.value.trim()){
      hasErr = true;
      showError(el,'Required');
    }
  });
  if(hasErr) return;
  const pkg = $('select[name="package"]').value;
  const addons = $$('input[name="addons"]:checked').map(el=>el.value);
  const metadata = {
    package: pkg,
    addons: addons.join(', '),
    background: $('select[name="background"]').value,
    student_first: v('input[name="student_first"]'),
    student_last: v('input[name="student_last"]'),
    teacher: v('input[name="teacher"]'),
    grade: v('input[name="grade"]'),
    school: v('input[name="school"]'),
    parent_name: v('input[name="parent_name"]'),
    parent_phone: v('input[name="parent_phone"]'),
    parent_email: v('input[name="parent_email"]')
  };
  const line_items = [];
  line_items.push({
    price_data:{currency:'usd',product_data:{name:`Package ${pkg}`},unit_amount:PACKAGE_PRICES[pkg]},
    quantity:1
  });
  addons.forEach(code=>{
    const amt = ADDON_PRICES[code]; if(!amt) return;
    line_items.push({
      price_data:{currency:'usd',product_data:{name:`Add-on ${code} — ${ADDON_NAMES[code]||''}`},unit_amount:amt},
      quantity:1
    });
  });
  const email = metadata.parent_email;
  const btn = $('#checkout-button'); const orig=btn.textContent; btn.disabled=true; btn.textContent='Processing…';
  try{
    const res = await fetch('/.netlify/functions/create-checkout-session', {
      method:'POST',
      headers:{'Content-Type':'application/json','Accept':'application/json'},
      body: JSON.stringify({ line_items, email, metadata })
    });
    const json = await res.json();
    if(!res.ok){ console.error(json); alert(json?.details?.error?.message || json?.error || 'Stripe error'); btn.disabled=false; btn.textContent=orig; return; }
    if(json.url){ window.location.href=json.url; }
    else{ alert('No checkout URL returned.'); btn.disabled=false; btn.textContent=orig; }
  }catch(err){
    console.error(err);
    alert('Network error. Please try again.');
    btn.disabled=false; btn.textContent=orig;
  }
});
