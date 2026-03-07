import type { Chain } from "viem";
import {
  arbitrum,
  base,
  mainnet,
  optimism,
  polygon,
} from "viem/chains";

export const SUPPORTED_CHAIN_NAMES = [
  "ethereum",
  "polygon",
  "base",
  "arbitrum",
  "optimism",
] as const;

export type SupportedChain = (typeof SUPPORTED_CHAIN_NAMES)[number];

export type RpcOverrideEnvKey =
  | "RPC_URL_ETHEREUM"
  | "RPC_URL_POLYGON"
  | "RPC_URL_BASE"
  | "RPC_URL_ARBITRUM"
  | "RPC_URL_OPTIMISM";

export interface SupportedChainConfig {
  readonly name: SupportedChain;
  readonly chain: Chain;
  readonly displayName: string;
  readonly rpcEnvKey: RpcOverrideEnvKey;
}

const SUPPORTED_CHAINS: Record<SupportedChain, SupportedChainConfig> = {
  ethereum: {
    name: "ethereum",
    chain: mainnet,
    displayName: "Ethereum",
    rpcEnvKey: "RPC_URL_ETHEREUM",
  },
  polygon: {
    name: "polygon",
    chain: polygon,
    displayName: "Polygon",
    rpcEnvKey: "RPC_URL_POLYGON",
  },
  base: {
    name: "base",
    chain: base,
    displayName: "Base",
    rpcEnvKey: "RPC_URL_BASE",
  },
  arbitrum: {
    name: "arbitrum",
    chain: arbitrum,
    displayName: "Arbitrum",
    rpcEnvKey: "RPC_URL_ARBITRUM",
  },
  optimism: {
    name: "optimism",
    chain: optimism,
    displayName: "Optimism",
    rpcEnvKey: "RPC_URL_OPTIMISM",
  },
};

export function normalizeChainName(value: string): SupportedChain {
  const normalized = value.trim().toLowerCase();
  if (normalized in SUPPORTED_CHAINS) {
    return normalized as SupportedChain;
  }

  throw new Error(
    `Unsupported chain "${value}". Supported chains: ${SUPPORTED_CHAIN_NAMES.join(", ")}`,
  );
}

export function getChainConfig(value: string | SupportedChain): SupportedChainConfig {
  return SUPPORTED_CHAINS[normalizeChainName(value)];
}

export function resolveRpcUrl(
  chainName: SupportedChain,
  rpcOverrides: Partial<Record<SupportedChain, string>>,
): string {
  const override = rpcOverrides[chainName];
  if (override) {
    return override;
  }

  const defaultUrl = SUPPORTED_CHAINS[chainName].chain.rpcUrls.default.http[0];
  if (!defaultUrl) {
    throw new Error(`No RPC URL available for ${chainName}`);
  }

  return defaultUrl;
}
