import { formatBytes } from "./storageUtils";
import * as local from "./localResumeStorage";
import * as supabaseStore from "./supabaseResumeStorage";

export const storageProvider = supabaseStore.isConfigured ? "supabase" : "local";

/** Upload a resume. Signed-in users sync to Supabase Storage; anonymous
 *  session flows keep the file in the browser. */
export async function saveResume(file, uid, onProgress) {
  if (storageProvider === "supabase" && uid) {
    return supabaseStore.saveResume(file, uid, onProgress);
  }
  return local.saveResume(file, uid, onProgress);
}

export function saveResumeText(uid, text) {
  if (storageProvider === "supabase") {
    return supabaseStore.saveResumeText(uid, text);
  }
  return local.saveResumeText(uid, text);
}

export function getResume(uid) {
  if (storageProvider === "supabase") {
    return supabaseStore.getResume(uid);
  }
  return local.getResume(uid);
}

export function removeResume(uid) {
  if (storageProvider === "supabase") {
    return supabaseStore.removeResume(uid);
  }
  return local.removeResume(uid);
}

export { formatBytes };