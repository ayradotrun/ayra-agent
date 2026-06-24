import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { isAdminEmail } from "@/lib/admin";
import { normalizeUsername } from "@/lib/auth/username";
import type { Adapter } from "next-auth/adapters";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    newUser: "/dashboard",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        login: { label: "Username or email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.login || !credentials?.password) return null;

        const login = credentials.login.trim();
        const loginLower = login.toLowerCase();
        const isEmailLogin = login.includes("@");

        const user = await prisma.user.findFirst({
          where: isEmailLogin
            ? { email: { equals: loginLower, mode: "insensitive" } }
            : { username: { equals: normalizeUsername(login), mode: "insensitive" } },
          select: {
            id: true,
            email: true,
            username: true,
            name: true,
            image: true,
            password: true,
            emailVerified: true,
          },
        });

        if (!user?.password) return null;
        if (!user.emailVerified) return null;

        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          username: user.username,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.username = (user as { username?: string | null }).username ?? null;
      }
      if (token.email) {
        token.isAdmin = isAdminEmail(token.email as string);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.isAdmin = token.isAdmin === true;
        session.user.username = (token.username as string | null | undefined) ?? null;
      }
      return session;
    },
  },
};
