/**
 * Behavioral tests for the multi-provider AI proxy (worker/ai-proxy.js).
 *
 * Strategy: import the default export, stub globalThis.fetch to simulate
 * provider behavior (quota errors, auth errors, success), then drive the
 * worker's fetch() with Request objects and assert status/shape/routing.
 * Run: node scripts/_worker_test.mjs
 */

import assert from "node:assert/strict";
import worker from "../worker/ai-proxy.js";

/** Install a stub fetch that returns scripted responses per call. */
function stubFetch(script) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    const next = script.shift();
    if (!next) throw new Error("unexpected extra fetch call");
    return next();
  };
  return calls;
}

function makeRequest(body) {
  return new Request("https://proxy.test/", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const env = { GEMINI_API_KEY: "gem-key", NVIDIA_API_KEY: "nv-key" };

function geminiOk(text) {
  return new Response(
    JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }),
    { status: 200 }
  );
}
function nvidiaOk(text) {
  return new Response(
    JSON.stringify({ choices: [{ message: { content: text } }] }),
    { status: 200 }
  );
}

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

test("gemini success returns provider gemini, parses JSON", async () => {
  stubFetch([() => geminiOk('{"score": 82}')]);
  const res = await worker.fetch(makeRequest({ prompt: "p", json: true }), env);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body, { result: { score: 82 }, provider: "gemini" });
});

test("falls back to nvidia on gemini 429", async () => {
  const calls = stubFetch([
    () => new Response(JSON.stringify({ error: { message: "quota exceeded" } }), { status: 429 }),
    () => nvidiaOk('{"score": 41}'),
  ]);
  const res = await worker.fetch(makeRequest({ prompt: "p", json: true }), env);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.provider, "nvidia");
  assert.deepEqual(body.result, { score: 41 });
  assert.equal(calls.length, 2);
  assert.ok(calls[0].url.includes("generativelanguage"));
  assert.ok(calls[1].url.includes("nvidia"));
});

test("falls back on gemini empty content (safety block)", async () => {
  stubFetch([
    () => new Response(JSON.stringify({ candidates: [] }), { status: 200 }),
    () => nvidiaOk("plain answer"),
  ]);
  const res = await worker.fetch(makeRequest({ prompt: "p", json: false }), env);
  const body = await res.json();
  assert.equal(body.provider, "nvidia");
  assert.equal(body.result, "plain answer");
});

test("provider:'nvidia' flips the chain (nvidia first)", async () => {
  const calls = stubFetch([() => nvidiaOk('{"a":1}')]);
  const res = await worker.fetch(makeRequest({ prompt: "p", json: true, provider: "nvidia" }), env);
  const body = await res.json();
  assert.equal(body.provider, "nvidia");
  assert.equal(calls.length, 1); // gemini never called
});

test("nvidia 429 falls back forward to gemini", async () => {
  stubFetch([
    () => new Response(JSON.stringify({ error: { message: "rate limited" } }), { status: 429 }),
    () => geminiOk('{"b":2}'),
  ]);
  const res = await worker.fetch(
    makeRequest({ prompt: "p", json: true, provider: "nvidia" }),
    env
  );
  const body = await res.json();
  assert.equal(body.provider, "gemini");
  assert.deepEqual(body.result, { b: 2 });
});

test("missing gemini key drops it from the chain without a fetch", async () => {
  const calls = stubFetch([() => nvidiaOk('{"c":3}')]);
  const res = await worker.fetch(
    makeRequest({ prompt: "p", json: true }),
    { NVIDIA_API_KEY: "nv-key" }
  );
  const body = await res.json();
  assert.equal(body.provider, "nvidia");
  assert.equal(calls.length, 1);
});

test("both providers 429 -> mirrored 429 with joined reasons", async () => {
  stubFetch([
    () => new Response(JSON.stringify({ error: { message: "x" } }), { status: 429 }),
    () => new Response(JSON.stringify({ error: { message: "y" } }), { status: 429 }),
  ]);
  const res = await worker.fetch(makeRequest({ prompt: "p", json: true }), env);
  assert.equal(res.status, 429);
  const body = await res.json();
  assert.ok(body.error.includes("Gemini 429"));
  assert.ok(body.error.includes("NVIDIA 429"));
});

test("both providers 401 (auth) -> 502, not 429", async () => {
  stubFetch([
    () => new Response(JSON.stringify({ error: { message: "bad key" } }), { status: 401 }),
    () => new Response(JSON.stringify({ error: { message: "bad key" } }), { status: 401 }),
  ]);
  const res = await worker.fetch(makeRequest({ prompt: "p", json: true }), env);
  assert.equal(res.status, 502);
});

test("gemini success with fenced json extracts the payload", async () => {
  stubFetch([() => geminiOk('```json\n{"wrapped": true}\n```')]);
  const res = await worker.fetch(makeRequest({ prompt: "p", json: true }), env);
  const body = await res.json();
  assert.deepEqual(body.result, { wrapped: true });
});

test("missing prompt -> 400 without calling any provider", async () => {
  const calls = stubFetch([]);
  const res = await worker.fetch(makeRequest({ json: true }), env);
  assert.equal(res.status, 400);
  assert.equal(calls.length, 0);
});

test("OPTIONS preflight returns CORS headers", async () => {
  globalThis.fetch = async () => {
    throw new Error("fetch must not be called for OPTIONS");
  };
  const res = await worker.fetch(new Request("https://proxy.test/", { method: "OPTIONS" }), env);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Access-Control-Allow-Origin"), "*");
  assert.equal(res.headers.get("Access-Control-Allow-Methods"), "POST, OPTIONS");
});

test("nvidia success used verbatim when json:false (copilot path)", async () => {
  stubFetch([() => geminiOk("Plain markdown *answer* for the recruiter.")]);
  const res = await worker.fetch(makeRequest({ prompt: "p", json: false }), env);
  const body = await res.json();
  assert.equal(body.result, "Plain markdown *answer* for the recruiter.");
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
console.log("\n" + passed + "/" + tests.length + " worker tests passed");
