import { config as loadDotEnv } from "dotenv";
import {
  type RpcOverrideEnvKey,
  type SupportedChain,
  SUPPORTED_CHAIN_NAMES,
} from "./chains.js";

loadDotEnv({ quiet: true });

export const DEFAULT_STRATEGY_ID = "stable_vault";

export const PUBLIC_CHECK_ADDRESS =
  "0x0000000000000000000000000000000000000001";

const RPC_ENV_MAP = {
  ethereum: "RPC_URL_ETHEREUM",
  polygon: "RPC_URL_POLYGON",
  base: "RPC_URL_BASE",
  arbitrum: "RPC_URL_ARBITRUM",
  optimism: "RPC_URL_OPTIMISM",
} satisfies Record<SupportedChain, RpcOverrideEnvKey>;

export interface ApiConfig {
  readonly rawHakoApiUrl: string;
  readonly hakoApiBaseUrl: string;
}

export interface WalletConfig {
  readonly privateKey: `0x${string}`;
  readonly rpcUrls: Partial<Record<SupportedChain, string>>;
}

export interface ShowcaseConfig
  extends ApiConfig,
    WalletConfig,
    PartnerConfig {
  readonly partnerKey: string;
}

export interface PartnerConfig {
  readonly partnerKey: string;
}

export function normalizeHakoApiBaseUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("HAKO_API is required");
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`HAKO_API must be a valid URL, received "${value}"`);
  }

  if (
    parsed.protocol === "http:" &&
    parsed.hostname.endsWith(".app") &&
    parsed.hostname !== "localhost" &&
    parsed.hostname !== "127.0.0.1"
  ) {
    parsed.protocol = "https:";
  }

  const cleanedPath = parsed.pathname.replace(/\/+$/, "");
  if (cleanedPath === "" || cleanedPath === "/") {
    parsed.pathname = "/v1";
  } else if (cleanedPath.endsWith("/v1")) {
    parsed.pathname = cleanedPath;
  } else {
    parsed.pathname = `${cleanedPath}/v1`;
  }

  parsed.search = "";
  parsed.hash = "";

  return parsed.toString().replace(/\/$/, "");
}

function readRequiredEnv(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable ${key}`);
  }

  return value;
}

function normalizePrivateKey(value: string): `0x${string}` {
  if (!/^0x[a-fA-F0-9]{64}$/.test(value)) {
    throw new Error(
      "PRIVATE_KEY must be a 32-byte hex string prefixed with 0x",
    );
  }

  return value as `0x${string}`;
}

function readOptionalUrl(value?: string): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  try {
    return new URL(trimmed).toString();
  } catch {
    throw new Error(`Invalid RPC URL "${value}"`);
  }
}

function readRpcUrls(
  env: NodeJS.ProcessEnv,
): Partial<Record<SupportedChain, string>> {
  return Object.fromEntries(
    SUPPORTED_CHAIN_NAMES.flatMap((chainName) => {
      const rpcUrl = readOptionalUrl(env[RPC_ENV_MAP[chainName]]);
      return rpcUrl ? [[chainName, rpcUrl]] : [];
    }),
  ) as Partial<Record<SupportedChain, string>>;
}

export function loadApiConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  const rawHakoApiUrl = readRequiredEnv(env, "HAKO_API");
  return {
    rawHakoApiUrl,
    hakoApiBaseUrl: normalizeHakoApiBaseUrl(rawHakoApiUrl),
  };
}

export function loadPartnerConfig(
  env: NodeJS.ProcessEnv = process.env,
): PartnerConfig {
  return {
    partnerKey: readRequiredEnv(env, "PARTNER_KEY"),
  };
}

export function loadOptionalPartnerKey(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  return env.PARTNER_KEY?.trim() || undefined;
}

export function loadWalletConfig(
  env: NodeJS.ProcessEnv = process.env,
): WalletConfig {
  return {
    privateKey: normalizePrivateKey(readRequiredEnv(env, "PRIVATE_KEY")),
    rpcUrls: readRpcUrls(env),
  };
}

export function loadOptionalWalletConfig(
  env: NodeJS.ProcessEnv = process.env,
): WalletConfig | null {
  const privateKey = env.PRIVATE_KEY?.trim();
  if (!privateKey) {
    return null;
  }

  return {
    privateKey: normalizePrivateKey(privateKey),
    rpcUrls: readRpcUrls(env),
  };
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ShowcaseConfig {
  const apiConfig = loadApiConfig(env);
  const walletConfig = loadWalletConfig(env);
  const partnerConfig = loadPartnerConfig(env);

  return {
    ...apiConfig,
    ...walletConfig,
    ...partnerConfig,
  };
}
