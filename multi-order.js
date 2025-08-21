// --------- Config (edit to match your actual contents/prices) ----------
const PACKAGE_CONTENTS = {
  // Example for A based on your note; update B–E to your real contents
  A: ["1 8x10 Class Composite", "2 8x10", "2 5x7", "8 wallets", "16 mini wallets"],
  B: ["2 8x10", "4 5x7", "8 wallets", "16 mini wallets"],
  C: ["1 8x10", "4 5x7", "8 wallets"],
  D: ["1 8x10", "2 5x7", "8 wallets"],
  E: ["1 8x10"]
};
// If a package has a “*1” add-on (A1/B1/…): what it adds
const UPGRADE_CONTENT = { A1: "Digital file", B1: "Digital file", C1: "Digital file", D1: "Digital file", E1: "Digital file" };

// (Optional) pricing for Stripe summary display; fill in later if desired
const PRICES = { pkg: { A: 0, B: 0, C: 0, D: 0, E: 0 }, addon: { A1: 0, B1: 0, C1: 0, D1: 0, E1: 0 } };

// --------- State ----------
const STATE = {
  parent: { name: "", email: "", phone: "" },
  students: []
};

// Utility
const $ = (sel, root=document) => root.querySelector(sel);
const el = (tag, props={}, children=[]) => {
  const n = document.createElement(tag);
  Object.entries(props).forEach(([k,v]) => {
    if (k === "class") n.className = v;
    else if (k === "html") n.innerHTML = v;
    else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v);
  });
  children.forEach(c => n.appendChild(c));
  return n;
};

// --------- Student UI ----------
function studentTemplate(idx, data={}) {
  const s = {
    first: data.first || "",
    last: data.last || "",
    grade: data.grade || "",
    teacher: data.teacher || "",
    background: data.background || "F1",
    pkg: data.pkg || "",
    addon1: data.addon1 || false // “*1” upgrade (Digital file)
  };

  const details = el("details", { class: "student", open: true });
  const summary = el("summary");
  const left = el("div", { class: "summ-left", html: `Student ${idx+1}` });
  const right = el("div", { class: "summ-right", html: nameLabel(s) });
  summary.append(left, right);
  details.appendChild(summary);

  // Content
  const content = el("div", { class: "content" });

  // Identity row
  const row1 = el("div", { class: "row" }, [
    field("First name", "text", s.first, v => { s.first = v; STATE.students[idx] = s; right.textContent = nameLabel(s); renderSummary(); }),
    field("Last name",  "text", s.last,  v => { s.last  = v; STATE.students[idx] = s; right.textContent = nameLabel(s); renderSummary(); }),
  ]);

  // School row
  const row2 = el("div", { class: "row" }, [
    field("Grade", "text", s.grade, v => { s.grade = v; renderSummary(); }),
    field("Teacher", "text", s.teacher, v => { s.teacher = v; renderSummary(); }),
  ]);

  // Background + Package
  const bgSelect = selectField("Background", ["F1","F2","F3","F4","F5","F6"], s.background, v => { s.background = v; renderSummary(); });

  const pkgSelect = selectField("Package", ["","A","B","C","D","E"], s.pkg, v => {
    s.pkg = v;
    // enable/rename upgrade checkbox based on package
    if (upgradeBox) {
      upgradeBox.querySelector("input").disabled = !s.pkg;
      const code = s.pkg ? `${s.pkg}1` : "—";
      upgradeBox.querySelector("span").textContent = s.pkg ? `${code} — Digital file` : "Select a package to enable upgrade";
    }
    renderSummary();
  });

  const row3 = el("div", { class: "row" }, [bgSelect, pkgSelect]);

  // Add-on (package-specific *1)
  const upgradeBox = el("label", { class: "addon" });
  const upgradeInput = el("input", {
    type: "checkbox",
    onchange: e => { s.addon1 = e.target.checked; renderSummary(); }
  });
  const upgradeText = el("span", {}, []);
  upgradeBox.append(upgradeInput, upgradeText);
  // initialize addon label / disabled state
  if (s.pkg) {
    upgradeInput.disabled = false;
    upgradeText.textContent = `${s.pkg}1 — Digital file`;
  } else {
    upgradeInput.disabled = true;
    upgradeText.textContent = "Select a package to enable upgrade";
  }

  // Remove student
  const removeBtn = el("button", {
    class: "btn rm small",
    type: "button",
    onclick: () => removeStudent(idx)
  }, []);
  removeBtn.textContent = "Remove student";

  content.append(row1, row2, row3, upgradeBox, removeBtn);
  details.appendChild(content);

  // Persist to state
  STATE.students[idx] = s;
  return details;
}

function field(labelText, type, value, oninput) {
  const wrap = el("div", {}, []);
  const label = el("label", { html: labelText });
  const input = el("input", { type, value });
  input.addEventListener("input", e => oninput(e.target.value));
  wrap.append(label, input);
  return wrap;
}
function selectField(labelText, options, value, onchange) {
  const wrap = el("div", {}, []);
  const label = el("label", { html: labelText });
  const sel = el("select", {}, []);
  options.forEach(opt => sel.appendChild(el("option", { value: opt, html: opt || "Select…" })));
  sel.value = value;
  sel.addEventListener("change", e => onchange(e.target.value));
  wrap.append(label, sel);
  return wrap;
}
function nameLabel(s){ return (s.first || s.last) ? `${s.first} ${s.last}`.trim() : "New student"; }

