import { Command } from "commander";
import { pathToFileURL } from "node:url";
import { runActionGetCommand } from "./commands/action-get.js";
import { runActionWatchCommand } from "./commands/action-watch.js";
import { runDepositCommand } from "./commands/deposit.js";
import { runDoctorCommand } from "./commands/doctor.js";
import { runPositionCommand } from "./commands/position.js";
import { runQuoteDepositCommand } from "./commands/quote-deposit.js";
import { runQuoteWithdrawCommand } from "./commands/quote-withdraw.js";
import { runStrategyListCommand } from "./commands/strategy-list.js";
import { runWithdrawCommand } from "./commands/withdraw.js";
import { getDoctorCheckAddress, createOptionalWalletRuntime, createPartnerApiRuntime, createPublicApiRuntime, createRequiredWalletRuntime, normalizeEvmAddress, resolveAddressOrThrow } from "./lib/runtime.js";
import { printCommandError, printCommandResult, type CommandResult } from "./lib/output.js";

async function executeCommand<T>(
  json: boolean,
  task: () => Promise<CommandResult<T>>,
): Promise<void> {
  try {
    const result = await task();
    printCommandResult(result, { json });
  } catch (error) {
    printCommandError(error, { json });
    process.exitCode = 1;
  }
}

export function createProgram(): Command {
  const program = new Command();

  program
    .name("hako-integration-example")
    .description("Public CLI onboarding examples for the Hako Integration API.")
    .showHelpAfterError();

  program
    .command("doctor")
    .description("Run a safe onboarding check against the Hako Integration API.")
    .option("--json", "Output JSON")
    .action(async function action(options: { json?: boolean }) {
      const publicRuntime = createPublicApiRuntime();
      const walletRuntime = createOptionalWalletRuntime();
      const authenticatedRuntime = publicRuntime.partnerKey
        ? createPartnerApiRuntime()
        : null;

      await executeCommand(Boolean(options.json), () =>
        runDoctorCommand({
          rawHakoApiUrl: publicRuntime.apiConfig.rawHakoApiUrl,
          normalizedHakoApiBaseUrl: publicRuntime.apiConfig.hakoApiBaseUrl,
          publicApi: publicRuntime.api,
          authenticatedApi: authenticatedRuntime?.api,
          authenticatedAddress: authenticatedRuntime
            ? getDoctorCheckAddress(walletRuntime.wallet)
            : undefined,
          walletAddress: walletRuntime.wallet?.address,
        }),
      );
    });

  program
    .command("strategy:list")
    .description("List available Hako strategies.")
    .option("--json", "Output JSON")
    .action(async function action(options: { json?: boolean }) {
      const runtime = createPublicApiRuntime();
      await executeCommand(Boolean(options.json), () =>
        runStrategyListCommand({ api: runtime.api }),
      );
    });

  program
    .command("quote:deposit")
    .description("Create a deposit quote.")
    .requiredOption("--chain <chain>", "Source chain, for example base")
    .requiredOption("--token <token>", "Token symbol, for example USDC")
    .requiredOption("--amount <amount>", "Human-readable amount, for example 1")
    .option("--address <address>", "Wallet address to quote for when PRIVATE_KEY is not set")
    .option("--strategy-id <strategyId>", "Strategy id", "stable_vault")
    .option("--json", "Output JSON")
    .action(
      async function action(options: {
        chain: string;
        token: string;
        amount: string;
        address?: string;
        strategyId?: string;
        json?: boolean;
      }) {
        const apiRuntime = createPartnerApiRuntime();
        const walletRuntime = createOptionalWalletRuntime();
        const address = resolveAddressOrThrow({
          commandName: "quote:deposit",
          address: options.address,
          wallet: walletRuntime.wallet,
        });
        await executeCommand(Boolean(options.json), () =>
          runQuoteDepositCommand(options, {
            api: apiRuntime.api,
            walletAddress: address,
          }),
        );
      },
    );

  program
    .command("deposit")
    .description("Create a deposit action, send transactions with viem, and report the tx hash.")
    .requiredOption("--chain <chain>", "Source chain, for example base")
    .requiredOption("--token <token>", "Token symbol, for example USDC")
    .requiredOption("--amount <amount>", "Human-readable amount, for example 1")
    .option("--strategy-id <strategyId>", "Strategy id", "stable_vault")
    .option("--external-id <externalId>", "Partner external idempotency key")
    .option("--json", "Output JSON")
    .action(
      async function action(options: {
        chain: string;
        token: string;
        amount: string;
        strategyId?: string;
        externalId?: string;
        json?: boolean;
      }) {
        const apiRuntime = createPartnerApiRuntime();
        const walletRuntime = createRequiredWalletRuntime();
        await executeCommand(Boolean(options.json), () =>
          runDepositCommand(options, {
            api: apiRuntime.api,
            wallet: walletRuntime.wallet,
          }),
        );
      },
    );

  program
    .command("action:get")
    .description("Get a single action by id.")
    .requiredOption("--action-id <actionId>", "Action UUID")
    .option("--json", "Output JSON")
    .action(
      async function action(options: { actionId: string; json?: boolean }) {
        const runtime = createPartnerApiRuntime();
        await executeCommand(Boolean(options.json), () =>
          runActionGetCommand(options, { api: runtime.api }),
        );
      },
    );

  program
    .command("action:watch")
    .description("Poll action status until it reaches a terminal state.")
    .requiredOption("--action-id <actionId>", "Action UUID")
    .option("--interval-ms <intervalMs>", "Polling interval in milliseconds", "5000")
    .option("--timeout-ms <timeoutMs>", "Timeout in milliseconds", "300000")
    .option("--json", "Output JSON")
    .action(
      async function action(options: {
        actionId: string;
        intervalMs?: string;
        timeoutMs?: string;
        json?: boolean;
      }) {
        const runtime = createPartnerApiRuntime();
        await executeCommand(Boolean(options.json), () =>
          runActionWatchCommand(
            {
              actionId: options.actionId,
              intervalMs: options.intervalMs ? Number(options.intervalMs) : undefined,
              timeoutMs: options.timeoutMs ? Number(options.timeoutMs) : undefined,
            },
            { api: runtime.api },
          ),
        );
      },
    );

  program
    .command("position")
    .description("Get the current position and pending actions for the wallet derived from PRIVATE_KEY.")
    .option("--address <address>", "Wallet address to query when PRIVATE_KEY is not set")
    .option("--strategy-id <strategyId>", "Optional strategy id filter")
    .option("--json", "Output JSON")
    .action(
      async function action(options: {
        address?: string;
        strategyId?: string;
        json?: boolean;
      }) {
        const apiRuntime = createPartnerApiRuntime();
        const walletRuntime = createOptionalWalletRuntime();
        const address = resolveAddressOrThrow({
          commandName: "position",
          address: options.address,
          wallet: walletRuntime.wallet,
        });
        await executeCommand(Boolean(options.json), () =>
          runPositionCommand(options, {
            api: apiRuntime.api,
            walletAddress: address,
          }),
        );
      },
    );

  program
    .command("quote:withdraw")
    .description("Create a withdrawal quote.")
    .requiredOption("--chain <chain>", "Destination chain, for example base")
    .requiredOption("--token <token>", "Token symbol, for example USDC")
    .requiredOption("--amount <amount>", "Human-readable amount, for example 1")
    .option("--address <address>", "Owner wallet address when PRIVATE_KEY is not set")
    .option("--strategy-id <strategyId>", "Strategy id", "stable_vault")
    .option("--receiver <receiver>", "Withdrawal receiver address")
    .option("--json", "Output JSON")
    .action(
      async function action(options: {
        chain: string;
        token: string;
        amount: string;
        address?: string;
        strategyId?: string;
        receiver?: string;
        json?: boolean;
      }) {
        const apiRuntime = createPartnerApiRuntime();
        const walletRuntime = createOptionalWalletRuntime();
        const address = resolveAddressOrThrow({
          commandName: "quote:withdraw",
          address: options.address,
          wallet: walletRuntime.wallet,
        });
        const receiver = options.receiver
          ? normalizeEvmAddress(options.receiver, "--receiver")
          : address;
        await executeCommand(Boolean(options.json), () =>
          runQuoteWithdrawCommand(
            {
              ...options,
              receiver,
            },
            {
              api: apiRuntime.api,
              walletAddress: address,
            },
          ),
        );
      },
    );

  program
    .command("withdraw")
    .description("Create a withdraw action, sign typed-data with viem, and authorize relay execution.")
    .requiredOption("--chain <chain>", "Destination chain, for example base")
    .requiredOption("--token <token>", "Token symbol, for example USDC")
    .requiredOption("--amount <amount>", "Human-readable amount, for example 1")
    .option("--strategy-id <strategyId>", "Strategy id", "stable_vault")
    .option("--receiver <receiver>", "Withdrawal receiver address")
    .option("--external-id <externalId>", "Partner external idempotency key")
    .option("--json", "Output JSON")
    .action(
      async function action(options: {
        chain: string;
        token: string;
        amount: string;
        strategyId?: string;
        receiver?: string;
        externalId?: string;
        json?: boolean;
      }) {
        const apiRuntime = createPartnerApiRuntime();
        const walletRuntime = createRequiredWalletRuntime();
        const receiver = options.receiver
          ? normalizeEvmAddress(options.receiver, "--receiver")
          : undefined;
        await executeCommand(Boolean(options.json), () =>
          runWithdrawCommand(
            {
              ...options,
              receiver,
            },
            {
              api: apiRuntime.api,
              wallet: walletRuntime.wallet,
            },
          ),
        );
      },
    );

  return program;
}

export async function main(argv: string[] = process.argv): Promise<void> {
  const program = createProgram();
  await program.parseAsync(argv);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
