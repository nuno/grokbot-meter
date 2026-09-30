import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { elapsedDayIndex, formatResetsIn } from "./format.ts";

const NOW = 1_700_000_000_000;
const DAY = 86_400_000;

describe("elapsed day and Resets in", () => {
  it("keeps the same day node while the line still says 6d", () => {
    const exact = NOW + 6 * DAY;
    const plusHalfHour = exact + 30 * 60_000;
    assert.equal(formatResetsIn(exact, NOW), "Resets in 6d");
    assert.equal(formatResetsIn(plusHalfHour, NOW), "Resets in 6d");
    assert.equal(elapsedDayIndex(exact, NOW), elapsedDayIndex(plusHalfHour, NOW));
    assert.equal(elapsedDayIndex(exact, NOW), 1);
  });

  it("lights day 1 when a full week remains and day 7 on the last day", () => {
    assert.equal(formatResetsIn(NOW + 7 * DAY, NOW), "Resets in 7d");
    assert.equal(elapsedDayIndex(NOW + 7 * DAY, NOW), 0);
    assert.equal(formatResetsIn(NOW + DAY, NOW), "Resets in 1d");
    assert.equal(elapsedDayIndex(NOW + DAY, NOW), 6);
    assert.equal(formatResetsIn(NOW + 23 * 60 * 60_000, NOW), "Resets in 23h");
    assert.equal(elapsedDayIndex(NOW + 23 * 60 * 60_000, NOW), 6);
  });

  it("returns null when the reset time is unknown", () => {
    assert.equal(elapsedDayIndex(null, NOW), null);
    assert.equal(formatResetsIn(null, NOW), "Resets in —");
  });
});
