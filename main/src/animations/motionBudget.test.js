import { describe, expect, it } from "vitest";
import { classifyMotion } from "./motionBudget";

const iphone = {
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
  finePointer: false,
  wide: false,
  cores: 6,
};

const androidPhone = {
  userAgent: "Mozilla/5.0 (Linux; Android 13; Pixel 6a) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile",
  finePointer: false,
  wide: false,
};

describe("classifyMotion", () => {
  it("leaves iOS on the full animation path", () => {
    expect(classifyMotion(iphone)).toEqual({ constrained: false, lowEnd: false });
  });

  it("simplifies motion on touch Android, including mid-range memory", () => {
    expect(classifyMotion({ ...androidPhone, deviceMemory: 4, cores: 8 })).toEqual({
      constrained: true,
      lowEnd: true,
    });
  });

  it("keeps flagship Android at full frame rate with the cheaper property set", () => {
    expect(classifyMotion({ ...androidPhone, deviceMemory: 8, cores: 8 })).toEqual({
      constrained: true,
      lowEnd: false,
    });
  });

  it("does not treat a wide fine-pointer Android desktop as a phone", () => {
    expect(
      classifyMotion({
        ...androidPhone,
        finePointer: true,
        wide: true,
        deviceMemory: 8,
        cores: 8,
      }),
    ).toEqual({ constrained: false, lowEnd: false });
  });

  it("honors data saver on any device", () => {
    expect(classifyMotion({ ...iphone, saveData: true })).toEqual({
      constrained: true,
      lowEnd: true,
    });
  });
});
