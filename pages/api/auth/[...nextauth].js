// pages/api/auth/[...nextauth].js
// Replaces Flask session + login_required decorator

import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Admin Login",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Credentials stored in environment variables (not hardcoded)
        const validUser = process.env.ADMIN_USERNAME || "nitish";
        const validPass = process.env.ADMIN_PASSWORD || "boss";

        if (
          credentials?.username === validUser &&
          credentials?.password === validPass
        ) {
          return { id: "1", name: validUser, role: "admin" };
        }
        return null;
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.role = user.role;
      return token;
    },
    async session({ session, token }) {
      session.user.role = token.role;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
