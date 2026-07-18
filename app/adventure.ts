import type {
  CollisionRect,
  NpcId,
  Position,
  WorldBounds,
} from "./game-logic";
import { WORLD_BOUNDS, WORLD_OBSTACLES } from "./game-logic";

export type SceneId =
  | "campus"
  | "creative-lab"
  | "production-studio"
  | "editing-suite";

export type SceneConfig = Readonly<{
  id: SceneId;
  name: string;
  shortName: string;
  icon: string;
  background: string;
  zoom: number;
  bounds: WorldBounds;
  obstacles: readonly CollisionRect[];
}>;

export type Portal = Readonly<{
  id: string;
  scene: SceneId;
  destination: SceneId;
  position: Position;
  spawn: Position;
  label: string;
  icon: string;
  minimumCompleted: number;
}>;

export type QuestItem = Readonly<{
  id: string;
  label: string;
  detail: string;
  icon: string;
  position: Position;
}>;

export type QuestStation = Readonly<{
  id: string;
  label: string;
  action: string;
  icon: string;
  position: Position;
}>;

export type QuestRoute = Readonly<{
  missionId: string;
  scene: SceneId;
  npcId: NpcId;
  items: readonly QuestItem[];
  station: QuestStation;
  deliverable: Readonly<{
    label: string;
    icon: string;
  }>;
}>;

const interiorBounds: WorldBounds = {
  minX: 4,
  maxX: 96,
  minY: 16,
  maxY: 91,
};

const creativeLabObstacles: readonly CollisionRect[] = [
  { id: "brief-furniture", label: "โต๊ะรับ Brief", x1: 7, y1: 18, x2: 31, y2: 39 },
  { id: "planning-furniture", label: "กระดานวางแผน", x1: 37, y1: 13, x2: 59, y2: 34 },
  { id: "moodboard-furniture", label: "ผนัง Moodboard", x1: 66, y1: 12, x2: 92, y2: 38 },
  { id: "revision-furniture", label: "กระดาน Revision", x1: 4, y1: 52, x2: 28, y2: 80 },
  { id: "mockup-furniture", label: "โต๊ะ Mockup", x1: 67, y1: 46, x2: 95, y2: 75 },
];

const productionObstacles: readonly CollisionRect[] = [
  { id: "equipment-rack", label: "ชั้นอุปกรณ์", x1: 3, y1: 12, x2: 29, y2: 48 },
  { id: "shooting-set", label: "ฉากถ่ายทำ", x1: 32, y1: 14, x2: 70, y2: 41 },
  { id: "backdrop", label: "ฉากผ้า", x1: 73, y1: 13, x2: 97, y2: 40 },
  { id: "prep-table", label: "โต๊ะ Pre-Production", x1: 4, y1: 56, x2: 31, y2: 89 },
  { id: "camera-rig", label: "กล้องหลัก", x1: 44, y1: 38, x2: 56, y2: 58 },
  { id: "audio-table", label: "โต๊ะเสียง", x1: 69, y1: 56, x2: 96, y2: 81 },
  { id: "studio-sofa", label: "โซฟาสตูดิโอ", x1: 75, y1: 81, x2: 95, y2: 94 },
];

const editingObstacles: readonly CollisionRect[] = [
  { id: "backup-rack", label: "ตู้สำรองไฟล์", x1: 3, y1: 10, x2: 17, y2: 43 },
  { id: "rough-cut-desk", label: "โต๊ะ Rough Cut", x1: 18, y1: 17, x2: 38, y2: 47 },
  { id: "color-console", label: "โต๊ะปรับสี", x1: 39, y1: 17, x2: 62, y2: 47 },
  { id: "vfx-desk", label: "โต๊ะกราฟิก", x1: 66, y1: 17, x2: 91, y2: 47 },
  { id: "audio-console", label: "โต๊ะมิกซ์เสียง", x1: 3, y1: 58, x2: 29, y2: 90 },
  { id: "export-desk", label: "โต๊ะส่งออก", x1: 70, y1: 56, x2: 96, y2: 84 },
  { id: "editing-sofa", label: "โซฟาห้องตัดต่อ", x1: 35, y1: 79, x2: 65, y2: 96 },
];

export const SCENES: Record<SceneId, SceneConfig> = {
  campus: {
    id: "campus",
    name: "Media Campus",
    shortName: "MEDIA CAMPUS",
    icon: "◆",
    background: "/assets/cozy-campus-world.webp",
    zoom: 1.42,
    bounds: WORLD_BOUNDS,
    obstacles: WORLD_OBSTACLES,
  },
  "creative-lab": {
    id: "creative-lab",
    name: "Creative Lab",
    shortName: "CREATIVE LAB",
    icon: "✒",
    background: "/assets/creative-lab.webp",
    zoom: 1.28,
    bounds: interiorBounds,
    obstacles: creativeLabObstacles,
  },
  "production-studio": {
    id: "production-studio",
    name: "Production Studio",
    shortName: "PRODUCTION STUDIO",
    icon: "🎬",
    background: "/assets/production-studio.webp",
    zoom: 1.25,
    bounds: interiorBounds,
    obstacles: productionObstacles,
  },
  "editing-suite": {
    id: "editing-suite",
    name: "Editing Suite",
    shortName: "EDITING SUITE",
    icon: "✂",
    background: "/assets/editing-suite.webp",
    zoom: 1.25,
    bounds: interiorBounds,
    obstacles: editingObstacles,
  },
};

