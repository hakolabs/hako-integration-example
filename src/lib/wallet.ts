import { getAddress, type Hex, createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { getChainConfig, resolveRpcUrl, type SupportedChain } from "./chains.js";
import type { WalletConfig } from "./config.js";
import type { ActionTxPayload } from "./hako-api.js";

type TypedDataField = {
  readonly name: string;
  readonly type: string;
};

type ParsedTypedData = {
  readonly domain: Record<string, unknown>;
  readonly types: Record<string, TypedDataField[]>;
  readonly primaryType: string;
  readonly message: Record<string, unknown>;
};

interface ChainClientBundle {
  readonly publicClient: ReturnType<typeof createPublicClient>;
  readonly walletClient: ReturnType<typeof createWalletClient>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${field} must be a non-empty string`);
  }

  return value;
}

function asTypedDataFieldArray(value: unknown, field: string): TypedDataField[] {
  if (!Array.isArray(value)) {
    throw new Error(`${field} must be an array`);
  }

  return value.map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(`${field}[${index}] must be an object`);
    }

    return {
      name: asString(item.name, `${field}[${index}].name`),
      type: asString(item.type, `${field}[${index}].type`),
    };
  });
}

function parseTypedDataValue(type: string, value: unknown): unknown {
  if (type.endsWith("[]")) {
    if (!Array.isArray(value)) {
      throw new Error(`Expected array value for type ${type}`);
    }

    const itemType = type.slice(0, -2);
    return value.map((item) => parseTypedDataValue(itemType, item));
  }

  if (type === "address") {
    return getAddress(asString(value, "typedData.message.address"));
  }

  if (type === "bool") {
    if (typeof value !== "boolean") {
      throw new Error("typedData.message bool value must be boolean");
    }

    return value;
  }

  if (type.startsWith("uint") || type.startsWith("int")) {
    if (typeof value !== "string" && typeof value !== "number" && typeof value !== "bigint") {
      throw new Error(`typedData.message numeric value for ${type} is invalid`);
    }

    return typeof value === "string" ? value : String(value);
  }

  if (type.startsWith("bytes")) {
    return asString(value, "typedData.message.bytes") as Hex;
  }

  if (type === "string") {
    return asString(value, "typedData.message.string");
  }

  return value;
}

export function parseTypedDataJson(authorizationJson: string): ParsedTypedData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(authorizationJson);
  } catch {
    throw new Error("authorization payload is not valid JSON");
  }

  if (!isRecord(parsed)) {
    throw new Error("authorization payload must be an object");
  }

  const domainRaw = parsed.domain;
  const typesRaw = parsed.types;
  const messageRaw = parsed.message;

  if (!isRecord(domainRaw)) {
    throw new Error("authorization.domain must be an object");
  }

  if (!isRecord(typesRaw)) {
    throw new Error("authorization.types must be an object");
  }

  if (!isRecord(messageRaw)) {
    throw new Error("authorization.message must be an object");
  }

  const primaryType = asString(parsed.primaryType, "authorization.primaryType");
  const primaryFields = asTypedDataFieldArray(
    typesRaw[primaryType],
    `authorization.types.${primaryType}`,
  );
  if (primaryFields.length === 0) {
    throw new Error(`authorization.types.${primaryType} must not be empty`);
  }

  const types = Object.fromEntries(
    Object.entries(typesRaw).map(([typeName, fields]) => [
      typeName,
      Array.isArray(fields) ? asTypedDataFieldArray(fields, `authorization.types.${typeName}`) : [],
    ]),
  );

  const parsedMessage = Object.fromEntries(
    primaryFields.map((field) => [
      field.name,
      parseTypedDataValue(field.type, messageRaw[field.name]),
    ]),
  );

  const normalizedDomain: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(domainRaw)) {
    if (key === "verifyingContract") {
      normalizedDomain[key] = getAddress(asString(value, `authorization.domain.${key}`));
      continue;
    }

    if (key === "chainId") {
      if (typeof value !== "string" && typeof value !== "number" && typeof value !== "bigint") {
        throw new Error("authorization.domain.chainId is invalid");
      }

      normalizedDomain[key] = Number(value);
      continue;
    }

    normalizedDomain[key] = value;
  }

  return {
    domain: normalizedDomain,
    types,
    primaryType,
    message: parsedMessage,
  };
}

export class ShowcaseWallet {
  readonly account: PrivateKeyAccount;
  readonly address: `0x${string}`;
  private readonly clients = new Map<SupportedChain, ChainClientBundle>();

  constructor(private readonly config: WalletConfig) {
    this.account = privateKeyToAccount(config.privateKey);
    this.address = getAddress(this.account.address);
  }

  async sendPreparedTransaction(params: {
    readonly network: SupportedChain;
    readonly tx: ActionTxPayload;
  }): Promise<Hex> {
    const clients = this.getClients(params.network);
    const hash = await clients.walletClient.sendTransaction({
      account: this.account,
      chain: getChainConfig(params.network).chain,
      to: getAddress(params.tx.to),
      data: params.tx.data as Hex,
      value: BigInt(params.tx.value),
    });

    await clients.publicClient.waitForTransactionReceipt({
      hash,
      confirmations: 1,
    });

    return hash;
  }

  async signTypedDataPayload(authorizationJson: string): Promise<{
    readonly signature: Hex;
    readonly typedData: ParsedTypedData;
  }> {
    const typedData = parseTypedDataJson(authorizationJson);
    const signature = await this.account.signTypedData(
      typedData as Parameters<PrivateKeyAccount["signTypedData"]>[0],
    );

    return {
      signature,
      typedData,
    };
  }

  private getClients(network: SupportedChain): ChainClientBundle {
    const existing = this.clients.get(network);
    if (existing) {
      return existing;
    }

    const chainConfig = getChainConfig(network);
    const rpcUrl = resolveRpcUrl(network, this.config.rpcUrls);
    const transport = http(rpcUrl);

    const bundle: ChainClientBundle = {
      publicClient: createPublicClient({
        chain: chainConfig.chain,
        transport,
      }),
      walletClient: createWalletClient({
        account: this.account,
        chain: chainConfig.chain,
        transport,
      }),
    };

    this.clients.set(network, bundle);
    return bundle;
  }
}
