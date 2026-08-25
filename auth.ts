import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

// Google sign-in, locked to a single owner. Auth only turns on when the Google
// OAuth env vars are present, so the app still deploys and demos open until the
// credentials are added - then it locks to AUTH_OWNER_EMAIL only.
const owner = process.env.AUTH_OWNER_EMAIL?.toLowerCase().trim();

export const authEnabled =
  !!process.env.AUTH_GOOGLE_ID && !!process.env.AUTH_GOOGLE_SECRET;

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: authEnabled
    ? [
        Google({
          clientId: process.env.AUTH_GOOGLE_ID,
          clientSecret: process.env.AUTH_GOOGLE_SECRET,
        }),
      ]
    : [],
  callbacks: {
    // Allowlist: only the owner's Google account may hold a session.
    signIn({ profile }) {
      if (!owner) return true;
      const email = profile?.email?.toLowerCase().trim();
      return email === owner;
    },
  },
  pages: { signIn: "/" },
});