export const PORTALS: readonly Portal[] = [
  {
    id: "enter-creative-lab",
    scene: "campus",
    destination: "creative-lab",
    position: { x: 8.5, y: 63.5 },
    spawn: { x: 56, y: 85 },
    label: "เข้า Creative Lab",
    icon: "✒",
    minimumCompleted: 0,
  },
  {
    id: "enter-production-studio",
    scene: "campus",
    destination: "production-studio",
    position: { x: 70.5, y: 63.5 },
    spawn: { x: 57, y: 86 },
    label: "เข้า Production Studio",
    icon: "🎬",
    minimumCompleted: 5,
  },
  {
    id: "enter-editing-suite",
    scene: "campus",
    destination: "editing-suite",
    position: { x: 92, y: 63.5 },
    spawn: { x: 50, y: 70 },
    label: "เข้า Editing Suite",
    icon: "✂",
    minimumCompleted: 7,
  },
  {
    id: "exit-creative-lab",
    scene: "creative-lab",
    destination: "campus",
    position: { x: 50, y: 89 },
    spawn: { x: 8.5, y: 64.5 },
    label: "กลับ Media Campus",
    icon: "↩",
    minimumCompleted: 0,
  },
  {
    id: "exit-production-studio",
    scene: "production-studio",
    destination: "campus",
    position: { x: 50, y: 90 },
    spawn: { x: 70.5, y: 64.5 },
    label: "กลับ Media Campus",
    icon: "↩",
    minimumCompleted: 0,
  },
  {
    id: "exit-editing-suite",
    scene: "editing-suite",
    destination: "campus",
    position: { x: 50, y: 74 },
    spawn: { x: 92, y: 64.5 },
    label: "กลับ Media Campus",
    icon: "↩",
    minimumCompleted: 0,
  },
];

