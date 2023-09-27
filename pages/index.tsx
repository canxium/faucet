import axios from "axios"; // Requests
import Image from "next/image"; // Image
import { ethers } from "ethers"; // Address check
import { toast } from "react-toastify"; // Toast notifications
import Layout from "components/Layout"; // Layout wrapper
import { useRouter } from "next/router"; // Router
import styles from "styles/Home.module.scss"; // Styles
import { ReactElement, useState } from "react"; // Local state + types
import { getAddressDetails } from "utils/addresses"; // Faucet addresses
import { hasClaimed } from "pages/api/claim/status"; // Claim status
import { getSession, signIn, signOut } from "next-auth/react"

/**
 * Check if a provided address is valid
 * @param {string} address to check
 * @returns {boolean} validity
 */
function isValidAddress(address: string): boolean {
  try {
    // Check if address is valid + checksum match
    ethers.utils.getAddress(address);
  } catch {
    // If not, return false
    return false;
  }

  // Else, return true
  return true;
}

/**
 * Checks if a provider address or ENS name is valid
 * @param {string} address to check
 * @returns {boolean} validity
 */
export function isValidInput(address: string): boolean {
  // Check if ENS name
  if (~address.toLowerCase().indexOf(".eth")) {
    return true;
  }

  // Else, check if valid general address
  return isValidAddress(address);
}

