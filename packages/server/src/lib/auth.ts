import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { users, userStats } from "../db/schema.js";

const ALLOWED_DOMAIN = process.env.GOOGLE_ALLOWED_DOMAIN;

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  secret:  process.env.BETTER_AUTH_SECRET!,

  trustedOrigins: [
    "http://localhost:5173",
    "http://localhost:3000",
    ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
  ],

  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user:         schema.authUser,
      session:      schema.authSession,
      account:      schema.authAccount,
      verification: schema.authVerification,
    },
  }),

  socialProviders: {
    google: {
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },

  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (ALLOWED_DOMAIN && !user.email.endsWith(`@${ALLOWED_DOMAIN}`)) {
            throw new Error("이 서비스는 허용된 도메인 계정만 이용 가능합니다.");
          }
          return { data: user };
        },
        after: async (user) => {
          // Auto-create game user on first login
          const username = user.name || user.email.split("@")[0];
          const [gameUser] = await db
            .insert(users)
            .values({ authId: user.id, username })
            .onConflictDoNothing()
            .returning();
          if (gameUser) {
            await db.insert(userStats).values({ userId: gameUser.id }).onConflictDoNothing();
          }
        },
      },
    },
  },
});
