/**
 * Deploys the AI proxy worker to Cloudflare using the dashboard-cookie
 * auth flow (no wrangler login required).
 *
 * The worker source is read from ai-proxy.js at deploy time — this script
 * never embeds worker code, so it can never deploy a stale copy.
 *
 * Usage: node deploy.js
 * Requires the CF cookie in %TEMP%/cf-cookie.txt (copy it from the
 * dashboard's network tab after logging in).
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

const WORKER_SOURCE = fs.readFileSync(path.join(__dirname, "ai-proxy.js"), "utf8");

const ACCOUNT_ID = "73413827ea1350d43ca3cef688630383";
const SCRIPT_NAME = "nvidia-proxy";

// Read cookie from file
const cookieFile = "C:\\Users\\mail4\\AppData\\Local\\Temp\\cf-cookie.txt";
let cookieStr = "";
try {
  cookieStr = fs.readFileSync(cookieFile, "utf8").trim();
} catch (e) {
  console.log("No cookie file found at", cookieFile);
  console.log("Error:", e.message);
  process.exit(1);
}

const metadata = JSON.stringify({ main_module: "worker.js", compatibility_date: "2024-01-01" });
const boundary = "----FormBoundary" + Math.random().toString(36).slice(2);

let body = "";
body += "--" + boundary + "\r\n";
body += 'Content-Disposition: form-data; name="metadata"\r\n';
body += "Content-Type: application/json\r\n\r\n";
body += metadata + "\r\n";
body += "--" + boundary + "\r\n";
body += 'Content-Disposition: form-data; name="worker.js"; filename="worker.js"\r\n';
body += "Content-Type: application/javascript+module\r\n\r\n";
body += WORKER_SOURCE + "\r\n";
body += "--" + boundary + "--\r\n";

const options = {
  hostname: "api.cloudflare.com",
  path: "/client/v4/accounts/" + ACCOUNT_ID + "/workers/scripts/" + SCRIPT_NAME,
  method: "PUT",
  headers: {
    Cookie: cookieStr,
    "Content-Type": "multipart/form-data; boundary=" + boundary,
    "Content-Length": Buffer.byteLength(body),
  },
};

const req = https.request(options, (res) => {
  let data = "";
  res.on("data", (chunk) => {
    data += chunk;
  });
  res.on("end", () => {
    try {
      const json = JSON.parse(data);
      console.log("Success:", json.success);
      if (json.errors && json.errors.length > 0) {
        console.log("Errors:", JSON.stringify(json.errors));
      }
      if (json.result) {
        console.log("Deploy ID:", json.result.id || "unknown");
      }
    } catch (e) {
      console.log("Raw response:", data.slice(0, 500));
    }
  });
});

req.on("error", (e) => {
  console.error("Request error:", e.message);
});

req.write(body);
req.end();
