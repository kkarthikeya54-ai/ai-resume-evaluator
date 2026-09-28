import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);

// pdfjs-dist 6 requires brand-new ES2026 standard-library methods
// (Map.prototype.getOrInsertComputed / getOrInsert and
// Uint8Array.prototype.toHex) that current browsers don't ship. The app
// realm gets them from src/services/pdfjsCompat.js; this patch string is
// prepended to the pdf.worker bundle so the worker realm has them too —
// in both `vite dev` (middleware) and `vite build` (emitted asset).
const PDFJS_WORKER_PATCH = `
if (typeof Map !== "undefined" && !Map.prototype.getOrInsertComputed) {
  Object.defineProperty(Map.prototype, "getOrInsertComputed", {
    value: function (key, cb) { if (this.has(key)) return this.get(key); const v = cb(key); this.set(key, v); return v; },
    writable: true, configurable: true, enumerable: false,
  });
}
if (typeof Map !== "undefined" && !Map.prototype.getOrInsert) {
  Object.defineProperty(Map.prototype, "getOrInsert", {
    value: function (key, value) { if (this.has(key)) return this.get(key); this.set(key, value); return value; },
    writable: true, configurable: true, enumerable: false,
  });
}
if (typeof Uint8Array !== "undefined" && !Uint8Array.prototype.toHex) {
  Object.defineProperty(Uint8Array.prototype, "toHex", {
    value: function () {
      const TAB = "0123456789abcdef";
      let out = "";
      for (let k = 0; k < this.length; k++) { const v = this[k] & 255; out += TAB[v >>> 4] + TAB[v & 15]; }
      return out;
    },
    writable: true, configurable: true, enumerable: false,
  });
}
if (typeof Uint8Array !== "undefined" && !Uint8Array.fromHex) {
  Object.defineProperty(Uint8Array, "fromHex", {
    value: function (s) {
      if (s.length % 2) throw new SyntaxError("invalid hex string");
      if (/[^0-9a-fA-F]/.test(s)) throw new SyntaxError("invalid hex string");
      const out = new Uint8Array(s.length / 2);
      for (let k = 0; k < out.length; k++) out[k] = parseInt(s.slice(k * 2, k * 2 + 2), 16);
      return out;
    },
    writable: true, configurable: true, enumerable: false,
  });
}
`;

function pdfjsWorkerPolyfill() {
  const WORKER_RE = /pdf\.worker(\.min)?\.mjs$/;

  return {
    name: "pdfjs-worker-es2026-polyfill",
    // Dev: serve the worker file with the patch prepended. Vite serves
    // pdf.worker.min.mjs as a raw asset, so a middleware is the only hook
    // that actually sees the request.
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url || "").split("?")[0];
        if (WORKER_RE.test(url)) {
          const base = url.split("/").pop();
          let file;
          try {
            file = require.resolve(`pdfjs-dist/build/${base}`);
          } catch {
            file = undefined;
          }
          if (file) {
            res.setHeader("Content-Type", "text/javascript");
            res.end(`${PDFJS_WORKER_PATCH}\n${readFileSync(file)}`);
            return;
          }
        }
        next();
      });
    },
    // Build: patch the emitted worker asset before the bundle is finalized.
    generateBundle(_, bundle) {
      for (const fileName of Object.keys(bundle)) {
        if (WORKER_RE.test(fileName)) {
          const asset = bundle[fileName];
          const source = asset.type === "asset" ? asset.source : asset.code;
          const patched = `${PDFJS_WORKER_PATCH}\n${source}`;
          if (asset.type === "asset") asset.source = patched;
          else asset.code = patched;
        }
      }
    },
  };
}

// Dev-only auth-emulator wiring: when VITE_HIJACK_AUTH_EMULATOR is set,
// prepend a virtual import that connects the app's Firebase auth instance
// to the local emulator BEFORE config/firebase.js initializes. Used only
// for end-to-end verification runs; inert in every normal dev/build.
const authEmulatorBanner = process.env.VITE_HIJACK_AUTH_EMULATOR
  ? {
      name: "hiretire-dev-auth-emulator",
      enforce: "pre",
      transform(code, id) {
        if (!/src[\\/]config[\\/]firebase\.js$/.test(id)) return null;
        // Appended (not prepended) so `auth` is already initialized; the
        // import itself is hoisted by ESM, so tail placement is valid.
        return (
          code +
          "\nimport { connectAuthEmulatorIfRequested } from './authEmulatorDev.js';\n" +
          "if (auth) { connectAuthEmulatorIfRequested(await import('firebase/auth'), auth); }\n"
        );
      },
    }
  : null;

export default defineConfig({
  plugins: [
    ...(authEmulatorBanner ? [authEmulatorBanner] : []),
    react(),
    tailwindcss(),
    pdfjsWorkerPolyfill(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "HireTire — Placement Readiness & Recruiter Intelligence",
        short_name: "HireTire",
        description:
          "A web-based AI system that parses resumes, extracts skills and experience, compares them with job requirements, and ranks candidates automatically.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#F7FAFF",
        theme_color: "#F7FAFF",
        icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,woff2}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/__\//, /^\/api\//],
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      devOptions: { enabled: true },
    }),
  ],
});
