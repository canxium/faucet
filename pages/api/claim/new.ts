import Redis from "ioredis"; // Redis
import { ethers } from "ethers"; // Ethers
import { WebClient } from "@slack/web-api"; // Slack
import { isValidInput } from "pages/index"; // Address check
import parseTwitterDate from "utils/dates"; // Parse Twitter dates
import { hasClaimed } from "pages/api/claim/status"; // Claim status
import type { NextApiRequest, NextApiResponse } from "next"; // Types
import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]"


// Setup whitelist (Anish)
const whitelist: string[] = ["1078014622525988864"];

// Setup redis client
const client = new Redis(process.env.REDIS_URL);

// Setup slack client
const slack = new WebClient(process.env.SLACK_ACCESS_TOKEN);
const slackChannel: string = process.env.SLACK_CHANNEL ?? "";
/**
 * Post message to slack channel
 * @param {string} message to post
 */
async function postSlackMessage(message: string): Promise<void> {
  await slack.chat.postMessage({
    channel: slackChannel,
    text: message,
    // Ping user on error
    link_names: true,
  });
}


// Setup networks
const mainRpcNetworks: Record<number, string> = {
  30103: "https://cerium-rpc.canxium.net",
};

/**
 * Collects StaticJsonRpcProvider by network
 * @param {number} network id
 * @returns {ethers.providers.StaticJsonRpcProvider} provider
 */
function getProviderByNetwork(
  network: number
): ethers.providers.StaticJsonRpcProvider {
  // Collect all RPC URLs
  const rpcNetworks = { ...mainRpcNetworks };
  // Collect alchemy RPC URL
  const rpcUrl = rpcNetworks[network];
  // Return static provider
  return new ethers.providers.StaticJsonRpcProvider(rpcUrl);
}

/**
 * Collects nonce by network (cache first)
 * @param {number} network id
 * @returns {Promise<number>} network account nonce
 */
async function getNonceByNetwork(network: number): Promise<number> {
  // Collect nonce from redis
  const redisNonce: string | null = await client.get(`nonce-${network}`);

  // If no redis nonce
  if (redisNonce == null) {
    // Update to last network nonce
    const provider = getProviderByNetwork(network);
    return await provider.getTransactionCount(
      // Collect nonce for operator
      process.env.NEXT_PUBLIC_OPERATOR_ADDRESS ?? ""
    );
  } else {
    // Else, return cached nonce
    return Number(redisNonce);
  }
}

/**
 * Returns populated drip transaction for a network
 * @param {ethers.Wallet} wallet without RPC network connected
 * @param {number} network id
 * @param {string} data input for tx
 */
async function processDrip(
  wallet: ethers.Wallet,
  address: string
): Promise<ethers.providers.TransactionResponse> {
  const network = 30103;
  // Collect provider
  const provider = getProviderByNetwork(network);

  // Connect wallet to network
  const rpcWallet = wallet.connect(provider);
  // Collect nonce for network
  const nonce = await getNonceByNetwork(network);
  // Collect gas price * 2 for network
  const gasPrice = (await provider.getGasPrice()).mul(2);

  // Update nonce for network in redis w/ 5m ttl
  await client.set(`nonce-${network}`, nonce + 1, "EX", 300);

  // Return populated transaction
  try {
    let tx = await rpcWallet.sendTransaction({
      to: address,
      from: wallet.address,
      gasPrice,
      gasLimit: 21000,
      nonce,
      value: process.env.FAUCET_AMOUNT,
    });
    
    return Promise.resolve(tx)
  } catch (e) {
    await postSlackMessage(
      `@anish Error dripping for ${provider.network.chainId}, ${String(
        (e as any).reason
      )}`
    );

    // Delete nonce key to attempt at self-heal
    const delStatus: number = await client.del(
      `nonce-${provider.network.chainId}`
    );
    await postSlackMessage(`Attempting self heal: ${delStatus}`);

    // Throw error
    throw new Error(`Error when processing drip for network ${network}`);
  }
}

export default async (req: NextApiRequest, res: NextApiResponse) => {
  // Collect session (force any for extra twitter params)
  const session = await getServerSession(req, res, authOptions);
  // Collect address
  const { address, others }: { address: string; others: boolean } = req.body;

  if (!session) {
    // Return unauthed status
    return res.status(401).send({ error: "Not authenticated." });
  }

  if (!address || !isValidInput(address)) {
    // Return invalid address status
    return res.status(400).send({ error: "Invalid address." });
  }

  const claimed: boolean = await hasClaimed(session.twitter_id);
  if (claimed) {
    // Return already claimed status
    return res.status(400).send({ error: "Already claimed in 24h window" });
  }

  // Setup wallet w/o RPC provider
  const wallet = new ethers.Wallet(process.env.OPERATOR_PRIVATE_KEY ?? "");

  let tx = await processDrip(wallet, address);

  // If not whitelisted
  if (!whitelist.includes(session.twitter_id)) {
    // Update 24h claim status
    await client.set(session.twitter_id, "true", "EX", 86400);
  }

  return res.status(200).send({ claimed: address, tx: tx });
};
