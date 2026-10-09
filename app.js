const menuBtn = document.querySelector("[data-menu]");
const overlay = document.querySelector("[data-overlay]");
const form = document.querySelector("[data-waitlist]");
const status = document.querySelector("[data-status]");

function setMenu(open) {
  if (!menuBtn || !overlay) return;
  menuBtn.setAttribute("aria-expanded", String(open));
  overlay.classList.toggle("open", open);
  document.body.style.overflow = open ? "hidden" : "";
}

menuBtn?.addEventListener("click", () => {
  setMenu(menuBtn.getAttribute("aria-expanded") !== "true");
});

overlay?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => setMenu(false));
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setMenu(false);
});

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const email = String(new FormData(form).get("email") || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    if (status) {
      status.dataset.tone = "err";
      status.textContent = "Enter a valid email so we can write back.";
    }
    return;
  }

  const subject = encodeURIComponent("OnTheTab launch list");
  const body = encodeURIComponent(`Please add ${email} to the OnTheTab launch list.`);
  window.location.href = `mailto:hello@onthetab.in?subject=${subject}&body=${body}`;

  if (status) {
    status.dataset.tone = "ok";
    status.textContent = "Thanks. Your mail app should open with the request ready to send.";
  }
  form.reset();
});
