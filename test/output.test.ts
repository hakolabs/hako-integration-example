import { describe, expect, it } from "vitest";
import { HakoApiError } from "../src/lib/hako-api.js";
import { renderError } from "../src/lib/output.js";

describe("renderError", () => {
  it("renders structured Hako API errors", () => {
    const error = new HakoApiError({
      status: 429,
      code: "RATE_LIMITED",
      message: "Too many requests",
      requestId: "req-123",
      retryAfter: "15",
    });

    const rendered = renderError(error);
    expect(rendered.lines).toContain(
      "Hako API error (429 RATE_LIMITED): Too many requests",
    );
    expect(rendered.data.error).toMatchObject({
      status: 429,
      code: "RATE_LIMITED",
      requestId: "req-123",
      retryAfter: "15",
    });
  });
});
