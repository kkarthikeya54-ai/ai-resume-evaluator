/**
 * Behavioral tests for the HR session API (worker/hr-api.js).
 *
 * Strategy: import the default export, stub globalThis.fetch so the Firebase
 * token check resolves locally, back env.HR_KV with an in-memory Map, then
 * drive the worker's fetch() with Request objects and assert the stored
 * session survives the real write paths.
 *
 * Focus: the pass-rate feature's "rejected" pipeline status — it must
 * survive PUT (session save) and PATCH (kanban drag), while unknown
 * statuses are still normalized/rejected. Regression guard: the allow-list
 * originally omitted "rejected", so every save silently reset rejected
 * candidates to "screened" and drags failed with 400.
 *
 * Run: node scripts/_hr_worker_test.mjs
 */

import assert from "node:assert/strict";
import worker from "../worker/hr-api.js";

/** In-memory Workers KV stub. */
const store = new Map();
const env = {
  FIREBASE_WEB_API_KEY: "test-key",
  FIREBASE_PROJECT_ID: "demo",
  ALLOWED_ORIGINS: "*",
  HR_KV: {
    get: async (k) => (store.has(k) ? store.get(k) : null),
    put: async (k, v) => store.set(k, v),
    delete: async (k) => store.delete(k),
  },
};

// Stub only the Identity Toolkit token verification; nothing else is network.
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if (String(url).includes("identitytoolkit")) {
    return new Response(JSON.stringify({ users: [{ localId: "uid-1" }] }), { status: 200 });
  }
  return realFetch(url, init);
};

const auth = { Authorization: "Bearer fake-token" };
const req = (path, method, body) =>
  new Request(`https://hr.test${path}`, {
    method,
    headers: { ...auth, "Content-Type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

const payload = {
  passRate: 60,
  candidates: [
    { id: "c1", status: "rejected", rejectedFrom: "screened", scores: { total: 40 } },
    { id: "c2", status: "hired", scores: { total: 95 } },
  ],
};

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

test("PUT stores rejected candidates (status + rejectedFrom + passRate) unchanged", async () => {
  const res = await worker.fetch(req("/session/s1", "PUT", { name: "S", role: "hr", payload }), env);
  assert.equal(res.status, 200, `PUT status ${res.status}`);
  const stored = JSON.parse(store.get("hr:session:uid-1:s1"));
  assert.equal(stored.payload.candidates[0].status, "rejected");
  assert.equal(stored.payload.candidates[0].rejectedFrom, "screened");
  assert.equal(stored.payload.passRate, 60);
});

test("PATCH candidate status to 'rejected' (kanban drag) is accepted", async () => {
  const res = await worker.fetch(req("/session/s1/candidate/c2", "PATCH", { status: "rejected" }), env);
  assert.equal(res.status, 200, `PATCH status ${res.status}`);
  const stored = JSON.parse(store.get("hr:session:uid-1:s1"));
  assert.equal(stored.payload.candidates.find((c) => c.id === "c2").status, "rejected");
});

test("PUT still normalizes genuinely unknown statuses to screened", async () => {
  const res = await worker.fetch(
    req("/session/s2", "PUT", {
      name: "S2",
      role: "hr",
      payload: { candidates: [{ id: "x", status: "nonsense" }] },
    }),
    env
  );
  assert.equal(res.status, 200);
  const stored = JSON.parse(store.get("hr:session:uid-1:s2"));
  assert.equal(stored.payload.candidates[0].status, "screened");
});

test("PATCH an unknown status is still rejected with 400", async () => {
  const res = await worker.fetch(req("/session/s1/candidate/c2", "PATCH", { status: "nonsense" }), env);
  assert.equal(res.status, 400, `PATCH status ${res.status}`);
  const body = await res.json();
  assert.ok(body.error.includes("rejected")); // the allowed set is listed
});

let passed = 0;
for (const [name, fn] of tests) {
  try {
    await fn();
    passed += 1;
    console.log("  PASS  " + name);
  } catch (err) {
    console.error("  FAIL  " + name);
    console.error("        " + (err?.message || err));
    process.exitCode = 1;
  }
}
console.log("\n" + passed + "/" + tests.length + " hr-api worker tests passed");
