/**
 * HireTire — UI Regression Sweep (paste into DevTools console on any route).
 *
 * Checks every visible interactive surface for the two bug classes that
 * shipped before: invisible text (white-on-white after the blue/white
 * retheme) and broken hover states. Results are also logged as a table
 * and exposed on window.__sweepResults.
 *
 * Usage:
 *   1. Open any app page (landing, /hr, /app, /account, ...).
 *   2. Paste this whole file into the DevTools console and press Enter.
 *   3. Read the summary: pass = every visible surface ≥ MIN_CONTRAST.
 *
 * Exit code convention for automation: window.__sweepResults.failed === 0
 */
(() => {
  const MIN_CONTRAST = 3.0; // WCAG AA for large/UI text (body text standard is 4.5)

  const results = [];
  const push = (name, status, detail) =>
    results.push({ name, status, detail });

  /* ---------- color math ---------- */
  const srgbGamma = (c) => {
    const v = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    return Math.round(Math.max(0, Math.min(1, v)) * 255);
  };

  /** oklch/oklab -> sRGB (Tailwind v4 emits oklch everywhere). */
  const oklchToRgb = (L, C, H, alpha) => {
    const rad = (H * Math.PI) / 180;
    const a = C * Math.cos(rad);
    const b = C * Math.sin(rad);
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.291485548 * b;
    const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
    let r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    let g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    let bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
    return { r: srgbGamma(r), g: srgbGamma(g), b: srgbGamma(bl), a: alpha };
  };

  const parseColor = (value) => {
    if (!value) return null;
    value = value.trim();
    let m = value.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
    if (m) {
      const a = m[4] === undefined ? 1 : parseFloat(m[4]);
      return { r: +m[1], g: +m[2], b: +m[3], a };
    }
    m = value.match(/^#([0-9a-f]{6})$/i);
    if (m) {
      const h = m[1];
      return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: 1 };
    }
    m = value.match(/^oklch\(([\d.]+)(?:%|)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)$/i);
    if (m) {
      const L = +m[1] > 1 ? +m[1] / 100 : +m[1];
      const alpha = m[4] === undefined ? 1 : parseFloat(m[4]);
      return oklchToRgb(L, +m[2], +m[3], alpha);
    }
    m = value.match(/^oklab\(([\d.]+)(?:%|)\s+(-?[\d.]+)\s+(-?[\d.]+)(?:\s*\/\s*([\d.]+))?\)$/i);
    if (m) {
      const L = +m[1] > 1 ? +m[1] / 100 : +m[1];
      const alpha = m[4] === undefined ? 1 : parseFloat(m[4]);
      return oklchToRgb(L, Math.hypot(+m[2], +m[3]), (Math.atan2(+m[3], +m[2]) * 180) / Math.PI, alpha);
    }
    /* Tailwind v4 emits color-mix() for opacity-modified utilities:
     * color-mix(in oklab|srgb, <color> N%, transparent). */
    m = value.match(/^color-mix\(in\s+(?:srgb|oklab),\s*(.+?)\s+([\d.]+)%,\s*transparent\)$/i);
    if (m) {
      const inner = parseColor(m[1].trim());
      if (inner) return { ...inner, a: inner.a * (+m[2] / 100) };
    }
    return null;
  };

  const relLum = ({ r, g, b }) => {
    const f = (c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };

  const contrast = (fg, bg) => {
    if (!fg || !bg) return null;
    const L1 = relLum(fg);
    const L2 = relLum(bg);
    return Math.round(((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)) * 100) / 100;
  };

  /** Alpha-composite a color over a backdrop. */
  const over = (fg, bg) => {
    if (!fg || !bg) return null;
    if (fg.a >= 1) return fg;
    return {
      r: Math.round(fg.r * fg.a + bg.r * (1 - fg.a)),
      g: Math.round(fg.g * fg.a + bg.g * (1 - fg.a)),
      b: Math.round(fg.b * fg.a + bg.b * (1 - fg.a)),
      a: 1,
    };
  };

  /** Active-pill probe: an absolutely-positioned child/sibling paints the
   * direct backdrop of the text (ViewSwitch segmented control). Runs before
   * the ancestor walk because a translucent card between them would mask it. */
  const findPillLayer = (el) => {
    const candidates = [...(el.children || [])];
    if (el.previousElementSibling) candidates.push(el.previousElementSibling);
    if (el.parentElement) candidates.push(...el.parentElement.children);
    for (const sib of candidates) {
      if (!sib || sib === el) continue;
      const cls = typeof sib.className === "string" ? sib.className : "";
      if (!cls.includes("absolute")) continue;
      const s = getComputedStyle(sib);
      let c = parseColor(s.backgroundColor);
      if ((!c || c.a === 0) && s.backgroundImage.includes("gradient")) {
        const stops = [...s.backgroundImage.matchAll(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/g)];
        if (stops.length) {
          const n = stops.length;
          c = stops.reduce(
            (acc, st) => ({
              r: acc.r + +st[1],
              g: acc.g + +st[2],
              b: acc.b + +st[3],
              a: acc.a + (st[4] === undefined ? 1 : +st[4]),
            }),
            { r: 0, g: 0, b: 0, a: 0 }
          );
          c = { r: c.r / n, g: c.g / n, b: c.b / n, a: c.a / n };
        }
      }
      if (c && c.a > 0) return c;
    }
    return null;
  };

  /** Walk up ancestors to the first opaque background color.
   * Tailwind gradient pills use background-image, so also accept a solid
   * average of gradient stops via getComputedStyle backgroundImage when
   * backgroundColor is transparent. */
  const effectiveBg = (el) => {
    let node = el;
    let layers = [];
    const pill = findPillLayer(el);
    if (pill) {
      layers.push(pill);
      if (pill.a >= 1) node = null; // opaque pill fully covers its ancestors
    }
    while (node && node !== document.documentElement) {
      const s = getComputedStyle(node);
      let c = parseColor(s.backgroundColor);
      if ((!c || c.a === 0) && s.backgroundImage && s.backgroundImage.includes("gradient")) {
        // Average all rgb stops in the gradient string.
        const stops = [...s.backgroundImage.matchAll(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/g)];
        if (stops.length) {
          const n = stops.length;
          const avg = stops.reduce(
            (acc, st) => ({
              r: acc.r + +st[1],
              g: acc.g + +st[2],
              b: acc.b + +st[3],
              a: acc.a + (st[4] === undefined ? 1 : +st[4]),
            }),
            { r: 0, g: 0, b: 0, a: 0 }
          );
          c = { r: avg.r / n, g: avg.g / n, b: avg.b / n, a: avg.a / n };
        }
      }
      if (c && c.a > 0) {
        layers.push(c);
        if (c.a >= 1) break;
      }
      node = node.parentElement;
    }
    let acc = { r: 255, g: 255, b: 255, a: 1 }; // page base
    for (let i = layers.length - 1; i >= 0; i -= 1) {
      acc = over(layers[i], acc);
    }
    return acc;
  };

  /* Gradient text (bg-clip-text) is painted FROM its background-image, so
   * computed `color` is transparent — always a false "invisible" hit.
   * Detect via computed background-clip (covers .ht-gilt and Tailwind's
   * bg-clip-text alike). */
  const isClipText = (el) => {
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.webkitBackgroundClip === "text" || s.backgroundClip === "text") return true;
      const cls = typeof n.className === "string" ? n.className : "";
      if (cls.includes("bg-clip-text")) return true;
    }
    return false;
  };

  /* ---------- hover rule extraction ---------- */
  const hoverRules = [];
  const walkRules = (ruleList) => {
    for (const rule of ruleList) {
      if (rule.selectorText && rule.selectorText.includes(":hover")) {
        hoverRules.push(rule);
      }
      if (rule.cssRules && rule.cssRules.length) walkRules(rule.cssRules);
    }
  };
  for (const sheet of document.styleSheets) {
    try { walkRules(sheet.cssRules); } catch { /* cross-origin */ }
  }

  const elClasses = (el) => new Set((el.getAttribute("class") || "").split(/\s+/).filter(Boolean));

  const hoverDeclarationsFor = (el) => {
    const decls = [];
    const classes = elClasses(el);
    const hoverClassNames = [...classes].filter((c) => c.startsWith("hover:"));
    // Tailwind v4 utilities: match a hover rule per `hover:` class on the element.
    for (const rule of hoverRules) {
      const parts = rule.selectorText.split(",").map((s) => s.trim());
      const matched = parts.some((sel) => {
        const base = sel.replace(/^\s*\.hover\\?:/, "hover:").replace(/:hover$/, "");
        return classes.has(base) || (sel.startsWith(".") && el.matches(safeSelector(sel)));
      });
      if (!matched) continue;
      for (const prop of ["color", "background-color", "border-color"]) {
        const v = rule.style.getPropertyValue(prop);
        if (v) decls.push([prop, v.trim()]);
      }
    }
    if (hoverClassNames.length && decls.length === 0) {
      // Fallback: any rule whose selector mentions one of the hover classes
      // AND that applies unconditionally to this element (no ancestor scope
      // like `.dark ...` which would grab wrong-scope declarations).
      for (const rule of hoverRules) {
        const sel = rule.selectorText || "";
        if (sel.includes(" ") && !sel.includes(":hover")) continue;
        const scoped = sel.split(",").every((s) => s.trim().split(/\s+>|\s+/).filter(Boolean).length > 1 && !s.trim().split(/\s+>|\s+/).every((p) => p.includes(":hover")));
        if (scoped) continue;
        if (hoverClassNames.some((c) => sel.includes(c.replace(/[:\[\]()/]/g, (m) => "\\" + m)))) {
          for (const prop of ["color", "background-color", "border-color"]) {
            const v = rule.style.getPropertyValue(prop);
            if (v) decls.push([prop, v.trim()]);
          }
        }
      }
    }
    return decls;
  };

  const safeSelector = (sel) => {
    try { return sel; } catch { return ""; }
  };

  const rootStyle = getComputedStyle(document.documentElement);
  const cssVar = (name) => (rootStyle.getPropertyValue(name) || "").trim();
  const resolveValue = (v) => {
    let out = v, guard = 0;
    while (out.includes("var(") && guard < 6) {
      out = out.replace(/var\((--[^,)]+)(?:,\s*([^)]*))?\)/g, (m, name, fb) => cssVar(name) || (fb || "").trim() || "transparent");
      guard += 1;
    }
    return out.trim();
  };

  /* ---------- surface detection ---------- */
  const isVisible = (el) => {
    if (!el.isConnected) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    const s = getComputedStyle(el);
    if (s.visibility === "hidden" || s.display === "none" || +s.opacity < 0.05) return false;
    // must not be covered by a modal backdrop check — fine, if visible we test it
    return true;
  };

  const labelOf = (el) =>
    (el.getAttribute("aria-label") || el.textContent || el.value || el.getAttribute("title") || "(unnamed)")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 48);

  const paintRatio = (el, decls) => {
    const bg = effectiveBg(el);
    let fg = parseColor(getComputedStyle(el).color);
    let bgFinal = bg;
    for (const [prop, value] of decls) {
      const resolved = resolveValue(value);
      const c = parseColor(resolved);
      if (!c) continue;
      if (prop === "color") fg = c;
      if (prop === "background-color") bgFinal = c.a < 1 ? over(c, bg) : c;
    }
    return { ratio: contrast(fg, bgFinal), fg, bg: bgFinal };
  };

  /* ---------- sweep all buttons/links ---------- */
  const interactive = [
    ...document.querySelectorAll("button, a[href], [role=button], input[type=submit]"),
  ].filter(isVisible);

  let hoverChecked = 0;
  for (const el of interactive) {
    if (isClipText(el)) continue;
    if (el.disabled) continue; // WCAG 1.4.3 exempts disabled controls
    const label = labelOf(el);
    // Resting state
    const restFg = parseColor(getComputedStyle(el).color);
    const restBg = effectiveBg(el);
    const restRatio = contrast(restFg, restBg);
    if (restRatio !== null && restRatio < MIN_CONTRAST) {
      push(`${label} — resting`, "FAIL", `contrast ${restRatio}:1 (< ${MIN_CONTRAST})`);
    }

    // Hover state: only when the element has hover declarations
    const decls = hoverDeclarationsFor(el);
    if (decls.length) {
      hoverChecked += 1;
      const { ratio } = paintRatio(el, decls);
      if (ratio !== null && ratio < MIN_CONTRAST) {
        push(`${label} — hover`, "FAIL", `contrast ${ratio}:1 (< ${MIN_CONTRAST})`);
      }
    }
  }

  /* ---------- text on cards: catch white-on-white not on a button ---------- */
  const cardText = [
    ...document.querySelectorAll("h1,h2,h3,h4,p,span,td,li"),
  ].filter((el) => {
    if (!isVisible(el) || el.children.length > 0) return false;
    const text = el.textContent.trim();
    if (text.length < 2) return false;
    return true;
  });
  for (const el of cardText) {
    if (isClipText(el)) continue; // gradient-painted text: color is transparent by design
    const fg = parseColor(getComputedStyle(el).color);
    const bg = effectiveBg(el);
    const ratio = contrast(fg, bg);
    if (ratio !== null && ratio < MIN_CONTRAST) {
      push(`text "${el.textContent.trim().slice(0, 32)}"`, "FAIL", `contrast ${ratio}:1`);
    }
  }

  /* ---------- summary ---------- */
  const failed = results.filter((r) => r.status === "FAIL");
  const summary = {
    page: location.pathname + location.search,
    interactiveChecked: interactive.length,
    hoverStatesChecked: hoverChecked,
    textNodesChecked: cardText.length,
    failed: failed.length,
    failures: failed,
  };
  window.__sweepResults = { summary, results };

  console.log(
    `%c[HireTire sweep] ${summary.failed === 0 ? "PASS" : "FAIL"} — ${summary.interactiveChecked} interactive, ${summary.hoverStatesChecked} hover states, ${summary.textNodesChecked} text nodes, ${failed.length} failures`,
    `color:${failed.length ? "#dc2626" : "#16a34a"};font-weight:bold`
  );
  if (failed.length) console.table(failed);
  return summary;
})();
