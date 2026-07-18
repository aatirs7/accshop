import NextAuth from "next-auth";
import ResendProvider from "next-auth/providers/resend";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  accounts,
  sessions,
  users,
  verificationTokens,
} from "@/lib/db/schema";
import { adminEmails, env } from "@/lib/env";
import { sendEmail } from "@/lib/email/resend";
import { MagicLinkEmail } from "@/lib/email/templates";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  // Database sessions: revocable server-side, which matters when a session
  // gates one-time credential reveals.
  session: { strategy: "database" },
  secret: env.AUTH_SECRET,
  trustHost: true,
  pages: {
    signIn: "/login",
    verifyRequest: "/login/check-email",
  },
  providers: [
    ResendProvider({
      from: env.EMAIL_FROM,
      maxAge: 24 * 60 * 60,
      async sendVerificationRequest({ identifier, url }) {
        await sendEmail({
          to: identifier,
          subject: "Sign in to ACCSHOP",
          react: MagicLinkEmail({ url }),
          text: `Sign in to ACCSHOP: ${url}\n\nThis link expires in 24 hours.`,
        });
      },
    }),
  ],
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      session.user.role = user.role;
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      // ADMIN_EMAILS bootstrap: promote on every sign-in so the owner can
      // never be locked out of the admin panel by a bad DB edit.
      if (
        user.id &&
        user.email &&
        adminEmails.includes(user.email.toLowerCase()) &&
        user.role !== "admin"
      ) {
        await db
          .update(users)
          .set({ role: "admin" })
          .where(eq(users.id, user.id));
      }
    },
  },
});
