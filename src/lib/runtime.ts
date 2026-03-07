import { getAddress } from "viem";
import {
  PUBLIC_CHECK_ADDRESS,
  loadApiConfig,
  loadOptionalPartnerKey,
  loadOptionalWalletConfig,
  loadPartnerConfig,
  loadWalletConfig,
  type ApiConfig,
  type PartnerConfig,
  type WalletConfig,
} from "./config.js";
import { HakoApiClient } from "./hako-api.js";
import { ShowcaseWallet } from "./wallet.js";

export interface PublicApiRuntime {
  readonly apiConfig: ApiConfig;
  readonly api: HakoApiClient;
  readonly partnerKey?: string;
}

export interface PartnerApiRuntime extends PublicApiRuntime {
  readonly partnerKey: string;
}

export interface OptionalWalletRuntime {
  readonly wallet: ShowcaseWallet | null;
  readonly walletConfig: WalletConfig | null;
}

export interface RequiredWalletRuntime extends OptionalWalletRuntime {
  readonly wallet: ShowcaseWallet;
  readonly walletConfig: WalletConfig;
}

export function createPublicApiRuntime(
  env: NodeJS.ProcessEnv = process.env,
): PublicApiRuntime {
  const apiConfig = loadApiConfig(env);
  const partnerKey = loadOptionalPartnerKey(env);

  return {
    apiConfig,
    api: new HakoApiClient({
      baseUrl: apiConfig.hakoApiBaseUrl,
      partnerKey,
    }),
    partnerKey,
  };
}

export function createPartnerApiRuntime(
  env: NodeJS.ProcessEnv = process.env,
): PartnerApiRuntime {
  const apiConfig = loadApiConfig(env);
  const partnerConfig: PartnerConfig = loadPartnerConfig(env);

  return {
    apiConfig,
    api: new HakoApiClient({
      baseUrl: apiConfig.hakoApiBaseUrl,
      partnerKey: partnerConfig.partnerKey,
    }),
    partnerKey: partnerConfig.partnerKey,
  };
}

export function createOptionalWalletRuntime(
  env: NodeJS.ProcessEnv = process.env,
): OptionalWalletRuntime {
  const walletConfig = loadOptionalWalletConfig(env);
  if (!walletConfig) {
    return {
      wallet: null,
      walletConfig: null,
    };
  }

  return {
    wallet: new ShowcaseWallet(walletConfig),
    walletConfig,
  };
}

export function createRequiredWalletRuntime(
  env: NodeJS.ProcessEnv = process.env,
): RequiredWalletRuntime {
  const walletConfig = loadWalletConfig(env);
  return {
    wallet: new ShowcaseWallet(walletConfig),
    walletConfig,
  };
}

export function normalizeEvmAddress(
  address: string,
  fieldName = "address",
): `0x${string}` {
  try {
    return getAddress(address.trim());
  } catch {
    throw new Error(`${fieldName} must be a valid EVM address`);
  }
}

export function resolveAddressOrThrow(params: {
  readonly commandName: string;
  readonly address?: string;
  readonly wallet?: ShowcaseWallet | null;
}): `0x${string}` {
  if (params.address) {
    return normalizeEvmAddress(params.address, "--address");
  }

  if (params.wallet) {
    return params.wallet.address;
  }

  throw new Error(`${params.commandName} requires --address or PRIVATE_KEY`);
}

export function getDoctorCheckAddress(
  wallet: ShowcaseWallet | null,
): `0x${string}` {
  return wallet?.address ?? normalizeEvmAddress(PUBLIC_CHECK_ADDRESS);
}
