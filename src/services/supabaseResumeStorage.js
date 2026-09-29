import { createClient } from "@supabase/supabase-js";
import { formatBytes } from "./storageUtils";

/**
 * Cloud resume storage backed by Supabase Storage.
 *
 * The binary resume file is uploaded to the public `resumes` bucket at
 * `resumes/{uid}/{timestamp}-{name}`. Lightweight metadata + parsed text stay
 * in localStorage (same keys as the local provider) so the app keeps its
 * zero-setup behavior while the actual files are persisted in the cloud.
 *
 * Requires VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY in .env. When either is
 * missing the module reports isConfigured=false and callers fall back to the
 * purely-local provider.
 */

export const isConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
);

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

const supabase = isConfigured ? createClient(SUPABASE_URL, ANON_KEY) : null;

const BUCKET = "resumes";
const METADATA_KEY = "airesume_resume_metadata";
const TEXT_KEY = (uid) => `airesume_resume_text_${uid}`;

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
    // metadata persistence is best-effort; the file itself is in Supabase
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

function publicUrl(path) {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encoded}`;
}

export async function saveResume(file, uid, onProgress) {
  if (!uid) {
    throw new Error("Sign in to sync your resume to the cloud.");
  }
  if (!supabase) {
    throw new Error("Supabase storage is not configured.");
  }

  const path = `${uid}/${Date.now()}-${file.name}`;
  const progressPromise = simulateProgress(onProgress);
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  await progressPromise;

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const record = {
    id: path,
    name: file.name,
    size: file.size,
    sizeLabel: formatBytes(file.size),
    type: file.type || "application/octet-stream",
    uploadedAt: new Date().toISOString(),
    downloadURL: publicUrl(path),
  };

  const metadata = readMetadata();
  metadata.unshift(record);
  writeMetadata(metadata);

  return { ...record, url: record.downloadURL };
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

  // Delete from the cloud first: list every object in the user's folder and
  // remove it. Listing by prefix — not by the localStorage metadata — catches
  // orphaned files too (an upload whose metadata write failed, files uploaded
  // from another device, etc.), so a full wipe always empties the folder.
  if (supabase) {
    try {
      const BATCH = 100;
      for (let offset = 0; ; offset += BATCH) {
        const { data: files, error } = await supabase.storage
          .from(BUCKET)
          .list(uid, { limit: BATCH, offset });
        if (error) throw error;
        const list = files || [];
        if (list.length > 0) {
          await supabase.storage
            .from(BUCKET)
            .remove(list.map((file) => `${uid}/${file.name}`))
            .catch(() => {});
        }
        if (list.length < BATCH) break;
      }
    } catch {
      // Folder missing or listing not permitted — fall through to local cleanup.
    }
  }

  writeMetadata(remaining);
  try {
    localStorage.removeItem(TEXT_KEY(uid));
  } catch {
    // best-effort
  }
}

export { formatBytes };