import { auth as clerkAuth, currentUser as clerkCurrentUser } from "@clerk/nextjs/server";
import { isClerkConfigured } from "./clerk-config";

/** Safe auth() — returns { userId: null } when Clerk keys aren't configured. */
export async function auth() {
  if (!isClerkConfigured) return { userId: null as string | null };
  return clerkAuth();
}

/** Safe currentUser() — returns null when Clerk keys aren't configured. */
export async function currentUser() {
  if (!isClerkConfigured) return null;
  return clerkCurrentUser();
}
