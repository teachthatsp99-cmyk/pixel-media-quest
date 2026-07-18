import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const logicSource = await readFile(
  new URL("../app/game-logic.ts", import.meta.url),
  "utf8",
);
const logicJavaScript = ts.transpileModule(logicSource, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: "game-logic.ts",
}).outputText;
const logic = await import(
  "data:text/javascript;base64," +
    Buffer.from(logicJavaScript).toString("base64")
);

const gameSource = await readFile(
  new URL("../app/game.tsx", import.meta.url),
  "utf8",
);
const adventureSource = await readFile(
  new URL("../app/adventure.ts", import.meta.url),
  "utf8",
);
const gameAst = ts.createSourceFile(
  "game.tsx",
  gameSource,
  ts.ScriptTarget.ES2022,
  true,
  ts.ScriptKind.TSX,
);
let missionInitializer;
for (const statement of gameAst.statements) {
  if (!ts.isVariableStatement(statement)) continue;
  for (const declaration of statement.declarationList.declarations) {
    if (declaration.name.getText(gameAst) === "missions") {
      missionInitializer = declaration.initializer;
    }
  }
}
assert.ok(missionInitializer, "ต้องพบข้อมูล missions ในเกม");
const missionModuleSource = `export default ${missionInitializer.getText(gameAst)};`;
const missionJavaScript = ts.transpileModule(missionModuleSource, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: "mission-data.ts",
}).outputText;
const { default: missions } = await import(
  "data:text/javascript;base64," +
    Buffer.from(missionJavaScript).toString("base64")
);

const readLiteral = async (source, fileName, variableName, scriptKind) => {
  const ast = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.ES2022,
    true,
    scriptKind,
  );
  let initializer;
  for (const statement of ast.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (declaration.name.getText(ast) === variableName) {
        initializer = declaration.initializer;
      }
    }
  }
  assert.ok(initializer, `ต้องพบข้อมูล ${variableName}`);
  const moduleSource = `export default ${initializer.getText(ast)};`;
  const javascript = ts.transpileModule(moduleSource, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName,
  }).outputText;
  return (await import(
    "data:text/javascript;base64," + Buffer.from(javascript).toString("base64")
  )).default;
};

const questRoutes = await readLiteral(
  adventureSource,
  "adventure.ts",
  "QUEST_ROUTES",
  ts.ScriptKind.TS,
);
const portals = await readLiteral(
  adventureSource,
  "adventure.ts",
  "PORTALS",
  ts.ScriptKind.TS,
);
const interiorBounds = await readLiteral(
  adventureSource,
  "adventure.ts",
  "interiorBounds",
  ts.ScriptKind.TS,
);
const sceneObstacles = {
  "creative-lab": await readLiteral(
    adventureSource,
    "adventure.ts",
    "creativeLabObstacles",
    ts.ScriptKind.TS,
  ),
  "production-studio": await readLiteral(
    adventureSource,
    "adventure.ts",
    "productionObstacles",
    ts.ScriptKind.TS,
  ),
  "editing-suite": await readLiteral(
    adventureSource,
    "adventure.ts",
    "editingObstacles",
    ts.ScriptKind.TS,
  ),
};

const npcPositions = [
  { x: 50, y: 67 },
  { x: 24, y: 67 },
  { x: 75, y: 63 },
  { x: 77, y: 81 },
];

test("รองรับตำแหน่งปุ่มเดินและโต้ตอบทั้งแป้นไทยและอังกฤษ", () => {
  const movementCases = [
    [{ code: "KeyW", key: "w" }, "up"],
    [{ code: "KeyW", key: "ไ" }, "up"],
    [{ code: "KeyA", key: "ฟ" }, "left"],
    [{ code: "KeyS", key: "ห" }, "down"],
    [{ code: "KeyD", key: "ก" }, "right"],
    [{ code: "ArrowUp", key: "ArrowUp" }, "up"],
    [{ code: "", key: "ไ" }, "up"],
    [{ code: "", key: "ฟ" }, "left"],
    [{ code: "", key: "ห" }, "down"],
    [{ code: "", key: "ก" }, "right"],
  ];
  for (const [event, expected] of movementCases) {
    assert.equal(logic.getMovementDirection(event), expected);
  }
  assert.equal(logic.isInteractionKey({ code: "KeyE", key: "ำ" }), true);
  assert.equal(logic.isInteractionKey({ code: "KeyE", key: "e" }), true);
  assert.equal(logic.isInteractionKey({ code: "", key: "ำ" }), true);
  assert.equal(logic.isInteractionKey({ code: "KeyR", key: "r" }), false);
});

