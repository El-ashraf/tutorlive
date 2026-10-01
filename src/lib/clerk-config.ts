// True when a valid-format Clerk publishable key is present.
// In dev mode without real keys, we skip Clerk entirely so the app can still render.
export const isClerkConfigured = (() => {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  return !!key && (key.startsWith("pk_test_") || key.startsWith("pk_live_"));
})();
