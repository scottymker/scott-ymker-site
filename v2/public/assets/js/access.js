const form = document.querySelector("#code-form");
const input = document.querySelector("#code-input");
const errorEl = document.querySelector("#error");
const result = document.querySelector("#result");
const hero = document.querySelector("#hero");
const nameEl = document.querySelector("#student-name");
const metaEl = document.querySelector("#student-meta");
const orderLink = document.querySelector("#order-link");
const dlBtn = document.querySelector("#download-btn");
const claimNote = document.querySelector("#claim-note");

let state = { code: null, imageFile: "1.jpg", claimed: null, student: null };

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.hidden = true;
  result.hidden = true;

  const code = input.value.trim().toUpperCase();
  if (!/^[A-Z0-9]{5,8}$/.test(code)) {
    errorEl.textContent = "Please enter a valid code.";
    errorEl.hidden = false;
    return;
  }

  const r = await fetch(`/api/login?code=${encodeURIComponent(code)}`);
  if (!r.ok) {
    errorEl.textContent = "Code not found. Double-check the characters and try again.";
    errorEl.hidden = false;
    return;
  }

  const data = await r.json();
  state.code = code;
  state.student = data.student || {};
  const firstImage = (data.images && data.images[0]) || { url: `/proofs/${code}/1.jpg`, file: "1.jpg" };
  state.imageFile = firstImage.file;
  state.claimed = data.claimed || null;

  hero.src = firstImage.url;
  nameEl.textContent = `${state.student.firstName ?? ""} ${state.student.lastName ?? ""}`.trim() || `Code ${code}`;
  metaEl.textContent = [state.student.grade && `Grade ${state.student.grade}`, state.student.teacher].filter(Boolean).join(" • ");

  orderLink.href = `/order.html?code=${encodeURIComponent(code)}`;

  if (state.claimed?.used) {
    claimNote.textContent = `Free download already claimed for ${state.claimed.image}. You can re-download the same image.`;
  } else {
    claimNote.textContent = `You can download one social-size image for free.`;
  }

  result.hidden = false;
});

dlBtn.addEventListener("click", () => {
  if (!state.code) return;
  const u = `/api/free-download?code=${encodeURIComponent(state.code)}&image=${encodeURIComponent(state.imageFile)}`;
  window.location.href = u;
});