test("เดินทแยงด้วยความเร็วเท่าการเดินตรง", () => {
  const straight = logic.getMovementVector(["right"]);
  const diagonal = logic.getMovementVector(["right", "down"]);
  assert.equal(Math.hypot(straight.x, straight.y), 1);
  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.y) - 1) < 1e-10);
  assert.ok(Math.abs(diagonal.x - Math.SQRT1_2) < 1e-10);
  assert.ok(Math.abs(diagonal.y - Math.SQRT1_2) < 1e-10);
  assert.deepEqual(logic.getMovementVector(["left", "right"]), {
    x: 0,
    y: 0,
    magnitude: 0,
  });
});

test("จอยมือถือรองรับการลากค้าง แปดทิศ และมี dead zone", () => {
  assert.deepEqual(logic.getJoystickDirections(0.05, -0.08), []);
  assert.deepEqual(logic.getJoystickDirections(0.8, 0), ["right"]);
  assert.deepEqual(logic.getJoystickDirections(-0.8, 0), ["left"]);
  assert.deepEqual(logic.getJoystickDirections(0, -0.8), ["up"]);
  assert.deepEqual(logic.getJoystickDirections(0, 0.8), ["down"]);
  assert.deepEqual(logic.getJoystickDirections(0.7, -0.7), ["right", "up"]);
  assert.deepEqual(logic.getJoystickDirections(-0.7, 0.7), ["left", "down"]);
});

test("เท้าตัวละครไม่ทะลุอาคาร น้ำพุ สวน หรือขอบแมพ", () => {
  for (const obstacle of logic.WORLD_OBSTACLES) {
    const center = {
      x: (obstacle.x1 + obstacle.x2) / 2,
      y: (obstacle.y1 + obstacle.y2) / 2,
    };
    assert.equal(
      logic.canOccupyPosition(center),
      false,
      `ต้องชน ${obstacle.label}`,
    );
  }
  assert.equal(logic.canOccupyPosition({ x: 50, y: 20 }), false);
  assert.equal(logic.canOccupyPosition({ x: 1, y: 84 }), false);
  assert.equal(logic.canOccupyPosition(logic.PLAYER_START), true);

  const fountainApproach = { x: 50, y: 66 };
  assert.deepEqual(
    logic.resolveMovement(fountainApproach, 0, -3),
    fountainApproach,
  );
  const gardenApproach = { x: 41, y: 76 };
  assert.deepEqual(
    logic.resolveMovement(gardenApproach, -3, 0),
    gardenApproach,
  );
});

test("ผู้เล่นหยุดก่อนทับตำแหน่ง NPC และลำดับความลึกอิงตำแหน่งเท้า", () => {
  const current = { x: 50, y: 84 };
  assert.deepEqual(
    logic.resolveMovement(current, 0, -1, [{ x: 50, y: 80 }]),
    current,
  );
  assert.ok(
    logic.getDepthIndex({ x: 50, y: 75 }) >
      logic.getDepthIndex({ x: 50, y: 65 }),
  );
  assert.equal(logic.getDepthIndex({ x: 50, y: 67 }), 167);
});

test("จุดเริ่มและ NPC ทุกคนอยู่บนพื้นเดินได้", () => {
  assert.equal(logic.canOccupyPosition(logic.PLAYER_START), true);
  for (const position of npcPositions) {
    assert.equal(
      logic.canOccupyPosition(position),
      true,
      `NPC ${position.x},${position.y} ต้องไม่อยู่ในวัตถุทึบ`,
    );
  }
});

test("ทางเดินจากจุดเริ่มเชื่อมถึงระยะสนทนาของ NPC ทุกคน", () => {
  const step = 1;
  const queue = [logic.PLAYER_START];
  const visited = new Set([`${logic.PLAYER_START.x},${logic.PLAYER_START.y}`]);
  const reached = new Set();

  while (queue.length > 0 && reached.size < npcPositions.length) {
    const current = queue.shift();
    npcPositions.forEach((target, index) => {
      if (logic.distance(current, target) <= logic.INTERACTION_DISTANCE - 1) {
        reached.add(index);
      }
    });
    for (const direction of logic.MOVE_DIRECTIONS) {
      const vector = logic.directionVectors[direction];
      const next = logic.resolveMovement(
        current,
        vector.x * step,
        vector.y * step,
        npcPositions,
      );
      if (next.x === current.x && next.y === current.y) continue;
      const key = `${next.x.toFixed(2)},${next.y.toFixed(2)}`;
      if (visited.has(key)) continue;
      visited.add(key);
      queue.push(next);
    }
  }

  assert.deepEqual([...reached].sort(), [0, 1, 2, 3]);
  assert.ok(visited.size < 10000, "แผนที่ต้องค้นหาเส้นทางได้โดยไม่ระเบิดสถานะ");
});