export const QUEST_ROUTES: readonly QuestRoute[] = [
  {
    missionId: "briefing",
    scene: "creative-lab",
    npcId: "designer",
    items: [
      { id: "goal", label: "เป้าหมายลูกค้า", detail: "งานนี้ต้องการผลลัพธ์อะไร", icon: "🎯", position: { x: 34, y: 45 } },
      { id: "audience", label: "ข้อมูลกลุ่มเป้าหมาย", detail: "ใครคือผู้ชมหลัก", icon: "👥", position: { x: 50, y: 54 } },
      { id: "constraints", label: "ข้อจำกัดและกำหนดส่ง", detail: "เวลา ขนาด และช่องทาง", icon: "⏳", position: { x: 64, y: 44 } },
    ],
    station: { id: "brief-desk", label: "โต๊ะประกอบ Brief", action: "นำข้อมูลมาประกอบ Brief", icon: "📋", position: { x: 33, y: 38 } },
    deliverable: { label: "Creative Brief", icon: "📋" },
  },
  {
    missionId: "planning",
    scene: "creative-lab",
    npcId: "designer",
    items: [
      { id: "tasks", label: "รายการงาน", detail: "แยกงานใหญ่เป็นขั้นตอน", icon: "☑️", position: { x: 32, y: 57 } },
      { id: "schedule", label: "กำหนดเวลา", detail: "กำหนดวันตรวจและวันส่ง", icon: "🗓️", position: { x: 50, y: 48 } },
      { id: "resources", label: "ทรัพยากร", detail: "ภาพ ฟอนต์ และผู้รับผิดชอบ", icon: "🧰", position: { x: 65, y: 58 } },
    ],
    station: { id: "planning-board", label: "กระดาน Planning", action: "จัดลำดับแผนการทำงาน", icon: "🗓️", position: { x: 50, y: 36 } },
    deliverable: { label: "Production Plan", icon: "🗓️" },
  },
  {
    missionId: "concept",
    scene: "creative-lab",
    npcId: "designer",
    items: [
      { id: "color", label: "ชุดสี", detail: "อารมณ์สีที่ตรงกับผู้ชม", icon: "🎨", position: { x: 35, y: 48 } },
      { id: "type", label: "ตัวอักษร", detail: "บุคลิกและลำดับข้อความ", icon: "🔤", position: { x: 50, y: 62 } },
      { id: "reference", label: "ภาพอ้างอิง", detail: "ทิศทางภาพที่สอดคล้องกัน", icon: "🖼️", position: { x: 65, y: 45 } },
    ],
    station: { id: "moodboard-wall", label: "ผนัง Moodboard", action: "รวมทิศทางภาพและอารมณ์", icon: "💡", position: { x: 74, y: 40 } },
    deliverable: { label: "Moodboard", icon: "💡" },
  },
  {
    missionId: "mockup",
    scene: "creative-lab",
    npcId: "designer",
    items: [
      { id: "layout", label: "โครงร่าง Layout", detail: "ตำแหน่งองค์ประกอบหลัก", icon: "▦", position: { x: 34, y: 48 } },
      { id: "copy", label: "ข้อความจริง", detail: "หัวเรื่องและข้อมูลที่ต้องใช้", icon: "✍️", position: { x: 50, y: 60 } },
      { id: "assets", label: "ภาพและโลโก้", detail: "ไฟล์สำหรับประกอบต้นแบบ", icon: "📁", position: { x: 65, y: 48 } },
    ],
    station: { id: "mockup-table", label: "โต๊ะ Mockup", action: "สร้างต้นแบบก่อนผลิตจริง", icon: "🖥️", position: { x: 66, y: 77 } },
    deliverable: { label: "Design Mockup", icon: "🖥️" },
  },
  {
    missionId: "revision",
    scene: "creative-lab",
    npcId: "designer",
    items: [
      { id: "client-note", label: "Feedback ลูกค้า", detail: "ความต้องการจากผู้ว่าจ้าง", icon: "💬", position: { x: 36, y: 48 } },
      { id: "user-note", label: "Feedback ผู้ใช้", detail: "สิ่งที่ผู้ชมอ่านและเข้าใจ", icon: "👁️", position: { x: 56, y: 58 } },
    ],
    station: { id: "revision-board", label: "กระดาน Revision", action: "คัด Feedback ที่นำไปแก้งานได้", icon: "🔄", position: { x: 31, y: 76 } },
    deliverable: { label: "Revised Design", icon: "🔄" },
  },
  {
    missionId: "pre-production",
    scene: "production-studio",
    npcId: "director",
    items: [
      { id: "script", label: "บทและสารสำคัญ", detail: "สิ่งที่ผู้ชมต้องได้รับ", icon: "📝", position: { x: 34, y: 52 } },
      { id: "storyboard", label: "Storyboard", detail: "ภาพและลำดับก่อนถ่าย", icon: "🎞️", position: { x: 40, y: 68 } },
      { id: "gear-list", label: "รายการอุปกรณ์", detail: "กล้อง ไฟ เสียง และทีม", icon: "🎒", position: { x: 64, y: 55 } },
    ],
    station: { id: "prep-station", label: "โต๊ะ Pre-Production", action: "วางแผนกองถ่ายให้พร้อม", icon: "📝", position: { x: 34, y: 76 } },
    deliverable: { label: "Shoot Plan", icon: "📝" },
  },
  {
    missionId: "production",
    scene: "production-studio",
    npcId: "director",
    items: [
      { id: "lighting", label: "ตรวจไฟสามจุด", detail: "Key, Fill และ Back Light", icon: "💡", position: { x: 64, y: 45 } },
      { id: "camera", label: "ตั้งค่ากล้อง", detail: "เฟรม โฟกัส และการเคลื่อน", icon: "📷", position: { x: 50, y: 62 } },
      { id: "audio", label: "ทดสอบเสียง", detail: "ไมค์ ระดับเสียง และเสียงรบกวน", icon: "🎙️", position: { x: 67, y: 68 } },
    ],
    station: { id: "shooting-mark", label: "จุดเริ่มถ่ายทำ", action: "เริ่มบันทึกภาพและเสียง", icon: "🎬", position: { x: 58, y: 59 } },
    deliverable: { label: "Footage & Audio", icon: "🎥" },
  },
  {
    missionId: "post-production",
    scene: "editing-suite",
    npcId: "editor",
    items: [
      { id: "backup", label: "สำรองไฟล์", detail: "ตรวจและแยกไฟล์ต้นฉบับ", icon: "💾", position: { x: 18, y: 49 } },
      { id: "rough-cut", label: "Rough Cut", detail: "เลือกและเรียงช็อต", icon: "✂️", position: { x: 33, y: 53 } },
      { id: "color-pass", label: "Color Pass", detail: "ปรับภาพให้ต่อเนื่อง", icon: "🎚️", position: { x: 50, y: 53 } },
      { id: "sound-mix", label: "Sound Mix", detail: "จัดระดับเสียงและเพลง", icon: "🎧", position: { x: 31, y: 65 } },
    ],
    station: { id: "export-terminal", label: "Export Terminal", action: "ตรวจงานและส่งออกไฟล์", icon: "📤", position: { x: 68, y: 70 } },
    deliverable: { label: "Final Media", icon: "🏆" },
  },
];

export const getQuestRoute = (missionId: string | undefined) =>
  QUEST_ROUTES.find((route) => route.missionId === missionId) ?? null;

export const getScenePortals = (scene: SceneId) =>
  PORTALS.filter((portal) => portal.scene === scene);

export const getPortalToScene = (scene: SceneId) =>
  PORTALS.find(
    (portal) => portal.scene === "campus" && portal.destination === scene,
  ) ?? null;
