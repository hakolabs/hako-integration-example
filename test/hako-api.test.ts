import { afterEach, describe, expect, it, vi } from "vitest";
import { HakoApiClient } from "../src/lib/hako-api.js";

describe("HakoApiClient network errors", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("explains DNS resolution failures for invalid HAKO_API hosts", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(
        Object.assign(new TypeError("fetch failed"), {
          cause: {
            code: "ENOTFOUND",
            hostname: "app.hakoapp.app",
          },
        }),
      ),
    );

    const client = new HakoApiClient({
      baseUrl: "https://app.hakoapp.app/v1",
      partnerKey: "partner-key",
    });

    await expect(client.getStrategies()).rejects.toMatchObject({
      code: "NETWORK_ERROR",
      message:
        "Could not resolve HAKO_API host app.hakoapp.app. Check the hostname. The public Hako Integration API is available at https://api.hakolabs.app/v1.",
      details: {
        causeCode: "ENOTFOUND",
        hostname: "app.hakoapp.app",
      },
    });
  });
});
