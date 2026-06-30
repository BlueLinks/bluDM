import { describe, expect, it } from "vitest";
import {
  edgeDragAxisForDelta,
  edgeDragDirectionForAxis,
  updateEdgeDragAxis,
  type DungeonStudioEdgeDragState,
} from "./dungeonStudioEdgeDrag";

function dragState(
  overrides: Partial<DungeonStudioEdgeDragState> = {},
): DungeonStudioEdgeDragState {
  return {
    startSvgX: 120,
    startSvgY: 120,
    startLocalX: 11,
    startLocalY: 2,
    ...overrides,
  };
}

describe("dungeonStudioEdgeDrag", () => {
  it("locks mostly horizontal drags to horizontal edges despite vertical wobble", () => {
    const locked = updateEdgeDragAxis(dragState(), 170, 126);

    expect(edgeDragAxisForDelta(50, 6)).toBe("horizontal");
    expect(locked.lockedAxis).toBe("horizontal");
    expect(edgeDragDirectionForAxis(locked)).toBe("n");
  });

  it("locks mostly vertical drags to vertical edges despite horizontal wobble", () => {
    const locked = updateEdgeDragAxis(dragState({ startLocalX: 22, startLocalY: 11 }), 126, 170);

    expect(edgeDragAxisForDelta(6, 50)).toBe("vertical");
    expect(locked.lockedAxis).toBe("vertical");
    expect(edgeDragDirectionForAxis(locked)).toBe("e");
  });

  it("does not lock click-to-place or tiny pointer movement", () => {
    const unlocked = updateEdgeDragAxis(dragState(), 124, 123);

    expect(edgeDragAxisForDelta(4, 3)).toBeUndefined();
    expect(unlocked.lockedAxis).toBeUndefined();
    expect(edgeDragDirectionForAxis(unlocked)).toBeUndefined();
  });
});