function addStudent(prefill={}) {
  const idx = STATE.students.length;
  const node = studentTemplate(idx, prefill);
  $("#students").appendChild(node);
  // Only allow removal if >1 students
  updateRemoveButtons();
}

function removeStudent(idx){
  STATE.students.splice(idx, 1);
  // Rebuild the list with corrected numbering
  $("#students").innerHTML = "";
  STATE.students.forEach((s, i) => { const n = studentTemplate(i, s); $("#students").appendChild(n); });
  updateRemoveButtons();
  renderSummary();
}

function updateRemoveButtons(){
  const buttons = Array.from(document.querySelectorAll(".btn.rm"));
  buttons.forEach(b => b.disabled = (STATE.students.length <= 1));
  buttons.forEach(b => b.style.opacity = (STATE.students.length <= 1 ? 0.5 : 1));
}

// --------- Summary ----------
window.renderSummary = function renderSummary(){
  // Parent KV
  const pn = $('input[name="parent_name"]').value.trim();
  const pe = $('input[name="parent_email"]').value.trim();
  const pp = $('input[name="parent_phone"]').value.trim();
  $('#kvParent').textContent = pn || "—";
  $('#kvEmail').textContent  = pe || "—";
  $('#kvPhone').textContent  = pp || "—";

  // Table
  const body = $('#sumItems');
  body.innerHTML = "";
  let total = 0;

  STATE.students.forEach((s, idx) => {
    if (!s) return;
    // Main row for the package (only if selected)
    if (s.pkg) {
      const pkgPrice = PRICES.pkg[s.pkg] || 0;
      total += pkgPrice;

      const tr = el("tr", {}, [
        el("td", { html: `${s.first || "Student"} ${s.last || ""} — Package ${s.pkg}` }),
        el("td", { html: "1" }),
        el("td", { html: pkgPrice ? `$${pkgPrice.toFixed(2)}` : "—" })
      ]);
      body.appendChild(tr);

      // Subrow: show detailed contents (A + A1, etc.)
      const contents = [...(PACKAGE_CONTENTS[s.pkg] || [])];

      // Add upgrade contents if chosen
      if (s.addon1) {
        const code = `${s.pkg}1`;
        if (UPGRADE_CONTENT[code]) contents.push(UPGRADE_CONTENT[code]);
        const addPrice = PRICES.addon[code] || 0;
        total += addPrice;
        const trAdd = el("tr", { class: "subrow" }, [
          el("td", { class: "sub", html: `<strong>${code}</strong> — ${UPGRADE_CONTENT[code] || ""}` }),
          el("td", { class: "sub", html: "" }),
          el("td", { class: "sub", html: addPrice ? `$${addPrice.toFixed(2)}` : "—" })
        ]);
        body.appendChild(trAdd);
      }

      // Show package contents line (always)
      if (contents.length){
        const trSub = el("tr", { class: "subrow" }, [
          el("td", { class: "sub", html: contents.join(", ") }),
          el("td", { class: "sub", html: "" }),
          el("td", { class: "sub", html: "" })
        ]);
        body.appendChild(trSub);
      }

      // Optional: show background
      const trBg = el("tr", { class: "subrow" }, [
        el("td", { class: "sub", html: `Background: ${s.background || "F1"}` }),
        el("td", { class: "sub", html: "" }),
        el("td", { class: "sub", html: "" })
      ]);
      body.appendChild(trBg);
    }
  });

  $('#sumTotal').textContent = `$${total.toFixed(2)}`;
};

// --------- Init & events ----------
document.addEventListener("DOMContentLoaded", () => {
  // Hook parent inputs into state so summary updates instantly
  $('input[name="parent_name"]').addEventListener('input', () => renderSummary());
  $('input[name="parent_email"]').addEventListener('input', () => renderSummary());
  $('input[name="parent_phone"]').addEventListener('input', () => renderSummary());

  // Default: 1 student
  addStudent({ background: "F1" });

  // “Add another student”
  const addBtn = document.getElementById('addStudent');
  addBtn.addEventListener('click', () => addStudent({ background: "F1" }));

  // Form submit (wire to your Netlify Function / Stripe later)
  document.getElementById('multiForm').addEventListener('submit', (e) => {
    e.preventDefault();
    // client-side required check
    const missingPkg = STATE.students.findIndex(s => !s.pkg);
    if (!STATE.parent?.email && !$('input[name="parent_email"]').value) {
      alert("Please enter a parent email.");
      return;
    }
    if (missingPkg !== -1) {
      alert(`Student ${missingPkg+1}: please select a package.`);
      return;
    }
    // TODO: call your /api/create-checkout-session here with STATE
    console.log("Payload ready:", { parent: {
      name: $('input[name="parent_name"]').value.trim(),
      email: $('input[name="parent_email"]').value.trim(),
      phone: $('input[name="parent_phone"]').value.trim(),
    }, students: STATE.students });
    alert("Test mode: checkout call not wired in this QA build.");
  });

  renderSummary();
});
