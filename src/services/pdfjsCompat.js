// pdfjs-dist 6 is written against brand-new ES2026 standard-library
// helpers that virtually no browser ships yet (the Map.upsert group and
// the TypedArray hex helpers). Without these, every PDF parse dies with
// "toHex is not a function" / "getOrInsertComputed is not a function".
//
// Imported for side effects from fileParser.js. The pdf.js *worker* realm
// is patched separately: fileParser loads the worker source with ?raw,
// prepends the same polyfills, and hands pdfjs a Blob URL via
// GlobalWorkerOptions.workerSrc.

/* eslint-disable no-extend-native */

// --- Map.prototype.getOrInsert / getOrInsertComputed (ES2026 upsert) ---
if (typeof Map !== "undefined" && typeof Map.prototype.getOrInsert !== "function") {
  Object.defineProperty(Map.prototype, "getOrInsert", {
    value: function getOrInsert(key, value) {
      if (this.has(key)) return this.get(key);
      this.set(key, value);
      return value;
    },
    writable: true,
    configurable: true,
    enumerable: false,
  });
}
if (typeof Map !== "undefined" && typeof Map.prototype.getOrInsertComputed !== "function") {
  Object.defineProperty(Map.prototype, "getOrInsertComputed", {
    value: function getOrInsertComputed(key, callbackfn) {
      if (this.has(key)) return this.get(key);
      const value = callbackfn(key);
      this.set(key, value);
      return value;
    },
    writable: true,
    configurable: true,
    enumerable: false,
  });
}

// --- Uint8Array.prototype.toHex / Uint8Array.fromHex (ES2026 hex) ---
if (typeof Uint8Array !== "undefined" && typeof Uint8Array.prototype.toHex !== "function") {
  Object.defineProperty(Uint8Array.prototype, "toHex", {
    value: function toHex() {
      const TAB = "0123456789abcdef";
      let out = "";
      for (let k = 0; k < this.length; k += 1) {
        const v = this[k] & 0xff;
        out += TAB[v >>> 4] + TAB[v & 0xf];
      }
      return out;
    },
    writable: true,
    configurable: true,
    enumerable: false,
  });
}
if (typeof Uint8Array !== "undefined" && typeof Uint8Array.fromHex !== "function") {
  Object.defineProperty(Uint8Array, "fromHex", {
    value: function fromHex(string) {
      const S = String(string);
      if (S.length % 2 !== 0) throw new SyntaxError("invalid hex string length");
      if (/[^0-9a-fA-F]/.test(S)) throw new SyntaxError("invalid hex string");
      const out = new Uint8Array(S.length / 2);
      for (let k = 0; k < out.length; k += 1) out[k] = parseInt(S.slice(k * 2, k * 2 + 2), 16);
      return out;
    },
    writable: true,
    configurable: true,
    enumerable: false,
  });
}
