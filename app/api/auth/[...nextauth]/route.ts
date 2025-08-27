
import NextAuth, { User, Account, Session } from 'next-auth' // Add Session
import { JWT } from 'next-auth/jwt' // Import JWT
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'

// Define base providers
const googleProvider = GoogleProvider({
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
});

const githubProvider = GitHubProvider({
  clientId: process.env.GITHUB_ID!,
  clientSecret: process.env.GITHUB_SECRET!,
});

// Create admin-specific provider configurations by copying and modifying the id
const adminGoogleProvider = { ...googleProvider, id: 'google-admin', name: 'Google Admin' };

export const authOptions = {
  providers: [
    googleProvider,
    githubProvider,
    adminGoogleProvider
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user, account }: { user: User, account: Account | null }) {
      // Check if the login is from an admin-specific provider
      if (account?.provider.endsWith('-admin')) {
        const adminEmails = process.env.ADMIN_EMAIL?.split(',').map(email => email.trim()) || [];
        const userEmail = user.email || '';

        if (adminEmails.includes(userEmail)) {
          return true; // Allow sign-in for admin
        } else {
          // Block non-admin users trying to use admin login
          const error = `Login failed: User email '${userEmail}' is not an authorized admin.`;
          return `/admin/login?error=${encodeURIComponent(error)}`;
        }
      }
      
      // Allow sign-in for regular user providers
      return true;
    },
    async jwt({ token, account }: { token: JWT, account: Account | null }) { // Add types here
      if (account) {
        token.provider = account.provider; // Add provider to the token
      }
      return token;
    },
    async session({ session, token }: { session: Session, token: JWT }) { // Add types here
      if (token.provider) {
        session.provider = token.provider; // Add provider from token to session
      }
      return session;
    }
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
