import { describe, expect, test } from "bun:test";
import {
  CAPTURE,
  PLAYERS,
  SCENES,
  assertRequiredMarkers,
  buildPhoneFilter,
  totalSceneDuration,
} from "./tutorial-video.mjs";

const completeMarkers = {
  ana: [
    "home_ready",
    "room_created",
    "ready",
    "game_started",
    "roll_started",
    "quiz_visible",
    "answer_selected",
    "feedback_visible",
    "end",
  ].map((label, index) => ({ label, sec: index })),
  bruno: [
    "home_ready",
    "join_started",
    "joined",
    "ready",
    "end",
  ].map((label, index) => ({ label, sec: index })),
};

describe("tutorial video rules", () => {
  test("captures a 360px mobile layout at 3x density", () => {
    expect(CAPTURE).toEqual({
      cssWidth: 360,
      cssHeight: 640,
      deviceScaleFactor: 3,
      outputWidth: 1080,
      outputHeight: 1920,
      fps: 30,
    });
  });

  test("assigns stable contrasting identities", () => {
    expect(PLAYERS.ana).toMatchObject({
      label: "ANA • JOGADOR 1",
      color: "EC5B78",
    });
    expect(PLAYERS.bruno).toMatchObject({
      label: "BRUNO • JOGADOR 2",
      color: "18AFC7",
    });
  });

  test("rejects an incomplete participant timeline", () => {
    expect(() =>
      assertRequiredMarkers(
        { ana: [{ label: "home_ready", sec: 1 }], bruno: [] },
        "ana",
      ),
    ).toThrow("Missing tutorial marker");
  });

  test("accepts a complete participant timeline", () => {
    expect(() => assertRequiredMarkers(completeMarkers, "ana")).not.toThrow();
  });

  test("builds a large phone viewport instead of shrinking the app", () => {
    const filter = buildPhoneFilter({
      player: "ana",
      inputLabel: "0:v",
      outputLabel: "phone",
    });
    expect(filter).toContain("scale=920:1636");
    expect(filter).toContain("ANA");
    expect(filter).toContain("EC5B78");
  });

  test("keeps the edited tutorial between 60 and 70 seconds", () => {
    expect(SCENES.findIndex(({ id }) => id === "handoff")).toBe(2);
    expect(totalSceneDuration()).toBeGreaterThanOrEqual(60);
    expect(totalSceneDuration()).toBeLessThanOrEqual(70);
  });
});
