import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { runWatchdogCycle } from "../src/jobs/watchdog";
import { seedMockPositions, clearMockPositions } from "../src/services/supabase";
import { setKnownOpenAlerts } from "../src/lib/alerts";

describe("watchdog integration", () => {
  afterAll(() => {
    clearMockPositions();
    setKnownOpenAlerts([]);
  });

  it("completes a full watchdog cycle without throwing when no active pools exist", async () => {
    clearMockPositions();
    await expect(runWatchdogCycle()).resolves.toBeUndefined();
  });

  it("fails gracefully with no active positions (empty state)", async () => {
    clearMockPositions();
    await expect(runWatchdogCycle()).resolves.toBeUndefined();
  });
});