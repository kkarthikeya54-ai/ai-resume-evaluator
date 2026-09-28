import { app } from "../config/firebase";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
} from "firebase/firestore";
import { formatBytes } from "./storageUtils";

const storage = getStorage(app);
const db = getFirestore(app);

const RESUME_DOC = (uid) => doc(db, "resumes", uid);
const RESUME_FILE = (uid, name) =>
  ref(storage, `resumes/${uid}/${Date.now()}-${name}`);

export async function saveResume(file, uid, onProgress) {
  if (!uid) {
    throw new Error("You must be signed in to upload a resume.");
  }

  const fileRef = RESUME_FILE(uid, file.name);
  const uploadTask = uploadBytesResumable(fileRef, file);

  uploadTask.on(
    "state_changed",
    (snapshot) => {
      const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
      onProgress?.(Math.min(Math.max(pct, 0), 100));
    },
    () => {
      // Errors surface through the awaited `uploadTask` promise below.
    }
  );

  const snapshot = await uploadTask;
  const downloadURL = await getDownloadURL(snapshot.ref);

  const record = {
    id: snapshot.ref.fullPath,
    name: file.name,
    size: file.size,
    sizeLabel: formatBytes(file.size),
    type: file.type,
    uploadedAt: new Date().toISOString(),
    downloadURL,
  };

  await setDoc(RESUME_DOC(uid), record, { merge: true });

  return record;
}

export async function saveResumeText(uid, text) {
  if (!uid) return;
  await setDoc(RESUME_DOC(uid), { text }, { merge: true });
}

export async function getResume(uid) {
  if (!uid) return null;
  const snapshot = await getDoc(RESUME_DOC(uid));
  if (!snapshot.exists()) return null;
  return snapshot.data();
}

export async function removeResume(uid) {
  if (!uid) return;
  const snapshot = await getDoc(RESUME_DOC(uid));
  if (snapshot.exists()) {
    const data = snapshot.data();
    if (data.downloadURL) {
      const fileRef = ref(storage, data.id);
      await deleteObject(fileRef).catch(() => {});
    }
    await deleteDoc(RESUME_DOC(uid));
  }
}

export { formatBytes };
