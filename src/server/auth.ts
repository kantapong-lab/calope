import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { getDb } from "./db";
import { accounts, users } from "./db/schema";

// Config is a function so env and the DB are only touched per request, not at import (build, tests).
export const { handlers, auth } = NextAuth(() => ({
  adapter: DrizzleAdapter(getDb(), { usersTable: users, accountsTable: accounts }),
  providers: [Google],
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  callbacks: {
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
}));
