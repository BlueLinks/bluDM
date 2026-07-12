import { describe, expect, it } from "vitest";
import {
  edgeDragAxisForDelta,
  edgeDragDirectionForAxis,
  edgePathForDrag,
  hoverEdgePath,
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
    startCell: { x: 5, y: 5 },
    startDirection: "n",
    ...overrides,
  };
}

describe("dungeonStudioEdgeDrag", () => {
  it("locks mostly horizontal drags to one horizontal wall line despite vertical drift", () => {
    const locked = updateEdgeDragAxis(dragState(), 170, 126);
    const path = edgePathForDrag(locked, { cell: { x: 8, y: 10 }, svgX: 192, svgY: 240 });

    expect(edgeDragAxisForDelta(50, 6)).toBe("horizontal");
    expect(locked.lockedAxis).toBe("horizontal");
    expect(edgeDragDirectionForAxis(locked)).toBe("n");
    expect(path.map((edge) => edge.cell)).toEqual([
      { x: 5, y: 5 },
      { x: 6, y: 5 },
      { x: 7, y: 5 },
      { x: 8, y: 5 },
    ]);
    expect(new Set(path.map((edge) => edge.cell.y))).toEqual(new Set([5]));
  });

  it("locks mostly vertical drags to one vertical wall line despite horizontal drift", () => {
    const state = dragState({ startLocalX: 22, startLocalY: 11, startDirection: "e" });
    const locked = updateEdgeDragAxis(state, 126, 170);
    const path = edgePathForDrag(locked, { cell: { x: 1, y: 9 }, svgX: 24, svgY: 216 });

    expect(edgeDragAxisForDelta(6, 50)).toBe("vertical");
    expect(locked.lockedAxis).toBe("vertical");
    expect(edgeDragDirectionForAxis(locked)).toBe("e");
    expect(path.map((edge) => edge.cell)).toEqual([
      { x: 5, y: 5 },
      { x: 5, y: 6 },
      { x: 5, y: 7 },
      { x: 5, y: 8 },
      { x: 5, y: 9 },
    ]);
    expect(new Set(path.map((edge) => edge.cell.x))).toEqual(new Set([5]));
  });

  it("draws snapped 45-degree diagonal wall paths", () => {
    const state = dragState({ startDirection: "ne" });
    const locked = updateEdgeDragAxis(state, 192, 192);
    const path = edgePathForDrag(locked, { cell: { x: 9, y: 12 }, svgX: 192, svgY: 192 });

    expect(locked.lockedAxis).toBe("diagonal-ne");
    expect(path.map((edge) => edge.cell)).toEqual([
      { x: 5, y: 5 },
      { x: 6, y: 6 },
      { x: 7, y: 7 },
      { x: 8, y: 8 },
    ]);
    expect(path.every((edge) => edge.direction === "ne")).toBe(true);
  });

  it("calculates hover preview for the exact target segment", () => {
    expect(hoverEdgePath({ cell: { x: 3, y: 4 }, direction: "w" })).toEqual([
      { cell: { x: 3, y: 4 }, direction: "w" },
    ]);
  });

  it("does not lock click-to-place or tiny pointer movement", () => {
    const unlocked = updateEdgeDragAxis(dragState(), 124, 123);

    expect(edgeDragAxisForDelta(4, 3)).toBeUndefined();
    expect(unlocked.lockedAxis).toBeUndefined();
    expect(edgeDragDirectionForAxis(unlocked)).toBeUndefined();
  });
});