export default function Home({
  session,
  claimed: initialClaimed,
}: {
  session: any;
  claimed: boolean;
}) {
  // Collect prefilled address
  const {
    query: { addr },
  } = useRouter();
  // Fill prefilled address
  const prefilledAddress: string = addr && typeof addr === "string" ? addr : "";

  // Claim address
  const [address, setAddress] = useState<string>(prefilledAddress);
  // Claimed status
  const [claimed, setClaimed] = useState<boolean>(initialClaimed);
  // Claimed tx hash
  const [claimedTx, setClaimedTx] = useState<string>("");
  // First claim
  const [firstClaim, setFirstClaim] = useState<boolean>(false);
  // Loading status
  const [loading, setLoading] = useState<boolean>(false);
  // Claim other
  const [claimOther, setClaimOther] = useState<boolean>(false);

  // Collect details about addresses
  const { networkCount, sortedAddresses } = getAddressDetails();

  /**
   * Processes a claim to the faucet
   */
  const processClaim = async () => {
    // Toggle loading
    setLoading(true);

    try {
      // Post new claim with recipient address
      let res = await axios.post("/api/claim/new", { address, others: claimOther });
      // Toast if success + toggle claimed
      console.log(res.data)
      toast.success(`Faucet dispersed—check balances shortly!`);
      setClaimed(true);
      setClaimedTx(res.data.tx.hash);
      setFirstClaim(true);
    } catch (error: any) {
      // If error, toast error message
      toast.error(error.response.data.error);
    }

    // Toggle loading
    setLoading(false);
  };

  return (
    <Layout>
      {/* CTA + description */}
      <div className={styles.home__cta}>
        <div>
          <a
            href="https://canxium.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image src="/logo.png" height="42.88px" width="180px" />
          </a>
        </div>
        <h1>Bootstrap your testnet wallet</h1>
      </div>

      {/* Claim from facuet card */}
      <div className={styles.home__card}>
        {/* Card title */}
        <div className={styles.home__card_title}>
          <h3>Request Faucet</h3>
        </div>

        {/* Card content */}
        <div className={styles.home__card_content}>
          {!session ? (
            // If user is unauthenticated:
            <div className={styles.content__unauthenticated}>
              {/* Reasoning for Twitter OAuth */}
              <p>
                To prevent faucet botting, you must sign in with Twitter. We
                request{" "}
                <a
                  href="https://developer.twitter.com/en/docs/apps/app-permissions"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  read-only
                </a>{" "}
                access.
              </p>

              {/* Sign in with Twitter */}
              <button
                className={styles.button__main}
                onClick={() => signIn("twitter")}
              >
                Sign In with Twitter
              </button>
            </div>
          ) : (
            // If user is authenticated:
            <div className={styles.content__authenticated}>
              {claimed ? (
                // If user has already claimed once in 24h
                <div className={styles.content__claimed}>
                  <p>
                    {firstClaim
                      ? "You have successfully claimed. You can request again in 24 hours."
                      : "You have already claimed today. Please try again in 24 hours."}
                  </p>

                  <input
                    type="text"
                    placeholder=""
                    disabled
                  />
                  {/* Other networks checkbox */}
                  <div className={styles.content__unclaimed_others}>
                    <label>
                      <a href={"https://cerium-explorer.canxium.net/tx/" + claimedTx} target="_blank">{claimedTx}</a>
                    </label>
                  </div>
                  <button className={styles.button__main} disabled>
                    Claimed
                  </button>
                </div>
              ) : (
                // If user has not claimed in 24h
                <div className={styles.content__unclaimed}>
                  {/* Claim description */}
                  <p>Enter your Canxium address to receive faucet:</p>

                  {/* Address input */}
                  <input
                    type="text"
                    placeholder="0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />

                  {isValidInput(address) ? (
                    // If address is valid, allow claiming
                    <button
                      className={styles.button__main}
                      onClick={processClaim}
                      disabled={loading}
                    >
                      {!loading ? "Claim" : "Claiming..."}
                    </button>
                  ) : (
                    // Else, force fix
                    <button className={styles.button__main} disabled>
                      {address === ""
                        ? "Enter Valid Address"
                        : "Invalid Address"}
                    </button>
                  )}
                </div>
              )}

              {/* General among claimed or unclaimed, allow signing out */}
              <div className={styles.content__twitter}>
                <button onClick={() => signOut()}>
                  Sign out @{session.twitter_handle}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

/**
 * Returns button to add network to MetaMask
 * @param {temp: any} autoconnect details
 * @returns {ReactElement}
 */
function AddNetworkButton({ autoconnect }: { autoconnect: any }): ReactElement {
  /**
   * Adds network to MetaMask
   */
  const addToMetaMask = async () => {
    // @ts-expect-error
    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [autoconnect],
    });
  };

  return (
    <button onClick={addToMetaMask} className={styles.addNetworkButton}>
      Add to MetaMask
    </button>
  );
}

/**
 * Returns token address component
 * @param {string} etherscanPrefix of address
 * @param {string?} name if displaying MM connect
 * @param {string} address to display
 * @param {string} ERC20 if asset is an ERC20
 * @returns {ReactElement}
 */
function TokenAddress({
  etherscanPrefix,
  name,
  address,
  ERC20,
}: {
  etherscanPrefix: string;
  name?: string;
  address: string;
  ERC20: boolean;
}): ReactElement {
  /**
   * Adds token to MetaMask
   */
  const addToMetaMask = async () => {
    // @ts-expect-error
    await window.ethereum.request({
      method: "wallet_watchAsset",
      params: {
        type: "ERC20",
        options: {
          address: address,
          symbol: name,
          decimals: 18,
        },
      },
    });
  };

  return (
    <span className={styles.address}>
      <a
        href={`https://${etherscanPrefix}/address/${address}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        {ethers.utils.getAddress(address)}
      </a>
      {ERC20 ? <button onClick={addToMetaMask}>Add to MetaMask</button> : null}
    </span>
  );
}

/**
 * Returns token logo component
 * @param {string} name of token
 * @param {string} imageSrc of token image
 * @returns {ReactElement}
 */
function TokenLogo({
  name,
  imageSrc,
}: {
  name: string;
  imageSrc: string;
}): ReactElement {
  return (
    <div className={styles.token}>
      <img src={imageSrc} alt={`${name}`} />
      <span>{name}</span>
    </div>
  );
}

export async function getServerSideProps(context: any) {
  // Collect session
  const session: any = await getSession(context);

  return {
    props: {
      session,
      // If session exists, collect claim status, else return false
      claimed: session ? await hasClaimed(session.twitter_id) : false,
    },
  };
}
