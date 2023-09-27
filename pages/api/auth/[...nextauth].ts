import NextAuth from "next-auth"; // Next auth
import TwitterProvider from "next-auth/providers/twitter";

export const authOptions = {
  providers: [
    // Twitter OAuth provider
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID || "",
      clientSecret: process.env.TWITTER_CLIENT_SECRET || "",
      version: "2.0", // opt-in to Twitter OAuth 2.0
    }),
  ],
  secret: process.env.NEXTAUTH_JWT_SECRET,
  callbacks: {
    async redirect({ baseUrl }: any) {
      return baseUrl
    },
    async session({ session, user, token }: any) {
      session.twitter_id = token.twitter_id;
      session.twitter_handle = token.twitter_handle;
      session.twitter_num_tweets = token.twitter_num_tweets;
      session.twitter_num_followers = token.twitter_num_followers;
      session.twitter_created_at = token.twitter_created_at;

      return session
    },
    async jwt({ token, user }: any) {
       // Check if user is signing in (versus logging out)
      const isSignIn = user ? true : false;

      // If signing in
      if (isSignIn) {
        // Attach additional parameters (twitter id + handle + anti-bot measures)
        token.twitter_id = user.id;
        token.twitter_handle = user.name;
        token.twitter_num_tweets = 0;
        token.twitter_num_followers = 0;
        token.twitter_created_at = 0;
      }
      
      return token
    },
    async signIn({ }) {
      return true
    },
  }
};

export default NextAuth(authOptions)
