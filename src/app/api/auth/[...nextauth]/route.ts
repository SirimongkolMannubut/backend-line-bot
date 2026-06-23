import NextAuth, { NextAuthOptions } from 'next-auth'
import LineProvider from 'next-auth/providers/line'
import CredentialsProvider from 'next-auth/providers/credentials'

export const authOptions: NextAuthOptions = {
  providers: [
    LineProvider({
      clientId: process.env.LINE_CLIENT_ID || 'mock-client-id',
      clientSecret: process.env.LINE_CLIENT_SECRET || 'mock-client-secret',
    }),
    CredentialsProvider({
      id: 'mock-line',
      name: 'LINE Developer Bypass',
      credentials: {
        userId: { label: 'LINE User ID', type: 'text', placeholder: 'U1234567890abcdef...' },
        name: { label: 'Display Name', type: 'text', placeholder: 'John Doe' },
      },
      async authorize(credentials) {
        if (credentials?.userId) {
          return {
            id: credentials.userId,
            name: credentials.name || 'Developer User',
            email: null,
            image: null,
          }
        }
        return null
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      if (user) {
        token.sub = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub || 'U-mock-default'
      }
      return session
    },
  },
  pages: {
    signIn: '/',
    error: '/error',
  },
  secret: process.env.NEXTAUTH_SECRET || 'louis-ai-secret-key-123456',
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
export type { NextAuthOptions }
