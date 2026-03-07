import { describe, expect, it, vi } from "vitest";
import { createProgram } from "../src/cli.js";

async function parse(args: string[]) {
  const program = createProgram();
  const stderr: string[] = [];
  const stderrSpy = vi
    .spyOn(process.stderr, "write")
    .mockImplementation(((chunk: string | Uint8Array) => {
      stderr.push(String(chunk));
      return true;
    }) as typeof process.stderr.write);

  try {
    await program.parseAsync(["node", "cli", ...args]);
    return { error: null, stderr: stderr.join("") };
  } catch (error) {
    return { error, stderr: stderr.join("") };
  } finally {
    stderrSpy.mockRestore();
  }
}

describe("cli required options", () => {
  it("requires --chain for deposit", async () => {
    const result = await parse(["deposit", "--token", "USDC", "--amount", "1"]);
    expect(result.error).toBeInstanceOf(Error);
    expect(result.stderr).toContain(
      "required option '--chain <chain>' not specified",
    );
  });

  it("requires --token for quote:deposit", async () => {
    const result = await parse(["quote:deposit", "--chain", "base", "--amount", "1"]);
    expect(result.error).toBeInstanceOf(Error);
    expect(result.stderr).toContain(
      "required option '--token <token>' not specified",
    );
  });

  it("requires --amount for withdraw", async () => {
    const result = await parse(["withdraw", "--chain", "base", "--token", "USDC"]);
    expect(result.error).toBeInstanceOf(Error);
    expect(result.stderr).toContain(
      "required option '--amount <amount>' not specified",
    );
  });

  it("requires --action-id for action:get", async () => {
    const result = await parse(["action:get"]);
    expect(result.error).toBeInstanceOf(Error);
    expect(result.stderr).toContain(
      "required option '--action-id <actionId>' not specified",
    );
  });
});
