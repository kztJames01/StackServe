import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import clientPromise from "@/lib/mongodb";
export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // Add your credential verification logic here
        // This would call your backend API to verify credentials
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/login`, {
          method: "POST",
          body: JSON.stringify(credentials),
          headers: { "Content-Type": "application/json" }
        });
        
        const user = await res.json();
        
        if (res.ok && user) {
          return user;
        }
        return null;
      }
    })
  ],
  adapter: MongoDBAdapter(clientPromise),
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async session({ session, token }) {
      // Add user ID to session
      if (token?.sub) {
        session.user.id = token.sub;
      }
      return session;
    }
  }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
