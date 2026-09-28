/**
 * Dev-only Firebase Auth emulator hook.
 *
 * Loaded by vite.config.js ONLY when VITE_HIJACK_AUTH_EMULATOR is set
 * (used for end-to-end verification runs). Point it at the emulator
 * endpoint, e.g. http://localhost:9099. All auth traffic then goes to the
 * local Firebase Auth emulator instead of production — sign-ups create
 * throwaway emulator users and never touch the real project.
 */
export function connectAuthEmulatorIfRequested(firebaseAuthMod, authInstance) {
  const target = import.meta.env?.VITE_HIJACK_AUTH_EMULATOR;
  if (!target) return false;
  try {
    firebaseAuthMod.connectAuthEmulator(authInstance, target, { disableWarnings: true });
    // eslint-disable-next-line no-console
    console.info(`[HireTire dev] Auth emulator attached at ${target}`);
    return true;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[HireTire dev] Could not attach auth emulator:", err?.message);
    return false;
  }
}
