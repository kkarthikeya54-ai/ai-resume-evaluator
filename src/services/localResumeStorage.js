import { formatBytes } from "./storageUtils";

const METADATA_KEY = "airesume_resume_metadata";
const TEXT_KEY = (uid) => `airesume_resume_text_${uid}`;

const memoryStore = new Map();

function readMetadata() {
  try {
    return JSON.parse(localStorage.getItem(METADATA_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeMetadata(metadata) {
  try {
    localStorage.setItem(METADATA_KEY, JSON.stringify(metadata));
  } catch {
    // localStorage may be full; metadata persistence is best-effort.
  }
}

function simulateProgress(onProgress) {
  return new Promise((resolve) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 18 + 8;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        resolve();
      }
      onProgress?.(Math.min(Math.round(progress), 100));
    }, 150);
  });
}

export async function saveResume(file, uid, onProgress) {
  const url = URL.createObjectURL(file);
  const id = `${uid || "anon"}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const record = {
    id,
    name: file.name,
    size: file.size,
    sizeLabel: formatBytes(file.size),
    type: file.type,
    uploadedAt: new Date().toISOString(),
  };

  await simulateProgress(onProgress);

  memoryStore.set(id, { ...record, file, url });
  const metadata = readMetadata();
  metadata.unshift(record);
  writeMetadata(metadata);

  return { ...record, url };
}

export async function saveResumeText(uid, text) {
  if (!uid) return;
  try {
    localStorage.setItem(TEXT_KEY(uid), text);
  } catch {
    // best-effort
  }
}

export async function getResume(uid) {
  if (!uid) return null;
  try {
    const text = localStorage.getItem(TEXT_KEY(uid));
    if (!text) return null;
    const metadata = readMetadata().find((item) => item.id.startsWith(uid)) || null;
    return { ...metadata, text };
  } catch {
    return null;
  }
}

export async function removeResume(uid) {
  if (!uid) return;
  const metadata = readMetadata();
  const remaining = metadata.filter((item) => !item.id.startsWith(uid));
  const removed = metadata.filter((item) => item.id.startsWith(uid));

  removed.forEach((item) => {
    const record = memoryStore.get(item.id);
    if (record?.url) {
      URL.revokeObjectURL(record.url);
    }
    memoryStore.delete(item.id);
  });

  writeMetadata(remaining);
  try {
    localStorage.removeItem(TEXT_KEY(uid));
  } catch {
    // best-effort
  }
}

export { formatBytes };
