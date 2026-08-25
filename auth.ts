import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

// Two ways to lock the app to the owner:
//  - a passcode (AUTH_ACCESS_CODE) - the fast, zero-setup gate
//  - Google sign-in (AUTH_GOOGLE_ID/SECRET) allowlisted to AUTH_OWNER_EMAIL
// Auth turns on when EITHER is configured; otherwise the app runs open.
const owner = process.env.AUTH_OWNER_EMAIL?.toLowerCase().trim();
const accessCode = process.env.AUTH_ACCESS_CODE;

export const hasGoogle =
  !!process.env.AUTH_GOOGLE_ID && !!process.env.AUTH_GOOGLE_SECRET;
export const hasPasscode = !!accessCode;
export const authEnabled = hasGoogle || hasPasscode;

// Constant-time-ish compare so the passcode check does not leak length via timing.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const providers = [];
if (hasGoogle) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  );
}
if (hasPasscode) {
  providers.push(
    Credentials({
      name: "Passcode",
      credentials: { code: { label: "Passcode", type: "password" } },
      authorize(creds) {
        const input = typeof creds?.code === "string" ? creds.code : "";
        if (accessCode && input && safeEqual(input, accessCode)) {
          return { id: "owner", name: "Owner", email: owner ?? "owner@precision.local" };
        }
        return null;
      },
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  providers,
  callbacks: {
    // Google allowlist: only the owner's Google account may hold a session.
    // (The passcode provider already gates entry by the shared secret.)
    signIn({ account, profile }) {
      if (account?.provider !== "google") return true;
      if (!owner) return true;
      return profile?.email?.toLowerCase().trim() === owner;
    },
  },
  pages: { signIn: "/" },
});
