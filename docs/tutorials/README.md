# 🧰 Tutorials

Step-by-step walkthroughs for the parts a fresh setup can't skip: the Firebase
project, the API keys, and wiring every service together. These pages follow
the same rule as the rest of the wiki — **no secrets**: credentials and URLs
are referenced by variable name only, with placeholders to fill in.

| Page | Contents |
| --- | --- |
| **[Firebase Setup](./firebase-setup.md)** | Create the project, enable Email/Password + Google, copy the web config, add authorized domains, deploy security rules |
| **[Get the API Keys](./get-api-keys.md)** | Where to obtain every key this app uses — Gemini, NVIDIA NIM, Firebase, Supabase — and which ones are client-safe by design |
| **[Configure the APIs](./configure-apis.md)** | Deploy the AI proxy + HR API workers, set secrets, wire `VITE_*` env vars, create the Supabase `resumes` bucket, and the degraded modes when something isn't configured |

> Where each variable goes (names only): [Operations → Configuration](../operations/configuration.md). The fast path: [Getting Started → Quickstart](../getting-started/quickstart.md).

**Related sections:** [Operations → Deployment](../operations/deployment.md) · [Operations → Free Hosting Runbook](../operations/free-hosting-runbook.md) · [Backend](../backend/README.md) (what you're deploying).