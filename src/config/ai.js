const aiConfig = {
  proxyUrl: import.meta.env.VITE_AI_PROXY_URL,
  generationConfig: {
    temperature: 0.7,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
    responseMimeType: "application/json",
  },
};

export function hasAccess() {
  return Boolean(aiConfig.proxyUrl && !aiConfig.proxyUrl.includes("YOUR_SUBDOMAIN"));
}

export default aiConfig;
