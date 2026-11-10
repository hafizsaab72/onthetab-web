// Read-only group page: https://xeca-ai.tech/onthetab/g?t=<token>
//
// Reads get_public_group(token) from Supabase with the public anon key
// (config.js). The server returns first names, balances, the settle plan and
// up to 200 recent expenses, nothing else. Every piece of text from the server
// goes in with textContent; nothing is parsed as HTML.
(function () {
  "use strict";

  const config = window.OTT_CONFIG || {};
  const root = document.querySelector("[data-root]");
  const TOKEN = /^[A-Za-z0-9_-]{22}$/;
  const FIRST_EXPENSES = 5;
  const ZERO_DECIMAL = new Set(["JPY", "KRW", "VND", "IDR", "CLP", "COP", "HUF", "BDT", "LBP"]);
  const appUrl = typeof config.appUrl === "string" && /^(\.\/|\/|https:\/\/)/.test(config.appUrl) ? config.appUrl : "./";

  document.querySelectorAll("[data-app-link]").forEach((a) => a.setAttribute("href", appUrl));

  // ── Small DOM helpers (text only) ──────────────────────────────────────────
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = String(text);
    return node;
  }
  function add(parent, ...children) {
    for (const child of children) if (child) parent.appendChild(child);
    return parent;
  }
  function show(...nodes) {
    root.replaceChildren(...nodes.filter(Boolean));
  }

  // ── Formatting ─────────────────────────────────────────────────────────────
  function money(minor, currency) {
    const code = /^[A-Z]{3}$/.test(String(currency)) ? String(currency) : "USD";
    const major = ZERO_DECIMAL.has(code) ? Number(minor) : Number(minor) / 100;
    const whole = Number.isInteger(major);
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: code,
        minimumFractionDigits: whole ? 0 : 2,
        maximumFractionDigits: ZERO_DECIMAL.has(code) ? 0 : 2,
      }).format(Math.abs(major));
    } catch (_) {
      return `${code} ${Math.abs(major).toFixed(ZERO_DECIMAL.has(code) ? 0 : 2)}`;
    }
  }

  function shortDate(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const opts = { day: "numeric", month: "short" };
    if (d.getFullYear() !== new Date().getFullYear()) opts.year = "numeric";
    return d.toLocaleDateString("en-GB", opts);
  }

  function updatedAgo(iso) {
    const t = Date.parse(iso);
    if (!Number.isFinite(t)) return "";
    const mins = Math.max(0, Math.round((Date.now() - t) / 60000));
    if (mins < 1) return "updated just now";
    if (mins <= 10) return "updated a few minutes ago";
    if (mins < 60) return `updated ${mins} minutes ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return hours === 1 ? "updated an hour ago" : `updated ${hours} hours ago`;
    return `updated on ${shortDate(iso)}`;
  }

  function people(n) {
    return n === 1 ? "1 person" : `${n} people`;
  }

  // ── States ─────────────────────────────────────────────────────────────────
  function linkIcon(off) {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("width", "28");
    svg.setAttribute("height", "28");
    svg.setAttribute("viewBox", "0 0 26 26");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.8");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("aria-hidden", "true");
    const paths = ["M11 15a5 5 0 0 0 7 0l4-4a5 5 0 0 0-7-7l-1.5 1.5", "M15 11a5 5 0 0 0-7 0l-4 4a5 5 0 0 0 7 7l1.5-1.5"];
    if (off) paths.push("M4 4l18 18");
    for (const d of paths) {
      const p = document.createElementNS(ns, "path");
      p.setAttribute("d", d);
      svg.appendChild(p);
    }
    return svg;
  }

  function getAppButton() {
    const a = el("a", "g-pill g-pill-lg", "Get OnTheTab");
    a.setAttribute("href", appUrl);
    return a;
  }

  function message(title, body, { off = false, retry = null } = {}) {
    const box = el("section", "g-message");
    const icon = add(el("div", "g-icon"), linkIcon(off));
    const h1 = el("h1", "g-disp", title);
    add(box, icon, h1, el("p", null, body));
    if (retry) {
      const b = el("button", "g-pill g-pill-lg", "Try again");
      b.type = "button";
      b.addEventListener("click", retry);
      add(box, b);
    } else {
      add(box, getAppButton());
    }
    document.title = `${title} — OnTheTab`;
    show(box);
  }

  const turnedOff = () =>
    message(
      "This link was turned off",
      "Whoever shared it stopped sharing this group. Ask them for a new link, or get OnTheTab to see your groups yourself.",
      { off: true },
    );
  const notFound = () =>
    message("We couldn't find this group", "Check the link, or ask whoever shared it for a new one.", { off: true });

  // ── The group ──────────────────────────────────────────────────────────────
  function section(title, ...children) {
    const s = el("section", "g-section");
    add(s, el("h2", "g-disp", title), ...children);
    return s;
  }

  function row(left, right) {
    return add(el("div", "g-li"), left, right);
  }

  function balanceRow(b, currency) {
    const name = el("span", null, b.member ? b.name : `${b.name} (left)`);
    const net = Number(b.net) || 0;
    const right = el("span", "g-right");
    if (net === 0) {
      add(right, el("span", "g-muted", "settled up"));
    } else {
      const tone = net > 0 ? "g-owed" : "g-owe";
      add(right, el("span", `g-word ${tone}`, net > 0 ? "is owed" : "owes"), el("span", `g-num ${tone}`, money(net, currency)));
    }
    return row(name, right);
  }

  function expenseRow(e) {
    const left = el("span", "g-stack");
    const payer = e.payer_count > 1 ? `${e.payer} + ${e.payer_count - 1}` : e.payer;
    const when = shortDate(e.occurred_at);
    add(left, el("span", "g-title", e.title), el("span", "g-sub", [when, `${payer || "Someone"} paid`].filter(Boolean).join(" · ")));
    return row(left, el("span", "g-num", money(e.amount, e.currency)));
  }

  function render(g) {
    const currency = g.currency;
    const sharedBy = g.shared_by || "Someone";
    document.title = `${g.name} — OnTheTab`;

    const head = el("div", "g-top");
    const memberCount = Array.isArray(g.members) ? g.members.length : 0;
    const meta = [people(memberCount), `${money(g.total_spent || 0, currency)} spent`, updatedAgo(g.updated_at)].filter(Boolean);
    add(
      head,
      el("span", "g-eyebrow", `Read-only · shared by ${sharedBy}`),
      el("h1", "g-disp g-name", g.name),
      el("span", "g-meta", meta.join(" · ")),
    );

    const balances = add(el("div", "g-card"), ...(g.balances || []).map((b) => balanceRow(b, currency)));

    const planRows = (g.plan || []).map((p) => row(el("span", null, `${p.from} pays ${p.to}`), el("span", "g-num", money(p.amount, currency))));
    const plan = planRows.length
      ? add(el("div", "g-card"), ...planRows)
      : add(el("div", "g-card"), row(el("span", "g-muted", "Everyone is settled up."), null));

    const expenses = Array.isArray(g.expenses) ? g.expenses : [];
    const total = Number(g.expense_count) || expenses.length;
    const list = el("div", "g-card");
    const fill = (n) => list.replaceChildren(...expenses.slice(0, n).map(expenseRow));
    const recent = section("Recent expenses");
    if (expenses.length === 0) {
      add(list, row(el("span", "g-muted", "No expenses yet."), null));
      add(recent, list);
    } else {
      fill(FIRST_EXPENSES);
      add(recent, list);
      if (expenses.length > FIRST_EXPENSES) {
        const more = el("button", "g-link", `Show all ${total} expenses`);
        more.type = "button";
        more.addEventListener("click", () => {
          fill(expenses.length);
          more.remove();
          if (total > expenses.length) add(recent, el("p", "g-note", `Showing the last ${expenses.length} of ${total} expenses.`));
        });
        add(recent, more);
      }
    }

    const banner = el("div", "g-banner");
    add(
      banner,
      el("span", "g-disp g-banner-title", "In this group?"),
      el("span", "g-soft", `Get OnTheTab to add expenses and settle up. Ask ${sharedBy} to add you once you're in.`),
      getAppButton(),
    );

    const note = el(
      "p",
      "g-note",
      `Only first names are shown here. No emails, photos, receipts or notes. ${sharedBy} can turn this link off at any time.`,
    );

    show(head, section("Balances", balances), section("To settle up", plan), recent, banner, note);
  }

  // ── Load ───────────────────────────────────────────────────────────────────
  async function load() {
    const token = new URLSearchParams(window.location.search).get("t") || "";
    if (!TOKEN.test(token)) return notFound();
    const url = String(config.supabaseUrl || "").replace(/\/+$/, "");
    const key = String(config.supabaseAnonKey || "");
    if (!/^https?:\/\//.test(url) || !key || key.startsWith("PASTE_")) {
      return message("This page isn't set up yet", "The site is missing its connection settings. Try again later.", { off: true });
    }

    show(el("p", "g-loading", "Loading the group…"));
    let data;
    try {
      const res = await fetch(`${url}/rest/v1/rpc/get_public_group`, {
        method: "POST",
        headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ p_token: token }),
        cache: "no-store",
        referrerPolicy: "no-referrer",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      data = await res.json();
    } catch (_) {
      return message("We couldn't load this group", "Check your connection and try again.", { retry: load });
    }

    if (!data || typeof data !== "object") return notFound();
    if (data.revoked) return turnedOff();
    render(data);
  }

  load();
})();
