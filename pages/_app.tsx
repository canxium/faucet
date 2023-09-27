import "styles/global.scss"; // Global styles
import type { AppProps } from "next/app"; // Types
import { SessionProvider } from "next-auth/react"
import "react-toastify/dist/ReactToastify.css"; // Toast styles
import { ToastContainer } from "react-toastify"; // Toast notifications
import { Session } from "next-auth";

export default function App({
  Component,
  pageProps,
}: AppProps<{
  session: Session;
}>) {
  return (
    // Wrap app in auth session provider
    <SessionProvider session={pageProps.session}>
      {/* Toast container */}
      <ToastContainer />

      {/* Site */}
      <Component {...pageProps} />
    </SessionProvider>
  );
}