test("โซนเพลงเปลี่ยนตามตำแหน่งจริงในแมพ", () => {
  assert.equal(logic.getZoneForPosition({ x: 20, y: 70 }), "graphic");
  assert.equal(logic.getZoneForPosition({ x: 50, y: 70 }), "plaza");
  assert.equal(logic.getZoneForPosition({ x: 80, y: 70 }), "video");
});

test("เซฟเกมที่ซ้ำ ข้ามด่าน หรือมีข้อมูลแปลกถูกซ่อมเป็นลำดับต่อเนื่อง", () => {
  const ordered = ["briefing", "planning", "concept", "mockup"];
  assert.deepEqual(
    logic.normalizeProgress(
      ["planning", "briefing", "briefing", "unknown"],
      ordered,
    ),
    ["briefing", "planning"],
  );
  assert.deepEqual(
    logic.normalizeProgress(["briefing", "concept", "mockup"], ordered),
    ["briefing"],
  );
  assert.deepEqual(logic.normalizeProgress([], ordered), []);
});

test("ภารกิจครบ 8 ด่านและสัญญาการแสดงผลเกมไม่ถอยหลัง", () => {
  assert.deepEqual(missions.map((mission) => mission.id), [
    "briefing",
    "planning",
    "concept",
    "mockup",
    "revision",
    "pre-production",
    "production",
    "post-production",
  ]);
  assert.deepEqual(
    missions.map((mission) => mission.order),
    [1, 2, 3, 4, 5, 6, 7, 8],
  );
  assert.deepEqual(
    new Set(missions.map((mission) => mission.mini.kind)),
    new Set(["single", "multi", "order", "classify"]),
  );
  assert.equal(gameSource.includes("zIndex: 60 +"), false);
  assert.ok((gameSource.match(/getDepthIndex\(/g) ?? []).length >= 2);
  assert.ok(gameSource.includes("requestAnimationFrame(animateMovement)"));
  assert.ok(gameSource.includes("else if (miniMission)"));
  assert.ok(gameSource.includes("resetMiniState();"));
  assert.ok(gameSource.includes("คลิกไกล ๆ ใช้งานไม่ได้"));
});

test("เส้นทางผจญภัยผูกครบทุกภารกิจและปลดล็อกห้องตามลำดับ", () => {
  assert.deepEqual(
    questRoutes.map((route) => route.missionId),
    missions.map((mission) => mission.id),
  );
  assert.deepEqual(
    questRoutes.map((route) => route.scene),
    [
      "creative-lab",
      "creative-lab",
      "creative-lab",
      "creative-lab",
      "creative-lab",
      "production-studio",
      "production-studio",
      "editing-suite",
    ],
  );
  for (const route of questRoutes) {
    assert.ok(route.items.length >= 2, `${route.missionId} ต้องมีหลักฐานให้สำรวจ`);
    assert.equal(
      new Set(route.items.map((item) => item.id)).size,
      route.items.length,
      `${route.missionId} ห้ามมีรหัสไอเท็มซ้ำ`,
    );
    assert.ok(route.station.label.length > 0);
    assert.ok(route.deliverable.label.length > 0);
  }
  const campusDoors = portals.filter((portal) => portal.scene === "campus");
  assert.deepEqual(
    campusDoors.map((portal) => portal.minimumCompleted),
    [0, 5, 7],
  );
  assert.ok(
    ["creative-lab", "production-studio", "editing-suite"].every((scene) =>
      portals.some(
        (portal) => portal.scene === scene && portal.destination === "campus",
      ),
    ),
    "ทุกห้องต้องมีทางกลับ Campus",
  );
});

test("ผู้เล่นเดินถึง NPC หลักฐาน โต๊ะทำงาน และทางออกในทุกห้อง", () => {
  const starts = {
    "creative-lab": { x: 56, y: 85 },
    "production-studio": { x: 57, y: 86 },
    "editing-suite": { x: 50, y: 70 },
  };
  const npcByScene = {
    "creative-lab": { x: 42, y: 84 },
    "production-studio": { x: 42, y: 85 },
    "editing-suite": { x: 42, y: 70 },
  };

  for (const [scene, start] of Object.entries(starts)) {
    const targets = [
      npcByScene[scene],
      ...questRoutes
        .filter((route) => route.scene === scene)
        .flatMap((route) => [
          ...route.items.map((item) => item.position),
          route.station.position,
        ]),
      ...portals
        .filter((portal) => portal.scene === scene)
        .map((portal) => portal.position),
    ];
    const queue = [start];
    const visited = new Set([`${start.x},${start.y}`]);
    const reached = new Set();
    while (queue.length > 0 && reached.size < targets.length) {
      const current = queue.shift();
      targets.forEach((target, index) => {
        if (logic.distance(current, target) <= logic.INTERACTION_DISTANCE) {
          reached.add(index);
        }
      });
      for (const direction of logic.MOVE_DIRECTIONS) {
        const vector = logic.directionVectors[direction];
        const next = logic.resolveMovement(
          current,
          vector.x,
          vector.y,
          [npcByScene[scene]],
          sceneObstacles[scene],
          interiorBounds,
        );
        if (next.x === current.x && next.y === current.y) continue;
        const key = `${next.x.toFixed(2)},${next.y.toFixed(2)}`;
        if (visited.has(key)) continue;
        visited.add(key);
        queue.push(next);
      }
    }
    assert.equal(
      reached.size,
      targets.length,
      `${scene} ต้องเดินถึงจุดโต้ตอบ ${targets.length} จุด แต่ถึง ${reached.size}`,
    );
    assert.ok(visited.size < 12_000, `${scene} ต้องค้นหาเส้นทางได้อย่างมีขอบเขต`);
  }
});

test("คำตอบของมินิเกมทุกด่านถูกชนิดและไม่อ้างตัวเลือกที่ไม่มี", () => {
  for (const mission of missions) {
    const game = mission.mini;
    assert.ok(game.options.length >= 3, `${mission.id} ต้องมีตัวเลือกเพียงพอ`);
    assert.ok(mission.dialogue.length >= 2, `${mission.id} ต้องมีบทสนทนานำเรื่อง`);
    assert.ok(mission.summary.length >= 40, `${mission.id} ต้องมีสรุปความรู้`);
    assert.ok(mission.importance.length >= 40, `${mission.id} ต้องอธิบายความสำคัญ`);
    assert.ok(mission.example.length >= 30, `${mission.id} ต้องมีตัวอย่างงานจริง`);

    if (game.kind === "single" || game.kind === "multi") {
      assert.ok(Array.isArray(game.answers) && game.answers.length > 0);
      assert.equal(new Set(game.answers).size, game.answers.length);
      assert.ok(game.answers.every((index) => index >= 0 && index < game.options.length));
      if (game.kind === "single") assert.equal(game.answers.length, 1);
    } else if (game.kind === "order") {
      assert.deepEqual(
        [...game.correctOrder].sort((left, right) => left - right),
        game.options.map((_, index) => index),
      );
    } else {
      assert.equal(game.classifications.length, game.options.length);
      assert.ok(
        game.classifications.every(
          (classification) => classification === "useful" || classification === "vague",
        ),
      );
    }
  }
});

test("ไฟล์ภาพและ CSS อยู่ในงบประสิทธิภาพที่กำหนด", async () => {
  const css = await readFile(
    new URL("../app/game.css", import.meta.url),
    "utf8",
  );
  assert.ok(css.includes("prefers-reduced-motion: reduce"));
  assert.ok(css.includes(".pmq-lite-effects"));
  assert.ok(css.includes("will-change: transform"));
  assert.ok(css.includes("pointer: coarse"));
  assert.ok(css.includes(".virtual-joystick"));
  assert.ok(css.includes("-webkit-touch-callout: none"));
  assert.ok(css.includes("touch-action: pan-y"));
  assert.ok(gameSource.includes('root.addEventListener("contextmenu"'));
  assert.ok(gameSource.includes('root.addEventListener("selectstart"'));

  const assetPaths = [
    "../public/assets/cozy-campus-world.webp",
    "../public/assets/creative-lab.webp",
    "../public/assets/production-studio.webp",
    "../public/assets/editing-suite.webp",
    "../public/assets/student-adventurer.webp",
    "../public/assets/mentor-npc.webp",
    "../public/assets/npc-designer.webp",
    "../public/assets/npc-director.webp",
    "../public/assets/npc-editor.webp",
  ];
  let totalBytes = 0;
  for (const path of assetPaths) {
    totalBytes += (await stat(new URL(path, import.meta.url))).size;
  }
  assert.ok(totalBytes < 850_000, `WebP รวม ${totalBytes} ไบต์ ต้องต่ำกว่า 850 KB`);
});
