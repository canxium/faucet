import styles from "styles/Layout.module.scss"; // Styles
import { default as HTMLHead } from "next/head"; // Meta

// Page layout
export default function Layout({
  children,
}: {
  children: (JSX.Element | null)[];
}) {
  return (
    <div className={styles.layout}>
      {/* Meta + Head */}
      <Head />

      {/* Layout sizer */}
      <div className={styles.layout__content}>{children}</div>

      {/* Footer */}
      <Footer />
    </div>
  );
}

// Head + Meta
function Head() {
  return (
    <HTMLHead>
      {/* Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="true"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap"
        rel="stylesheet"
      />

      {/* Favicon */}
      <link rel="shortcut icon" href="/favicon.ico" />

      {/* Primary Meta Tags */}
      <title>Paradigm MultiFaucet | Bootstrap your testnet wallet</title>
      <meta
        name="title"
        content="Canxium Faucet | Bootstrap your testnet wallet"
      />
      <meta
        name="description"
        content="Canxium faucet funds a wallet with CAU."
      />

      {/* OG + Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content="https://faucet.canxium.org" />
      <meta
        property="og:title"
        content="Canxium Faucet | Bootstrap your testnet wallet"
      />
      <meta
        property="og:description"
        content="Canxium faucet funds a wallet with CAU."
      />
      <meta
        property="og:image"
        content="https://faucet.canxium.org/logo.png"
      />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content="https://faucet.canxium.org" />
      <meta
        property="twitter:title"
        content="Canxium Faucet | Bootstrap your testnet wallet"
      />
      <meta
        property="twitter:description"
        content="Canxium faucet funds a wallet with CAU."
      />
      <meta
        property="twitter:image"
        content="https://faucet.canxium.org/logo.png"
      />
    </HTMLHead>
  );
}

// Footer
function Footer() {
  return (
    <div className={styles.layout__footer}>
      {/* Disclaimer */}
      <a href="https://github.com/canxium/faucet">Github</a>
    </div>
  );
}
