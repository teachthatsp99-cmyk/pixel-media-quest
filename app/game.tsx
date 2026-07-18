"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  CSSProperties,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import Image from "next/image";
import {
  getPortalToScene,
  getQuestRoute,
  getScenePortals,
  SCENES,
} from "./adventure";
import type {
  Portal,
  QuestItem,
  SceneId,
} from "./adventure";
import {
  arraysEqual,
  canOccupyPosition,
  clamp,
  directionVectors,
  distance,
  getDepthIndex,
  getMovementDirection,
  getMovementVector,
  getJoystickDirections,
  getZoneForPosition,
  INTERACTION_DISTANCE,
  isInteractionKey,
  MOVE_DIRECTIONS,
  MOVE_SPEED,
  normalizeProgress,
  PLAYER_START,
  resolveMovement,
  WORLD_RATIO,
  WORLD_STATUS_INTERVAL,
} from "./game-logic";
import type { MoveDirection, NpcId, Position, Zone } from "./game-logic";

type MiniKind = "single" | "multi" | "order" | "classify";
type Classification = "useful" | "vague";

type MiniOption = {
  icon: string;
  label: string;
  detail: string;
  accent?: string;
};

type MiniGame = {
  kind: MiniKind;
  prompt: string;
  instruction: string;
  options: MiniOption[];
  answers?: number[];
  correctOrder?: number[];
  classifications?: Classification[];
  hint: string;
};

type Mission = {
  id: string;
  order: number;
  zone: "graphic" | "video";
  npcId: NpcId;
  title: string;
  english: string;
  icon: string;
  badge: string;
  objective: string;
  dialogue: string[];
  summary: string;
  importance: string;
  example: string;
  mini: MiniGame;
};

type Npc = {
  id: NpcId;
  name: string;
  role: string;
  sprite: string;
  scene: SceneId;
  position: { x: number; y: number };
  idle: string[];
};

type AdventureObject = {
  id: string;
  kind: "portal" | "item" | "station";
  label: string;
  detail: string;
  icon: string;
  position: Position;
  portal?: Portal;
  item?: QuestItem;
};

type DialogueState = {
  npcId: NpcId;
  lines: string[];
  index: number;
  missionId?: string;
  startQuestAfter?: string;
  finaleAfter?: boolean;
};

const npcs: Npc[] = [
  {
    id: "mentor",
    name: "อาจารย์พิกเซล",
    role: "ผู้ดูแล Media Campus",
    sprite: "/assets/mentor-npc.webp",
    scene: "campus",
    position: { x: 50, y: 67 },
    idle: [
      "ทุกงานที่ดีเริ่มจากกระบวนการที่ชัดเจน ลองตามแสงของ Media Core ไปนะ",
      "ถ้าหลงทาง ดูลูกศรภารกิจด้านบนได้เสมอ ที่นี่ไม่มีแพ้ มีแต่การเรียนรู้",
    ],
  },
  {
    id: "designer",
    name: "พี่เมย์",
    role: "Creative Director",
    sprite: "/assets/npc-designer.webp",
    scene: "creative-lab",
    position: { x: 42, y: 84 },
    idle: [
      "งานออกแบบไม่ใช่แค่สวย แต่ต้องตอบ Brief และสื่อสารกับคนดูให้ได้",
      "ลองสังเกตสี ตัวอักษร และลำดับสายตารอบตัว ทุกอย่างคือภาษาภาพ",
    ],
  },
  {
    id: "director",
    name: "พี่นนท์",
    role: "Film Director",
    sprite: "/assets/npc-director.webp",
    scene: "production-studio",
    position: { x: 42, y: 85 },
    idle: [
      "กองถ่ายที่ลื่นไหล เริ่มจากแผนที่ทุกคนเข้าใจตรงกัน",
      "เช็กภาพและเสียงตั้งแต่หน้างาน ช่วยชีวิตคนตัดต่อได้เยอะเลย",
    ],
  },
  {
    id: "editor",
    name: "พี่แพรว",
    role: "Editor & Sound Designer",
    sprite: "/assets/npc-editor.webp",
    scene: "editing-suite",
    position: { x: 42, y: 70 },
    idle: [
      "การตัดต่อคือการเลือกจังหวะให้ผู้ชมรู้สึกและเข้าใจเรื่องราว",
      "ภาพดีอย่างเดียวไม่พอ เสียงที่ชัดทำให้งานดูมืออาชีพขึ้นทันที",
    ],
  },
];

const missions: Mission[] = [
  {
    id: "briefing",
    order: 1,
    zone: "graphic",
    npcId: "designer",
    title: "ถอดรหัส Brief",
    english: "BRIEFING",
    icon: "📋",
    badge: "Brief Core",
    objective: "ไปพบพี่เมย์ที่ Creative Lab",
    dialogue: [
      "แย่แล้ว! งานประชาสัมพันธ์ Open House เหลือเวลาไม่มาก แต่ข้อมูลจากลูกค้ายังกระจัดกระจาย",
      "นักออกแบบที่เก่งจะไม่รีบเปิดโปรแกรมทันที เราต้องถามให้ชัดว่า ทำเพื่ออะไร สื่อสารกับใคร และมีข้อจำกัดอะไร",
      "ช่วยฉันคัดข้อมูลที่ต้องอยู่ใน Brief ให้ครบ แล้วเราจะปลุก Media Core ชิ้นแรกกัน!",
    ],
    summary:
      "Briefing คือการรวบรวมเป้าหมาย กลุ่มเป้าหมาย สารสำคัญ ผลงานที่ต้องส่ง เวลา และข้อจำกัดให้ทุกฝ่ายเข้าใจตรงกัน",
    importance:
      "Brief ที่ชัดช่วยลดการออกแบบผิดทิศ ลดการแก้งาน และทำให้การตัดสินใจด้านภาพ สี และภาษาอ้างอิงเป้าหมายเดียวกัน",
    example:
      "ก่อนทำโปสเตอร์รับสมัคร ต้องรู้วันรับสมัคร กลุ่มผู้เรียน ช่องทางเผยแพร่ ขนาดงาน และภาพลักษณ์ของวิทยาลัย",
    mini: {
      kind: "multi",
      prompt: "เลือกข้อมูล 4 กลุ่มที่ต้องถามลูกค้าก่อนเริ่มออกแบบ",
      instruction: "เลือกให้ครบ 4 ใบ แล้วกดตรวจ Brief",
      options: [
        { icon: "🎯", label: "เป้าหมายของงาน", detail: "งานนี้ต้องการให้ผู้ชมทำหรือเข้าใจอะไร" },
        { icon: "👥", label: "กลุ่มเป้าหมาย", detail: "เรากำลังสื่อสารกับใคร" },
        { icon: "📐", label: "ช่องทางและขนาด", detail: "โพสต์ โปสเตอร์ หรือสื่อรูปแบบใด" },
        { icon: "⏳", label: "เวลาและข้อจำกัด", detail: "กำหนดส่ง งบประมาณ และสิ่งที่ต้องรักษา" },
        { icon: "✨", label: "เอฟเฟกต์ที่ดูเท่", detail: "เลือกก่อนรู้เป้าหมาย" },
        { icon: "📤", label: "ส่งออกไฟล์ทันที", detail: "ข้ามการวางแผนทั้งหมด" },
      ],
      answers: [0, 1, 2, 3],
      hint: "คิดถึงข้อมูลที่ช่วยให้ทีมตัดสินใจได้ ไม่ใช่การตกแต่งหรือส่งงานก่อนเวลา",
    },
  },
  {
    id: "planning",
    order: 2,
    zone: "graphic",
    npcId: "mentor",
    title: "สร้างแผนปฏิบัติการ",
    english: "PLANNING",
    icon: "🗓️",
    badge: "Plan Core",
    objective: "กลับไปหาอาจารย์พิกเซลที่ลานกลาง",
    dialogue: [
      "ได้ Brief แล้ว แต่ถ้าทุกคนลงมือพร้อมกันโดยไม่มีลำดับ งานก็อาจชนกันและส่งไม่ทัน",
      "Planning คือการเปลี่ยนข้อมูลให้เป็นแผน กำหนดงาน เวลา ผู้รับผิดชอบ ขนาดสื่อ และทรัพยากร",
      "จัด Timeline ให้ถูกลำดับ แล้ว Media Core ชิ้นที่สองจะตอบสนอง",
    ],
    summary:
      "Planning คือการแปลง Brief เป็นแผนงานจริง กำหนดลำดับ เวลา ผู้รับผิดชอบ ขนาดสื่อ ไฟล์ และทรัพยากร",
    importance:
      "แผนที่ชัดช่วยควบคุมเวลา เห็นความเสี่ยงล่วงหน้า และทำให้ทุกคนรู้ว่างานของตนเชื่อมต่อกับทีมอย่างไร",
    example:
      "ชุดประชาสัมพันธ์หนึ่งงานอาจมีโปสเตอร์ โพสต์แนวตั้ง และภาพปก จึงต้องกำหนดขนาดและวันตรวจงานแต่ละชิ้น",
    mini: {
      kind: "order",
      prompt: "เรียง Timeline การทำงานจากต้นทางไปปลายทาง",
      instruction: "แตะการ์ดทีละใบเพื่อวางลงใน Timeline",
      options: [
        { icon: "🎨", label: "ลงมือออกแบบ", detail: "ผลิตชิ้นงานตามแผน" },
        { icon: "📋", label: "สรุป Brief", detail: "ยืนยันเป้าหมายและขอบเขต" },
        { icon: "🗓️", label: "กำหนดงานและเวลา", detail: "แบ่งช่วงทำงานและวันตรวจ" },
        { icon: "🧰", label: "เตรียมทรัพยากร", detail: "รวบรวมภาพ ฟอนต์ และข้อมูล" },
      ],
      correctOrder: [1, 2, 3, 0],
      hint: "ต้องรู้โจทย์ก่อน จึงวางเวลา เตรียมของ และเริ่มผลิตได้",
    },
  },
  {
    id: "concept",
    order: 3,
    zone: "graphic",
    npcId: "designer",
    title: "เลือกพลังแห่งแนวคิด",
    english: "CONCEPT DESIGN",
    icon: "💡",
    badge: "Idea Core",
    objective: "กลับไปหาพี่เมย์ที่ Creative Lab",
    dialogue: [
      "ถึงเวลาสร้าง Concept! โจทย์คือ Open House ภายใต้แนวคิด “เปิดประตูสู่อนาคต”",
      "Mood & Tone สี ฟอนต์ และภาพต้องเล่าเรื่องไปในทิศทางเดียวกัน ไม่ใช่แค่หยิบสิ่งที่ชอบมารวมกัน",
      "เลือก Moodboard ที่ตอบ Key Message และกลุ่มเป้าหมายที่สุด",
    ],
    summary:
      "Concept Design คือการหา Key Message และกำหนด Mood & Tone สี ตัวอักษร ภาพ รวมถึงร่างหลายแนวทางก่อนเลือก",
    importance:
      "แนวคิดที่ดีทำให้องค์ประกอบทุกส่วนสื่อสารไปทางเดียวกัน งานจึงทั้งสวยและตอบโจทย์ Brief",
    example:
      "แนวคิด “เปิดประตูสู่อนาคต” ใช้ภาพประตู แสงสดใส รูปทรงทันสมัย และภาษาที่เป็นมิตร",
    mini: {
      kind: "single",
      prompt: "Moodboard ใดเหมาะกับ “เปิดประตูสู่อนาคต” สำหรับนักเรียนรุ่นใหม่?",
      instruction: "เลือกทิศทางภาพที่สื่อสารตรงโจทย์ที่สุด",
      options: [
        { icon: "🌑", label: "Mystery Night", detail: "ดำ เทา ฟอนต์สยอง และภาพหมอก", accent: "#30354d" },
        { icon: "🚪", label: "Bright Future", detail: "ฟ้า เหลือง แสงสดใส รูปทรงทันสมัย", accent: "#38a9e8" },
        { icon: "♛", label: "Luxury Classic", detail: "ดำ ทอง ลายหรู และตัวอักษรทางการ", accent: "#c49b45" },
      ],
      answers: [1],
      hint: "มองหาทิศทางที่ให้ความรู้สึกเปิดกว้าง ทันสมัย เป็นมิตร และเชื่อมกับคำว่าอนาคต",
    },
  },
  {
    id: "mockup",
    order: 4,
    zone: "graphic",
    npcId: "designer",
    title: "ตรวจต้นแบบก่อนผลิต",
    english: "MOCKUP",
    icon: "🖼️",
    badge: "Prototype Core",
    objective: "คุยกับพี่เมย์เพื่อตรวจ Mockup",
    dialogue: [
      "แบบแรกพร้อมแล้ว แต่บนหน้าจออย่างเดียวอาจหลอกตาเราได้",
      "Mockup ช่วยจำลองงานในบริบทจริง เพื่อตรวจสัดส่วน การอ่าน ระยะตัดตก และตำแหน่งสำคัญก่อนผลิต",
      "ช่วยสแกนโปสเตอร์จำลองและระบุปัญหาที่ต้องแก้ให้ครบ",
    ],
    summary:
      "Mockup คือการนำแบบไปจำลองในบริบทใช้งานจริง เพื่อตรวจสัดส่วน ลำดับสายตา การอ่าน และพื้นที่ปลอดภัย",
    importance:
      "การเห็นต้นแบบก่อนผลิตช่วยประหยัดเวลาและงบ ทำให้ผู้เกี่ยวข้องตัดสินใจง่าย และพบปัญหาที่มองไม่เห็นในไฟล์",
    example:
      "วางปกหนังสือบนภาพจำลองหนังสือจริง เพื่อตรวจว่าชื่อเรื่องเด่นและองค์ประกอบไม่หายตรงสันหรือขอบตัด",
    mini: {
      kind: "multi",
      prompt: "สแกน Mockup แล้วเลือก 3 จุดเสี่ยงที่ควรแก้ก่อนผลิตจริง",
      instruction: "เลือกปัญหาที่กระทบการสื่อสารหรือการผลิต",
      options: [
        { icon: "🔎", label: "วันเวลาเล็กเกินไป", detail: "ข้อมูลสำคัญอ่านไม่ทันเมื่อมองไกล" },
        { icon: "◩", label: "โลโก้ชิดขอบตัด", detail: "มีโอกาสถูกตัดหายระหว่างผลิต" },
        { icon: "◐", label: "ตัวอักษรกลืนพื้น", detail: "Contrast ต่ำจนอ่านข้อความยาก" },
        { icon: "✓", label: "ภาพหลักตรง Concept", detail: "สื่อแนวคิดเปิดประตูสู่อนาคต" },
        { icon: "✓", label: "ขนาดไฟล์ตรงช่องทาง", detail: "อัตราส่วนเหมาะกับพื้นที่เผยแพร่" },
      ],
      answers: [0, 1, 2],
      hint: "เลือกสิ่งที่ทำให้อ่านยาก เสี่ยงถูกตัด หรือสร้างปัญหาในการใช้งานจริง",
    },
  },
  {
    id: "revision",
    order: 5,
    zone: "graphic",
    npcId: "mentor",
    title: "คัดกรอง Feedback",
    english: "FEEDBACK & REVISION",
    icon: "🔁",
    badge: "Revision Core",
    objective: "นำ Mockup กลับไปหาอาจารย์พิกเซล",
    dialogue: [
      "Feedback เข้ามาหลายแบบ บางข้อช่วยให้งานดีขึ้น แต่บางข้อยังคลุมเครือจนลงมือแก้ไม่ได้",
      "นักออกแบบต้องฟังเหตุผล เทียบกับ Brief และเปลี่ยนความคิดเห็นให้เป็นประเด็นที่ตรวจสอบได้",
      "จัดข้อความในกล่อง Feedback ให้ถูกประเภท แล้วแก้งานอย่างมีหลักการ",
    ],
    summary:
      "Feedback & Revision คือการรวบรวมข้อเสนอแนะ เทียบกับ Brief แยกประเด็น แล้วแก้พร้อมตรวจข้อมูล สี และไฟล์อีกครั้ง",
    importance:
      "Feedback ที่มีเหตุผลช่วยพบจุดที่ทีมมองข้าม ส่วนการแก้แบบอ้างอิงเป้าหมายทำให้งานดีขึ้นโดยไม่หลงตามความชอบส่วนตัว",
    example:
      "เมื่อกลุ่มทดลองหาเวลาในโปสเตอร์ไม่เจอ ทีมจึงขยายวันเวลาและเพิ่ม Contrast โดยยังรักษา Concept เดิม",
    mini: {
      kind: "classify",
      prompt: "แยก Feedback ที่นำไปแก้ได้ กับความคิดเห็นที่ยังต้องถามเพิ่ม",
      instruction: "เลือก “ใช้แก้งานได้” หรือ “ต้องถามเพิ่ม” ให้ทุกข้อความ",
      options: [
        { icon: "💬", label: "เพิ่มขนาดวันเวลา", detail: "กลุ่มทดลอง 4 ใน 5 คนหาไม่เจอ" },
        { icon: "💭", label: "ทำให้สวยกว่านี้", detail: "ยังไม่บอกว่าส่วนใดหรือเพื่ออะไร" },
        { icon: "🎨", label: "ปรับสีหัวข้อให้ Contrast สูงขึ้น", detail: "ข้อความอ่านยากเมื่อดูบนมือถือ" },
        { icon: "🤔", label: "ผมไม่ชอบ ลองเปลี่ยนทั้งหมด", detail: "ยังไม่มีเหตุผลที่เชื่อมกับ Brief" },
      ],
      classifications: ["useful", "vague", "useful", "vague"],
      hint: "Feedback ที่ดีระบุปัญหา เหตุผล หรือผลต่อผู้ชมได้ชัดเจน",
    },
  },
  {
    id: "pre-production",
    order: 6,
    zone: "video",
    npcId: "director",
    title: "วางแผนกองถ่าย",
    english: "PRE-PRODUCTION",
    icon: "✍️",
    badge: "Prep Core",
    objective: "ข้ามไปพบพี่นนท์ที่ Video Studio",
    dialogue: [
      "ฝั่งกราฟิกพร้อมแล้ว ต่อไปเราต้องผลิตคลิปแนะนำแผนก 1 นาที",
      "ก่อนกด REC ต้องมีบท Storyboard, Shot List, สถานที่ คน ตารางถ่าย และอุปกรณ์ให้พร้อม",
      "ช่วยจัดกระเป๋า Pre-Production ให้เป็นลำดับ ทีมกองถ่ายกำลังรอเราอยู่!",
    ],
    summary:
      "Pre-Production คือการวางแผนก่อนถ่าย ตั้งแต่แนวคิด บท Storyboard, Shot List, สถานที่ ทีม ตาราง และอุปกรณ์",
    importance:
      "การเตรียมละเอียดช่วยลดปัญหาหน้างาน ประหยัดเวลาและงบ และทำให้ทุกคนเห็นภาพวิดีโอเดียวกัน",
    example:
      "ก่อนถ่ายคลิปแนะนำแผนก ทีมเขียนบท แบ่งช็อต ตรวจสถานที่ และเตรียมกล้อง ไมค์ ไฟ รวมถึงอุปกรณ์สำรอง",
    mini: {
      kind: "order",
      prompt: "เรียงลำดับเอกสารเตรียมกองถ่ายให้ทีมทำงานต่อกันได้",
      instruction: "แตะการ์ดทีละใบเพื่อจัด Workflow",
      options: [
        { icon: "▦", label: "ทำ Shot List", detail: "ระบุช็อต มุม และสิ่งที่ต้องถ่าย" },
        { icon: "🎒", label: "เตรียมคน สถานที่ อุปกรณ์", detail: "เช็กความพร้อมก่อนวันจริง" },
        { icon: "✍️", label: "เขียนบท", detail: "กำหนดเรื่องราวและสารที่จะสื่อ" },
        { icon: "▤", label: "วาง Storyboard", detail: "เปลี่ยนบทเป็นภาพต่อเนื่อง" },
      ],
      correctOrder: [2, 3, 0, 1],
      hint: "เริ่มจากเรื่องราว เปลี่ยนเป็นภาพ ระบุช็อต แล้วจึงเตรียมทรัพยากร",
    },
  },
  {
    id: "production",
    order: 7,
    zone: "video",
    npcId: "director",
    title: "ภารกิจหน้าเซต",
    english: "PRODUCTION",
    icon: "🎥",
    badge: "Shoot Core",
    objective: "คุยกับพี่นนท์เพื่อเริ่มถ่ายทำ",
    dialogue: [
      "กล้องพร้อม นักแสดงพร้อม แต่ก่อนเริ่มแต่ละ Take เราต้องตรวจสิ่งที่แก้ภายหลังได้ยาก",
      "Production คือการควบคุมภาพ แสง การแสดง เสียง และความต่อเนื่อง พร้อมตรวจไฟล์ระหว่างถ่าย",
      "เลือก 3 ระบบสำคัญที่ต้องเช็กก่อนพี่นนท์ตะโกนว่า Action!",
    ],
    summary:
      "Production คือการถ่ายภาพและเก็บเสียงตามแผน ควบคุมมุมกล้อง แสง การแสดง คุณภาพเสียง และสำรองไฟล์",
    importance:
      "ภาพและเสียงต้นฉบับที่ดีทำให้ตัดต่อง่าย เพราะเสียงแตก ภาพหลุดโฟกัส หรือช็อตขาดอาจแก้ภายหลังไม่ได้",
    example:
      "ระหว่างสัมภาษณ์ ทีมจัดไฟ ติดไมค์ใกล้ผู้พูด เช็กเสียงรบกวน ถ่าย B-roll และสำรองไฟล์ทุกช่วง",
    mini: {
      kind: "multi",
      prompt: "ก่อนกด REC เลือก 3 ระบบที่ต้องขึ้นสถานะ READY",
      instruction: "เลือกเฉพาะสิ่งที่ต้องตรวจในกองถ่าย",
      options: [
        { icon: "📷", label: "Focus & Exposure", detail: "ภาพคมชัดและความสว่างเหมาะสม" },
        { icon: "🎙️", label: "Audio Level", detail: "เสียงไม่เบา ไม่แตก และไม่มีเสียงรบกวน" },
        { icon: "💡", label: "Light & Continuity", detail: "แสงและรายละเอียดต่อเนื่องระหว่างช็อต" },
        { icon: "👍", label: "จำนวนยอดไลก์", detail: "ยังไม่เกิดขึ้นในวันถ่ายทำ" },
        { icon: "✨", label: "Transition สุดท้าย", detail: "เป็นงานในขั้นตัดต่อ" },
      ],
      answers: [0, 1, 2],
      hint: "เลือกสิ่งที่เกี่ยวกับคุณภาพภาพ เสียง และความต่อเนื่องที่ต้องเก็บจากกองถ่าย",
    },
  },
  {
    id: "post-production",
    order: 8,
    zone: "video",
    npcId: "editor",
    title: "ประกอบเรื่องราว",
    english: "POST-PRODUCTION",
    icon: "✂️",
    badge: "Final Cut Core",
    objective: "นำไฟล์ไปหาพี่แพรวที่ห้องตัดต่อ",
    dialogue: [
      "รับไฟล์จากกองถ่ายแล้ว! ตอนนี้เราต้องเปลี่ยนวัตถุดิบทั้งหมดให้เป็นเรื่องราว 1 นาทีที่กระชับและน่าจดจำ",
      "Post-Production ครอบคลุมการคัดช็อต ตัดต่อ ปรับสี กราฟิก เอฟเฟกต์ มิกซ์เสียง ตรวจทาน และส่งออก",
      "เรียง Workflow ห้องตัดต่อให้ถูกต้อง แล้วปลุก Media Core ชิ้นสุดท้าย!",
    ],
    summary:
      "Post-Production คือการคัดและเรียงช็อต ตัดต่อ ปรับสี ใส่กราฟิกหรือเอฟเฟกต์ มิกซ์เสียง ตรวจ และส่งออก",
    importance:
      "ขั้นนี้เปลี่ยนภาพและเสียงจากกองถ่ายให้เป็นเรื่องราวที่สมบูรณ์ มีจังหวะ เข้าใจง่าย และพร้อมสื่อสารกับผู้ชม",
    example:
      "คลิปแนะนำแผนกถูกตัดเหลือ 1 นาที ใส่ชื่อ ลดเสียงรบกวน เติมเพลง ปรับสี และตรวจคำก่อนส่งออก",
    mini: {
      kind: "order",
      prompt: "เรียง Workflow ห้องตัดต่อจากรับไฟล์จนพร้อมเผยแพร่",
      instruction: "แตะการ์ดทีละใบเพื่อประกอบ Timeline สุดท้าย",
      options: [
        { icon: "🎚️", label: "ปรับสีและใส่กราฟิก", detail: "สร้างภาพรวมและข้อมูลประกอบ" },
        { icon: "📦", label: "สำรองและจัดระเบียบไฟล์", detail: "แยกภาพ เสียง และตั้งชื่อให้ค้นง่าย" },
        { icon: "🎵", label: "มิกซ์เสียง ตรวจ และส่งออก", detail: "ทำระดับเสียงและไฟล์ปลายทาง" },
        { icon: "✂️", label: "Rough Cut", detail: "เลือกและเรียงช็อตเพื่อสร้างเรื่อง" },
      ],
      correctOrder: [1, 3, 0, 2],
      hint: "จัดไฟล์ก่อน เล่าเรื่องด้วย Rough Cut แล้วจึงแต่งภาพ ก่อนจบด้วยเสียงและการส่งออก",
    },
  },
];

const missionIds = missions.map((mission) => mission.id);

const openingLines = [
  "ยินดีต้อนรับกลับสู่ Media Campus นักออกแบบฝึกหัด!",
  "คืนนี้เกิด Pixel Storm ทำให้ Media Core ทั้ง 8 ชิ้นแตกกระจาย งาน Open House จึงหยุดชะงัก",
  "ภารกิจของเธอคือช่วยทีมสร้างสื่อ ตั้งแต่ Briefing จนถึง Post-Production เพื่อปลุก Core ทุกชิ้น",
  "เดินตามลูกศร ไปคุยกับพี่เมย์ที่ Creative Lab ก่อน ที่นี่ไม่มีแพ้และไม่มีหักคะแนน พร้อมแล้วออกเดินทางได้เลย!",
];

const finaleLines = [
  "ยอดเยี่ยม! Media Core ทั้ง 8 ชิ้นกลับมาทำงานพร้อมกันแล้ว",
  "เธอไม่ได้แค่จำชื่อขั้นตอน แต่ได้ตัดสินใจแบบนักออกแบบและทีมผลิตวิดีโอจริง",
  "พลังต่อไปคือการนำความรู้นี้ไปสร้าง Infographic หรือ Digital Brochure ด้วยภาษาของตนเอง",
];

export default function PixelMediaGame() {
  const [screen, setScreen] = useState<"title" | "game">("title");
  const [completed, setCompleted] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [playerDirection, setPlayerDirection] =
    useState<MoveDirection>("down");
  const [isWalking, setIsWalking] = useState(false);
  const [currentScene, setCurrentScene] = useState<SceneId>("campus");
  const [currentZone, setCurrentZone] = useState<Zone>("plaza");
  const [nearbyNpcId, setNearbyNpcId] = useState<NpcId | null>(null);
  const [nearbyObjectId, setNearbyObjectId] = useState<string | null>(null);
  const [startedMissionId, setStartedMissionId] = useState<string | null>(null);
  const [collectedQuestItems, setCollectedQuestItems] = useState<string[]>([]);
  const [dialogue, setDialogue] = useState<DialogueState | null>(null);
  const [miniMission, setMiniMission] = useState<Mission | null>(null);
  const [miniResult, setMiniResult] = useState<"idle" | "wrong" | "correct">(
    "idle",
  );
  const [selected, setSelected] = useState<number[]>([]);
  const [ordered, setOrdered] = useState<number[]>([]);
  const [classifications, setClassifications] = useState<
    Record<number, Classification>
  >({});
  const [reward, setReward] = useState<Mission | null>(null);
  const [finale, setFinale] = useState(false);
  const [questLogOpen, setQuestLogOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [liteEffects, setLiteEffects] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [joystickVector, setJoystickVector] = useState({ x: 0, y: 0 });
  const [joystickActive, setJoystickActive] = useState(false);

  const keyboardDirections = useRef(new Set<MoveDirection>());
  const padDirections = useRef(new Set<MoveDirection>());
  const walkingRef = useRef(false);
  const directionRef = useRef<MoveDirection>("down");
  const playerPositionRef = useRef({ ...PLAYER_START });
  const nearbyNpcRef = useRef<NpcId | null>(null);
  const nearbyObjectRef = useRef<string | null>(null);
  const zoneRef = useRef<Zone>("plaza");
  const worldSizeRef = useRef({ width: 0, height: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const playerElementRef = useRef<HTMLDivElement>(null);
  const compassArrowRef = useRef<HTMLSpanElement>(null);
  const distanceLabelRef = useRef<HTMLElement>(null);
  const startMovementLoopRef = useRef<() => void>(() => undefined);
  const stopMovementLoopRef = useRef<() => void>(() => undefined);
  const toastTimerRef = useRef<number | null>(null);
  const joystickRef = useRef<HTMLDivElement>(null);
  const joystickPointerRef = useRef<number | null>(null);
  const audioEngineRef = useRef<{
    context: AudioContext;
    timer: number;
    step: number;
  } | null>(null);

  const currentMission = useMemo(
    () => missions.find((mission) => !completed.includes(mission.id)) ?? null,
    [completed],
  );

  const currentRoute = useMemo(
    () => getQuestRoute(currentMission?.id),
    [currentMission],
  );

  const sceneConfig = SCENES[currentScene];

  const sceneNpcs = useMemo(
    () => npcs.filter((npc) => npc.scene === currentScene),
    [currentScene],
  );

  const scenePortals = useMemo(
    () => getScenePortals(currentScene),
    [currentScene],
  );

  const missingQuestItems = useMemo(
    () =>
      currentRoute?.items.filter(
        (item) => !collectedQuestItems.includes(item.id),
      ) ?? [],
    [collectedQuestItems, currentRoute],
  );

  const adventureObjects = useMemo<AdventureObject[]>(() => {
    const portalObjects = scenePortals.map((portal) => ({
      id: portal.id,
      kind: "portal" as const,
      label: portal.label,
      detail:
        completed.length >= portal.minimumCompleted
          ? "ประตูพร้อมใช้งาน"
          : `ต้องมี Media Core ${portal.minimumCompleted} ชิ้น`,
      icon: portal.icon,
      position: portal.position,
      portal,
    }));
    if (
      !currentMission ||
      !currentRoute ||
      currentRoute.scene !== currentScene ||
      startedMissionId !== currentMission.id
    ) {
      return portalObjects;
    }
    const itemObjects = currentRoute.items
      .filter((item) => !collectedQuestItems.includes(item.id))
      .map((item) => ({
        id: `item-${currentMission.id}-${item.id}`,
        kind: "item" as const,
        label: item.label,
        detail: item.detail,
        icon: item.icon,
        position: item.position,
        item,
      }));
    return [
      ...portalObjects,
      ...itemObjects,
      {
        id: `station-${currentMission.id}`,
        kind: "station" as const,
        label: currentRoute.station.label,
        detail: currentRoute.station.action,
        icon: currentRoute.station.icon,
        position: currentRoute.station.position,
      },
    ];
  }, [
    collectedQuestItems,
    completed.length,
    currentMission,
    currentRoute,
    currentScene,
    scenePortals,
    startedMissionId,
  ]);

  const objectiveTarget = useMemo(() => {
    if (!currentMission || !currentRoute) {
      if (currentScene === "campus") {
        return {
          id: "npc-mentor",
          label: "กลับไปหาอาจารย์พิกเซล",
          name: "อาจารย์พิกเซล",
          icon: "★",
          position: npcs[0].position,
        };
      }
      const exit = scenePortals.find((portal) => portal.destination === "campus");
      return {
        id: exit?.id ?? "exit",
        label: "กลับ Media Campus",
        name: "ทางออก",
        icon: "↩",
        position: exit?.position ?? { x: 50, y: 90 },
      };
    }

    if (currentScene !== currentRoute.scene) {
      const portal =
        currentScene === "campus"
          ? getPortalToScene(currentRoute.scene)
          : scenePortals.find((item) => item.destination === "campus") ?? null;
      return {
        id: portal?.id ?? "change-scene",
        label:
          currentScene === "campus"
            ? `เข้า ${SCENES[currentRoute.scene].name}`
            : "กลับ Media Campus ก่อน",
        name: portal?.label ?? "ทางไปภารกิจ",
        icon: portal?.icon ?? "◆",
        position: portal?.position ?? { x: 50, y: 90 },
      };
    }

    if (startedMissionId !== currentMission.id) {
      const npc = npcs.find((item) => item.id === currentRoute.npcId) ?? npcs[0];
      return {
        id: `npc-${npc.id}`,
        label: `คุยกับ ${npc.name} เพื่อรับภารกิจ`,
        name: npc.name,
        icon: "!",
        position: npc.position,
      };
    }

    if (missingQuestItems.length > 0) {
      const item = missingQuestItems[0];
      return {
        id: `item-${currentMission.id}-${item.id}`,
        label: `ค้นหา: ${item.label}`,
        name: item.label,
        icon: item.icon,
        position: item.position,
      };
    }

    return {
      id: `station-${currentMission.id}`,
      label: `ไปที่ ${currentRoute.station.label}`,
      name: currentRoute.station.label,
      icon: currentRoute.station.icon,
      position: currentRoute.station.position,
    };
  }, [
    currentMission,
    currentRoute,
    currentScene,
    missingQuestItems,
    scenePortals,
    startedMissionId,
  ]);

  const nearbyNpc = useMemo(
    () => npcs.find((npc) => npc.id === nearbyNpcId) ?? null,
    [nearbyNpcId],
  );

  const nearbyObject = useMemo(
    () =>
      adventureObjects.find((object) => object.id === nearbyObjectId) ?? null,
    [adventureObjects, nearbyObjectId],
  );

  const canContinue =
    completed.length > 0 ||
    startedMissionId !== null ||
    currentScene !== "campus";

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2200);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        let normalizedProgress: string[] = [];
        const saved = window.localStorage.getItem(
          "pixel-media-quest-progress",
        );
        if (saved) {
          const ids = JSON.parse(saved) as string[];
          normalizedProgress = normalizeProgress(ids, missionIds);
          setCompleted(normalizedProgress);
        }
        const savedAdventure = window.localStorage.getItem(
          "pixel-media-quest-adventure-v1",
        );
        if (savedAdventure) {
          const adventure = JSON.parse(savedAdventure) as {
            scene?: SceneId;
            startedMissionId?: string | null;
            items?: string[];
            position?: Position;
          };
          const nextMissionId = missionIds[normalizedProgress.length];
          const savedScene =
            adventure.scene && SCENES[adventure.scene]
              ? adventure.scene
              : "campus";
          const savedPosition = adventure.position;
          const config = SCENES[savedScene];
          setCurrentScene(savedScene);
          if (
            savedPosition &&
            canOccupyPosition(
              savedPosition,
              [],
              config.obstacles,
              config.bounds,
            )
          ) {
            playerPositionRef.current = savedPosition;
          }
          if (adventure.startedMissionId === nextMissionId) {
            const route = getQuestRoute(nextMissionId);
            setStartedMissionId(nextMissionId);
            setCollectedQuestItems(
              (adventure.items ?? []).filter((id) =>
                route?.items.some((item) => item.id === id),
              ),
            );
          }
        }
        const savedSound = window.localStorage.getItem(
          "pixel-media-quest-sound",
        );
        if (savedSound !== null) setSoundOn(savedSound === "true");
        const savedEffects = window.localStorage.getItem(
          "pixel-media-quest-lite-effects",
        );
        if (savedEffects !== null) {
          setLiteEffects(savedEffects === "true");
        } else {
          setLiteEffects(
            window.matchMedia("(prefers-reduced-motion: reduce)").matches,
          );
        }
      } catch {
        // The game remains fully playable without browser storage.
      }
      setLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const saveCompleted = useCallback((ids: string[]) => {
    const orderedIds = normalizeProgress(ids, missionIds);
    setCompleted(orderedIds);
    try {
      window.localStorage.setItem(
        "pixel-media-quest-progress",
        JSON.stringify(orderedIds),
      );
    } catch {
      // Progress remains available for the current visit.
    }
  }, []);

  const persistAdventure = useCallback(
    (overrides: {
      scene?: SceneId;
      startedMissionId?: string | null;
      items?: string[];
      position?: Position;
    } = {}) => {
      try {
        window.localStorage.setItem(
          "pixel-media-quest-adventure-v1",
          JSON.stringify({
            scene: overrides.scene ?? currentScene,
            startedMissionId:
              overrides.startedMissionId === undefined
                ? startedMissionId
                : overrides.startedMissionId,
            items: overrides.items ?? collectedQuestItems,
            position: overrides.position ?? playerPositionRef.current,
          }),
        );
      } catch {
        // The adventure remains playable without persistent storage.
      }
    },
    [collectedQuestItems, currentScene, startedMissionId],
  );

  const stopMusic = useCallback(() => {
    const engine = audioEngineRef.current;
    if (!engine) return;
    window.clearInterval(engine.timer);
    void engine.context.close();
    audioEngineRef.current = null;
  }, []);

  const startMusic = useCallback(
    (force = false) => {
      if (!soundOn && !force) return;
      if (audioEngineRef.current) {
        void audioEngineRef.current.context.resume();
        return;
      }
      const AudioContextClass =
        window.AudioContext ||
        (
          window as unknown as {
            webkitAudioContext?: typeof AudioContext;
          }
        ).webkitAudioContext;
      if (!AudioContextClass) return;

      const context = new AudioContextClass();
      const engine = { context, timer: 0, step: 0 };
      const patterns: Record<Zone, number[]> = {
        plaza: [261.63, 329.63, 392, 329.63, 293.66, 349.23, 440, 349.23],
        graphic: [329.63, 392, 493.88, 392, 349.23, 440, 523.25, 440],
        video: [220, 293.66, 329.63, 440, 246.94, 329.63, 369.99, 493.88],
      };

      const tick = () => {
        if (context.state === "suspended") return;
        const pattern = patterns[zoneRef.current];
        const frequency = pattern[engine.step % pattern.length];
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = zoneRef.current === "video" ? "square" : "triangle";
        oscillator.frequency.setValueAtTime(frequency, context.currentTime);
        gain.gain.setValueAtTime(0.0001, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(
          zoneRef.current === "video" ? 0.028 : 0.022,
          context.currentTime + 0.015,
        );
        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          context.currentTime + 0.22,
        );
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.24);
        engine.step += 1;
      };

      tick();
      engine.timer = window.setInterval(tick, 315);
      audioEngineRef.current = engine;
    },
    [soundOn],
  );

  const playSfx = useCallback((kind: "talk" | "success" | "error") => {
    const engine = audioEngineRef.current;
    if (!engine) return;
    const context = engine.context;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "square";
    const frequencies = {
      talk: 620,
      success: 880,
      error: 180,
    };
    oscillator.frequency.setValueAtTime(frequencies[kind], context.currentTime);
    if (kind === "success") {
      oscillator.frequency.exponentialRampToValueAtTime(
        1320,
        context.currentTime + 0.16,
      );
    }
    gain.gain.setValueAtTime(0.035, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      context.currentTime + 0.18,
    );
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.2);
  }, []);

  useEffect(
    () => () => {
      stopMusic();
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    },
    [stopMusic],
  );

  const updateCamera = useCallback((position = playerPositionRef.current) => {
    const scene = sceneRef.current;
    const viewport = viewportRef.current;
    if (!scene || !viewport) return;
    const world = worldSizeRef.current;
    const viewportWidth = viewport.clientWidth;
    const viewportHeight = viewport.clientHeight;
    const playerX = (position.x / 100) * world.width;
    const playerY = (position.y / 100) * world.height;
    const cameraX = clamp(
      viewportWidth / 2 - playerX,
      viewportWidth - world.width,
      0,
    );
    const cameraY = clamp(
      viewportHeight / 2 - playerY,
      viewportHeight - world.height,
      0,
    );
    scene.style.transform =
      "translate3d(" + cameraX + "px," + cameraY + "px,0)";
  }, []);

  const updatePlayerVisual = useCallback(
    (position = playerPositionRef.current) => {
      const player = playerElementRef.current;
      if (!player) return;
      const world = worldSizeRef.current;
      player.style.left = "0px";
      player.style.top = "0px";
      player.style.setProperty(
        "--player-x",
        (position.x / 100) * world.width + "px",
      );
      player.style.setProperty(
        "--player-y",
        (position.y / 100) * world.height + "px",
      );
      player.style.zIndex = String(getDepthIndex(position));
      player.dataset.position =
        position.x.toFixed(2) + "," + position.y.toFixed(2);
      updateCamera(position);
    },
    [updateCamera],
  );

  const movePlayer = useCallback(
    (dx: number, dy: number) => {
      const current = playerPositionRef.current;
      const npcPositions = sceneNpcs.map((npc) => npc.position);
      const next = resolveMovement(
        current,
        dx,
        dy,
        npcPositions,
        sceneConfig.obstacles,
        sceneConfig.bounds,
      );
      playerPositionRef.current = next;
      updatePlayerVisual(next);
      return next;
    },
    [sceneConfig.bounds, sceneConfig.obstacles, sceneNpcs, updatePlayerVisual],
  );

  const syncWorldStatus = useCallback(
    (position = playerPositionRef.current) => {
      let nearest: Npc | null = null;
      let nearestDistance = Number.POSITIVE_INFINITY;
      sceneNpcs.forEach((npc) => {
        const npcDistance = distance(position, npc.position);
        if (npcDistance < nearestDistance) {
          nearest = npc;
          nearestDistance = npcDistance;
        }
      });
      const nextNearbyId =
        nearestDistance <= INTERACTION_DISTANCE ? nearest?.id ?? null : null;
      if (nearbyNpcRef.current !== nextNearbyId) {
        nearbyNpcRef.current = nextNearbyId;
        setNearbyNpcId(nextNearbyId);
      }

      let nearestObject: AdventureObject | null = null;
      let nearestObjectDistance = Number.POSITIVE_INFINITY;
      adventureObjects.forEach((object) => {
        const objectDistance = distance(position, object.position);
        if (objectDistance < nearestObjectDistance) {
          nearestObject = object;
          nearestObjectDistance = objectDistance;
        }
      });
      const nextNearbyObjectId =
        nearestObjectDistance <= INTERACTION_DISTANCE
          ? nearestObject?.id ?? null
          : null;
      if (nearbyObjectRef.current !== nextNearbyObjectId) {
        nearbyObjectRef.current = nextNearbyObjectId;
        setNearbyObjectId(nextNearbyObjectId);
      }

      const nextZone: Zone =
        currentScene === "creative-lab"
          ? "graphic"
          : currentScene === "production-studio" ||
              currentScene === "editing-suite"
            ? "video"
            : getZoneForPosition(position);
      if (zoneRef.current !== nextZone) {
        zoneRef.current = nextZone;
        setCurrentZone(nextZone);
      }

      const dx = objectiveTarget.position.x - position.x;
      const dy = objectiveTarget.position.y - position.y;
      const targetDistance = Math.hypot(dx, dy);
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
      compassArrowRef.current?.style.setProperty(
        "--compass-angle",
        angle + "deg",
      );
      if (distanceLabelRef.current) {
        distanceLabelRef.current.textContent =
          targetDistance <= INTERACTION_DISTANCE
            ? "ถึงเป้าหมายแล้ว"
            : targetDistance < 22
              ? "อยู่ใกล้มาก"
              : "ตามลูกศรไป";
      }
    },
    [adventureObjects, currentScene, objectiveTarget, sceneNpcs],
  );

  useEffect(() => {
    if (screen !== "game") return;
    const scene = sceneRef.current;
    const viewport = viewportRef.current;
    if (!scene || !viewport) return;

    const updateLayout = () => {
      const viewportWidth = viewport.clientWidth;
      const viewportHeight = viewport.clientHeight;
      let worldWidth = Math.max(
        viewportWidth,
        viewportHeight * WORLD_RATIO,
      );
      let worldHeight = worldWidth / WORLD_RATIO;
      if (worldHeight < viewportHeight) {
        worldHeight = viewportHeight;
        worldWidth = worldHeight * WORLD_RATIO;
      }
      worldWidth *= sceneConfig.zoom;
      worldHeight *= sceneConfig.zoom;
      worldSizeRef.current = {
        width: worldWidth,
        height: worldHeight,
      };
      scene.style.width = worldWidth + "px";
      scene.style.height = worldHeight + "px";
      updatePlayerVisual();
      syncWorldStatus();
    };

    updateLayout();
    window.addEventListener("resize", updateLayout, { passive: true });
    return () => window.removeEventListener("resize", updateLayout);
  }, [currentScene, sceneConfig.zoom, screen, syncWorldStatus, updatePlayerVisual]);

  const haltMovement = useCallback(() => {
    keyboardDirections.current.clear();
    padDirections.current.clear();
    stopMovementLoopRef.current();
    if (walkingRef.current) {
      walkingRef.current = false;
      setIsWalking(false);
    }
  }, []);

  const faceDirection = useCallback((direction: MoveDirection) => {
    if (directionRef.current === direction) return;
    directionRef.current = direction;
    setPlayerDirection(direction);
  }, []);

  const resetMiniState = useCallback(() => {
    setMiniResult("idle");
    setSelected([]);
    setOrdered([]);
    setClassifications({});
  }, []);

  const openMiniGame = useCallback(
    (mission: Mission) => {
      resetMiniState();
      setMiniMission(mission);
    },
    [resetMiniState],
  );

  const interactWithNpc = useCallback(
    (npc: Npc) => {
      haltMovement();
      playSfx("talk");

      if (!currentMission) {
        if (npc.id === "mentor") {
          setDialogue({
            npcId: npc.id,
            lines: finaleLines,
            index: 0,
            finaleAfter: true,
          });
        } else {
          setDialogue({
            npcId: npc.id,
            lines: [
              "Media Core ครบทั้ง 8 ชิ้นแล้ว! กลับไปหาอาจารย์พิกเซลที่ลานกลางเพื่อสรุปภารกิจนะ",
            ],
            index: 0,
          });
        }
        return;
      }

      if (currentRoute?.npcId === npc.id && npc.scene === currentScene) {
        if (startedMissionId !== currentMission.id) {
          setDialogue({
            npcId: npc.id,
            lines: [
              ...currentMission.dialogue,
              `คราวนี้ต้องสำรวจหาหลักฐาน ${currentRoute.items.length} ชิ้น แล้วนำไปใช้ที่ ${currentRoute.station.label} จึงจะเริ่มงานได้`,
            ],
            index: 0,
            startQuestAfter: currentMission.id,
          });
        } else if (missingQuestItems.length > 0) {
          setDialogue({
            npcId: npc.id,
            lines: [
              `ยังขาด ${missingQuestItems.length} ชิ้น: ${missingQuestItems.map((item) => item.label).join(", ")}`,
              "เดินตามเข็มทิศ สำรวจจุดที่มีประกาย แล้วกดตำแหน่ง E เพื่อเก็บข้อมูล",
            ],
            index: 0,
          });
        } else {
          setDialogue({
            npcId: npc.id,
            lines: [
              `หลักฐานครบแล้ว! ไปที่ ${currentRoute.station.label} เพื่อ ${currentRoute.station.action}`,
            ],
            index: 0,
          });
        }
        return;
      }

      setDialogue({
        npcId: npc.id,
        lines: [
          npc.idle[completed.length % npc.idle.length],
          "ภารกิจตอนนี้: " +
            objectiveTarget.label +
            " • ดูลูกศรด้านบนเพื่อหาเส้นทาง",
        ],
        index: 0,
      });
    },
    [
      completed.length,
      currentMission,
      currentRoute,
      currentScene,
      haltMovement,
      missingQuestItems,
      objectiveTarget.label,
      playSfx,
      startedMissionId,
    ],
  );

  const enterPortal = useCallback(
    (portal: Portal) => {
      if (completed.length < portal.minimumCompleted) {
        playSfx("error");
        showToast(
          `ประตูยังล็อก • ต้องเก็บ Media Core ${portal.minimumCompleted} ชิ้น`,
        );
        return;
      }
      haltMovement();
      setCurrentScene(portal.destination);
      playerPositionRef.current = { ...portal.spawn };
      nearbyNpcRef.current = null;
      nearbyObjectRef.current = null;
      setNearbyNpcId(null);
      setNearbyObjectId(null);
      const nextZone: Zone =
        portal.destination === "creative-lab"
          ? "graphic"
          : portal.destination === "campus"
            ? getZoneForPosition(portal.spawn)
            : "video";
      zoneRef.current = nextZone;
      setCurrentZone(nextZone);
      persistAdventure({ scene: portal.destination, position: portal.spawn });
      playSfx("talk");
      showToast(`เข้าสู่ ${SCENES[portal.destination].name}`);
      window.setTimeout(() => {
        updatePlayerVisual(portal.spawn);
      }, 80);
    },
    [
      completed.length,
      haltMovement,
      persistAdventure,
      playSfx,
      showToast,
      updatePlayerVisual,
    ],
  );

  const interactWithObject = useCallback(
    (object: AdventureObject) => {
      haltMovement();
      if (object.kind === "portal" && object.portal) {
        enterPortal(object.portal);
        return;
      }
      if (!currentMission || !currentRoute) return;
      if (object.kind === "item" && object.item) {
        if (collectedQuestItems.includes(object.item.id)) return;
        const nextItems = [...collectedQuestItems, object.item.id];
        setCollectedQuestItems(nextItems);
        persistAdventure({ items: nextItems });
        playSfx("success");
        const remaining = currentRoute.items.length - nextItems.length;
        showToast(
          remaining > 0
            ? `เก็บ ${object.item.label} แล้ว • เหลือ ${remaining} ชิ้น`
            : `หลักฐานครบแล้ว • ไปที่ ${currentRoute.station.label}`,
        );
        return;
      }
      if (object.kind === "station") {
        if (startedMissionId !== currentMission.id) {
          playSfx("error");
          showToast("ต้องคุยกับผู้ดูแลห้องเพื่อรับภารกิจก่อน");
          return;
        }
        if (missingQuestItems.length > 0) {
          playSfx("error");
          showToast(`ยังขาดหลักฐาน ${missingQuestItems.length} ชิ้น`);
          return;
        }
        playSfx("talk");
        openMiniGame(currentMission);
      }
    },
    [
      collectedQuestItems,
      currentMission,
      currentRoute,
      enterPortal,
      haltMovement,
      missingQuestItems.length,
      openMiniGame,
      persistAdventure,
      playSfx,
      showToast,
      startedMissionId,
    ],
  );

  const interactNearby = useCallback(() => {
    const position = playerPositionRef.current;
    const nearestNpc = sceneNpcs
      .map((npc) => ({ npc, meters: distance(position, npc.position) }))
      .sort((left, right) => left.meters - right.meters)[0];
    const nearestObject = adventureObjects
      .map((object) => ({
        object,
        meters: distance(position, object.position),
      }))
      .sort((left, right) => left.meters - right.meters)[0];
    if (
      nearestObject?.meters <= INTERACTION_DISTANCE &&
      (!nearestNpc || nearestObject.meters < nearestNpc.meters)
    ) {
      interactWithObject(nearestObject.object);
      return;
    }
    if (nearestNpc?.meters <= INTERACTION_DISTANCE) {
      interactWithNpc(nearestNpc.npc);
      return;
    }
    showToast("ยังไม่มีจุดโต้ตอบใกล้ ๆ ลองเดินตามเข็มทิศภารกิจ");
  }, [adventureObjects, interactWithNpc, interactWithObject, sceneNpcs, showToast]);

  const tryNpcClick = useCallback(
    (npc: Npc) => {
      if (
        distance(playerPositionRef.current, npc.position) <=
        INTERACTION_DISTANCE
      ) {
        interactWithNpc(npc);
      } else {
        showToast("เดินเข้าไปใกล้ " + npc.name + " ก่อน แล้วกดตำแหน่ง E");
      }
    },
    [interactWithNpc, showToast],
  );

  const tryObjectClick = useCallback(
    (object: AdventureObject) => {
      if (
        distance(playerPositionRef.current, object.position) <=
        INTERACTION_DISTANCE
      ) {
        interactWithObject(object);
      } else {
        showToast(`ต้องเดินเข้าใกล้ ${object.label} ก่อน • คลิกไกล ๆ ใช้งานไม่ได้`);
      }
    },
    [interactWithObject, showToast],
  );

  const advanceDialogue = () => {
    if (!dialogue) return;
    playSfx("talk");
    if (dialogue.index < dialogue.lines.length - 1) {
      setDialogue({ ...dialogue, index: dialogue.index + 1 });
      return;
    }
    const missionId = dialogue.missionId;
    const questId = dialogue.startQuestAfter;
    const shouldShowFinale = dialogue.finaleAfter;
    setDialogue(null);
    if (questId) {
      setStartedMissionId(questId);
      setCollectedQuestItems([]);
      persistAdventure({ startedMissionId: questId, items: [] });
      showToast("ภารกิจเริ่มแล้ว • สำรวจหาเบาะแสตามเข็มทิศ");
    } else if (missionId) {
      const mission = missions.find((item) => item.id === missionId);
      if (mission) window.setTimeout(() => openMiniGame(mission), 90);
    } else if (shouldShowFinale) {
      window.setTimeout(() => setFinale(true), 100);
    }
  };

  useEffect(() => {
    const gameplayBlocked =
      screen !== "game" ||
      paused ||
      dialogue !== null ||
      miniMission !== null ||
      reward !== null ||
      finale ||
      questLogOpen ||
      inventoryOpen;
    if (gameplayBlocked) return;

    const keyboardSet = keyboardDirections.current;
    const padSet = padDirections.current;
    const activeDirections: MoveDirection[] = [];
    let animationFrame: number | null = null;
    let previousTime = 0;
    let lastStatusTime = 0;

    const stopLoop = (sync = true) => {
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = null;
      }
      previousTime = 0;
      if (walkingRef.current) {
        walkingRef.current = false;
        setIsWalking(false);
      }
      if (sync) syncWorldStatus();
      persistAdventure({ position: playerPositionRef.current });
    };

    const animateMovement = (time: number) => {
      animationFrame = null;
      activeDirections.length = 0;
      MOVE_DIRECTIONS.forEach((direction) => {
        if (!keyboardSet.has(direction) && !padSet.has(direction)) return;
        activeDirections.push(direction);
      });
      const movement = getMovementVector(activeDirections);
      const { magnitude } = movement;
      if (magnitude === 0) {
        stopLoop();
        return;
      }

      const deltaSeconds = previousTime
        ? Math.min((time - previousTime) / 1000, 0.04)
        : 0;
      previousTime = time;
      if (!walkingRef.current) {
        walkingRef.current = true;
        setIsWalking(true);
      }
      if (deltaSeconds > 0) {
        movePlayer(
          movement.x * MOVE_SPEED * deltaSeconds,
          movement.y * MOVE_SPEED * deltaSeconds,
        );
      }

      const nextDirection: MoveDirection =
        Math.abs(movement.x) > Math.abs(movement.y)
          ? movement.x < 0
            ? "left"
            : "right"
          : movement.y < 0
            ? "up"
            : "down";
      faceDirection(nextDirection);

      if (time - lastStatusTime >= WORLD_STATUS_INTERVAL) {
        lastStatusTime = time;
        syncWorldStatus();
      }
      animationFrame = window.requestAnimationFrame(animateMovement);
    };

    const startLoop = () => {
      if (animationFrame !== null) return;
      animationFrame = window.requestAnimationFrame(animateMovement);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const direction = getMovementDirection(event);
      if (direction) {
        event.preventDefault();
        const wasActive = keyboardSet.has(direction);
        keyboardSet.add(direction);
        faceDirection(direction);
        if (!wasActive && !event.repeat) {
          const vector = directionVectors[direction];
          movePlayer(vector.x * 0.34, vector.y * 0.34);
          syncWorldStatus();
        }
        startLoop();
      }
      if (isInteractionKey(event) && !event.repeat) {
        event.preventDefault();
        interactNearby();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const direction = getMovementDirection(event);
      if (!direction) return;
      event.preventDefault();
      keyboardSet.delete(direction);
    };

    const clearInput = () => {
      keyboardSet.clear();
      padSet.clear();
      stopLoop();
    };
    const visibilityChange = () => {
      if (document.hidden) clearInput();
    };

    startMovementLoopRef.current = startLoop;
    stopMovementLoopRef.current = () => stopLoop();
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", clearInput);
    document.addEventListener("visibilitychange", visibilityChange);
    return () => {
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
      keyboardSet.clear();
      padSet.clear();
      startMovementLoopRef.current = () => undefined;
      stopMovementLoopRef.current = () => undefined;
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", clearInput);
      document.removeEventListener("visibilitychange", visibilityChange);
    };
  }, [
    dialogue,
    faceDirection,
    finale,
    interactNearby,
    inventoryOpen,
    miniMission,
    movePlayer,
    paused,
    persistAdventure,
    questLogOpen,
    reward,
    screen,
    syncWorldStatus,
  ]);

  useEffect(() => {
    if (screen !== "game") return;
    const root = viewportRef.current;
    if (!root) return;
    const preventBrowserGesture = (event: Event) => event.preventDefault();
    root.addEventListener("contextmenu", preventBrowserGesture);
    root.addEventListener("selectstart", preventBrowserGesture);
    root.addEventListener("dragstart", preventBrowserGesture);
    return () => {
      root.removeEventListener("contextmenu", preventBrowserGesture);
      root.removeEventListener("selectstart", preventBrowserGesture);
      root.removeEventListener("dragstart", preventBrowserGesture);
    };
  }, [screen]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || screen !== "game") return;
      event.preventDefault();
      if (dialogue) {
        setDialogue(null);
      } else if (questLogOpen) {
        setQuestLogOpen(false);
      } else if (inventoryOpen) {
        setInventoryOpen(false);
      } else if (miniMission) {
        setMiniMission(null);
        resetMiniState();
      } else if (finale) {
        setFinale(false);
      } else if (!reward) {
        haltMovement();
        setPaused((current) => !current);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [
    dialogue,
    finale,
    haltMovement,
    inventoryOpen,
    miniMission,
    questLogOpen,
    resetMiniState,
    reward,
    screen,
  ]);

  const updateJoystick = useCallback(
    (clientX: number, clientY: number) => {
      const joystick = joystickRef.current;
      if (!joystick) return;
      const rect = joystick.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const maximum = rect.width * 0.31;
      const rawX = clientX - centerX;
      const rawY = clientY - centerY;
      const magnitude = Math.hypot(rawX, rawY);
      const scale = magnitude > maximum ? maximum / magnitude : 1;
      const x = rawX * scale;
      const y = rawY * scale;
      setJoystickVector({ x, y });

      const directions = getJoystickDirections(x / maximum, y / maximum);
      padDirections.current.clear();
      directions.forEach((direction) => padDirections.current.add(direction));
      if (directions.length > 0) {
        const facing =
          Math.abs(x) > Math.abs(y)
            ? x < 0
              ? "left"
              : "right"
            : y < 0
              ? "up"
              : "down";
        faceDirection(facing);
        startMovementLoopRef.current();
      }
    },
    [faceDirection],
  );

  const releaseJoystick = useCallback(() => {
    joystickPointerRef.current = null;
    padDirections.current.clear();
    setJoystickVector({ x: 0, y: 0 });
    setJoystickActive(false);
  }, []);

  const joystickHandlers = {
    onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      joystickPointerRef.current = event.pointerId;
      event.currentTarget.setPointerCapture(event.pointerId);
      setJoystickActive(true);
      updateJoystick(event.clientX, event.clientY);
    },
    onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => {
      if (joystickPointerRef.current !== event.pointerId) return;
      event.preventDefault();
      updateJoystick(event.clientX, event.clientY);
    },
    onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => {
      if (joystickPointerRef.current !== event.pointerId) return;
      event.preventDefault();
      releaseJoystick();
    },
    onPointerCancel: releaseJoystick,
    onLostPointerCapture: releaseJoystick,
    onContextMenu: (event: ReactMouseEvent<HTMLDivElement>) =>
      event.preventDefault(),
  };

  const useTouchAction = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    interactNearby();
  };

  const startGame = (mode: "new" | "continue") => {
    haltMovement();
    setPaused(false);
    setQuestLogOpen(false);
    setInventoryOpen(false);
    setFinale(false);
    setReward(null);
    setMiniMission(null);
    directionRef.current = "down";
    setPlayerDirection("down");
    if (mode === "new") {
      saveCompleted([]);
      setCurrentScene("campus");
      playerPositionRef.current = { ...PLAYER_START };
      setStartedMissionId(null);
      setCollectedQuestItems([]);
      zoneRef.current = "plaza";
      setCurrentZone("plaza");
      persistAdventure({
        scene: "campus",
        startedMissionId: null,
        items: [],
        position: PLAYER_START,
      });
    }
    setScreen("game");
    if (soundOn) startMusic(true);
    window.setTimeout(() => {
      updatePlayerVisual();
      syncWorldStatus();
      if (mode === "new") {
        setDialogue({
          npcId: "mentor",
          lines: openingLines,
          index: 0,
        });
      }
    }, 80);
  };

  const returnToTitle = () => {
    haltMovement();
    stopMusic();
    setPaused(false);
    setDialogue(null);
    setMiniMission(null);
    setReward(null);
    setFinale(false);
    setQuestLogOpen(false);
    setInventoryOpen(false);
    setScreen("title");
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    try {
      window.localStorage.setItem("pixel-media-quest-sound", String(next));
    } catch {
      // Keep the preference for this visit.
    }
    if (next && screen === "game") startMusic(true);
    if (!next) stopMusic();
  };

  const toggleEffects = () => {
    setLiteEffects((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(
          "pixel-media-quest-lite-effects",
          String(next),
        );
      } catch {
        // Keep the preference for this visit.
      }
      return next;
    });
  };

  const toggleSelection = (index: number) => {
    if (!miniMission || miniResult === "correct") return;
    setMiniResult("idle");
    if (miniMission.mini.kind === "single") {
      setSelected([index]);
      return;
    }
    setSelected((current) =>
      current.includes(index)
        ? current.filter((item) => item !== index)
        : [...current, index],
    );
  };

  const addToOrder = (index: number) => {
    if (ordered.includes(index) || miniResult === "correct") return;
    setMiniResult("idle");
    setOrdered((current) => [...current, index]);
  };

  const setClassification = (
    index: number,
    classification: Classification,
  ) => {
    if (miniResult === "correct") return;
    setMiniResult("idle");
    setClassifications((current) => ({
      ...current,
      [index]: classification,
    }));
  };

  const miniReady = () => {
    if (!miniMission) return false;
    const game = miniMission.mini;
    if (game.kind === "single") return selected.length === 1;
    if (game.kind === "multi") return selected.length > 0;
    if (game.kind === "order") return ordered.length === game.options.length;
    return Object.keys(classifications).length === game.options.length;
  };

  const checkMiniGame = () => {
    if (!miniMission) return;
    const game = miniMission.mini;
    let correct = false;
    if (game.kind === "single") {
      correct = selected[0] === game.answers?.[0];
    } else if (game.kind === "multi") {
      const selectedSorted = [...selected].sort((left, right) => left - right);
      const answersSorted = [...(game.answers ?? [])].sort(
        (left, right) => left - right,
      );
      correct = arraysEqual(selectedSorted, answersSorted);
    } else if (game.kind === "order") {
      correct = arraysEqual(ordered, game.correctOrder ?? []);
    } else {
      correct = (game.classifications ?? []).every(
        (answer, index) => classifications[index] === answer,
      );
    }
    setMiniResult(correct ? "correct" : "wrong");
    playSfx(correct ? "success" : "error");
  };

  const claimReward = () => {
    if (!miniMission) return;
    const mission = miniMission;
    if (!completed.includes(mission.id)) {
      saveCompleted([...completed, mission.id]);
    }
    setStartedMissionId(null);
    setCollectedQuestItems([]);
    persistAdventure({ startedMissionId: null, items: [] });
    setMiniMission(null);
    resetMiniState();
    setReward(mission);
  };

  const closeReward = () => {
    const finalReward = reward?.order === missions.length;
    setReward(null);
    if (finalReward) setFinale(true);
    else {
      window.setTimeout(() => {
        syncWorldStatus();
        showToast("ภารกิจใหม่ปลดล็อกแล้ว • เดินตามลูกศร");
      }, 80);
    }
  };

  const renderMiniGame = () => {
    if (!miniMission) return null;
    const game = miniMission.mini;

    if (game.kind === "order") {
      return (
        <div className="order-game">
          <div className="timeline-slots" aria-label="ลำดับที่เลือก">
            {game.options.map((option, slot) => {
              const optionIndex = ordered[slot];
              const selectedOption =
                optionIndex === undefined ? null : game.options[optionIndex];
              return (
                <div
                  className={
                    "timeline-slot " + (selectedOption ? "filled" : "empty")
                  }
                  key={option.label}
                >
                  <span>{slot + 1}</span>
                  <strong>
                    {selectedOption?.label ?? "รอเลือกขั้นตอน"}
                  </strong>
                </div>
              );
            })}
          </div>
          <div className="order-pool">
            {game.options.map((option, index) => (
              <button
                key={option.label}
                disabled={ordered.includes(index)}
                onClick={() => addToOrder(index)}
              >
                <span>{option.icon}</span>
                <span>
                  <strong>{option.label}</strong>
                  <small>{option.detail}</small>
                </span>
              </button>
            ))}
          </div>
          <div className="order-tools">
            <button
              onClick={() => {
                setMiniResult("idle");
                setOrdered((current) => current.slice(0, -1));
              }}
              disabled={ordered.length === 0}
            >
              ↶ ย้อนหนึ่งขั้น
            </button>
            <button
              onClick={() => {
                setMiniResult("idle");
                setOrdered([]);
              }}
              disabled={ordered.length === 0}
            >
              ล้าง Timeline
            </button>
          </div>
        </div>
      );
    }

    if (game.kind === "classify") {
      return (
        <div className="classify-game">
          {game.options.map((option, index) => (
            <article className="feedback-card" key={option.label}>
              <div className="feedback-copy">
                <span>{option.icon}</span>
                <div>
                  <strong>{option.label}</strong>
                  <p>{option.detail}</p>
                </div>
              </div>
              <div className="classify-actions">
                <button
                  className={
                    classifications[index] === "useful" ? "active useful" : ""
                  }
                  onClick={() => setClassification(index, "useful")}
                >
                  ✓ ใช้แก้งานได้
                </button>
                <button
                  className={
                    classifications[index] === "vague" ? "active vague" : ""
                  }
                  onClick={() => setClassification(index, "vague")}
                >
                  ? ต้องถามเพิ่ม
                </button>
              </div>
            </article>
          ))}
        </div>
      );
    }

    return (
      <div
        className={
          "choice-game " +
          (game.kind === "single" ? "single-choice" : "multi-choice")
        }
      >
        {game.options.map((option, index) => {
          const active = selected.includes(index);
          return (
            <button
              key={option.label}
              className={active ? "selected" : ""}
              style={
                option.accent
                  ? ({ "--choice-accent": option.accent } as CSSProperties)
                  : undefined
              }
              onClick={() => toggleSelection(index)}
            >
              <span className="choice-icon">{option.icon}</span>
              <span>
                <strong>{option.label}</strong>
                <small>{option.detail}</small>
              </span>
              <span className="choice-check">{active ? "✓" : ""}</span>
            </button>
          );
        })}
      </div>
    );
  };

  if (screen === "title") {
    return (
      <main
        className={
          "pmq-title " + (liteEffects ? "pmq-lite-effects" : "")
        }
      >
        <div className="title-sky-glow" />
        <div className="title-topbar">
          <span>TH/EN KEYBOARD ✓</span>
          <span>AUTO SAVE</span>
          <button onClick={toggleSound}>
            {soundOn ? "♪ SOUND ON" : "♪ SOUND OFF"}
          </button>
        </div>

        <section className="title-card" aria-labelledby="pmq-title">
          <p className="title-kicker">A LEARNING ADVENTURE</p>
          <h1 id="pmq-title">
            <span>PIXEL MEDIA</span>
            <strong>QUEST</strong>
          </h1>
          <p className="title-story">
            Media Core ทั้ง 8 ชิ้นสูญหาย ออกสำรวจ 3 พื้นที่ ค้นหาเบาะแส
            ประกอบชิ้นงาน และช่วยทีมสร้างสื่อให้ทัน Open House พร้อมเรียนรู้
            Graphic Design Workflow กับ 3P Production ผ่านภารกิจจริง
          </p>

          <div className="title-features" aria-label="คุณสมบัติเกม">
            <span>🏠 3 พื้นที่สำรวจ</span>
            <span>🎒 ค้นหาหลักฐาน</span>
            <span>🧩 ภารกิจลงมือทำ</span>
            <span>🔓 ปลดล็อกโลก</span>
          </div>

          <div className="title-actions">
            {loaded && canContinue && (
              <button
                className="game-button primary-game-button"
                onClick={() => startGame("continue")}
              >
                <span>เล่นต่อ</span>
                <small>
                  Media Core {completed.length}/{missions.length}
                </small>
                <b>▶</b>
              </button>
            )}
            <button
              className={
                "game-button " +
                (canContinue
                  ? "secondary-game-button"
                  : "primary-game-button")
              }
              onClick={() => startGame("new")}
            >
              <span>{canContinue ? "เริ่มเกมใหม่" : "เริ่มผจญภัย"}</span>
              <small>เริ่มเนื้อเรื่องตั้งแต่ต้น</small>
              <b>✦</b>
            </button>
          </div>
          <p className="title-controls">
            กดค้าง WASD / ลูกศรเพื่อเดิน • กดปุ่มตำแหน่ง E เพื่อโต้ตอบ •
            ใช้ได้ทั้งแป้นไทยและอังกฤษ
          </p>
          <p className="home-screen-hint">
            📱 มือถือ: เปิดเมนูแชร์ แล้วเลือก “เพิ่มไปยังหน้าจอโฮม” เพื่อเล่นเต็มจอ
          </p>
        </section>

        <div className="title-party" aria-hidden="true">
          <Image
            className="party-designer"
            src="/assets/npc-designer.webp"
            alt=""
            width={512}
            height={768}
            unoptimized
          />
          <Image
            className="party-player"
            src="/assets/student-adventurer.webp"
            alt=""
            width={512}
            height={512}
            unoptimized
          />
          <Image
            className="party-director"
            src="/assets/npc-director.webp"
            alt=""
            width={512}
            height={768}
            unoptimized
          />
        </div>
        <p className="title-version">FULL GAME EDITION • NO SCORE • NO GAME OVER</p>
      </main>
    );
  }

  const zoneName = sceneConfig.shortName;

  return (
    <main
      className={
        "pmq-game zone-" +
        currentZone +
        " scene-" +
        currentScene +
        (liteEffects ? " pmq-lite-effects" : "")
      }
    >
      <div className="game-viewport" ref={viewportRef}>
        <div
          className="world-scene"
          ref={sceneRef}
          style={{ backgroundImage: `url(${sceneConfig.background})` }}
        >
          <div className="world-color-layer" />
          <div className="world-vignette" />
          <div className="world-particles" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
          {currentScene === "campus" && (
            <>
              <div className="world-sign graphic-world-sign">
                <span>✒</span>
                <strong>CREATIVE LAB</strong>
              </div>
              <div className="world-sign video-world-sign">
                <span>▸</span>
                <strong>VIDEO STUDIO</strong>
              </div>
              <div className="plaza-emblem" aria-hidden="true">
                <span>PM</span>
              </div>
              <div
                className={`campus-restoration progress-${completed.length}`}
                aria-hidden="true"
              >
                <i /><i /><i /><i /><i /><i /><i /><i />
              </div>
            </>
          )}

          {adventureObjects.map((object) => {
            const isTarget = objectiveTarget.id === object.id;
            const isNearby = nearbyObjectId === object.id;
            const locked =
              object.portal && completed.length < object.portal.minimumCompleted;
            return (
              <button
                key={object.id}
                className={
                  `world-object object-${object.kind}` +
                  (isTarget ? " quest-target" : "") +
                  (isNearby ? " object-nearby" : "") +
                  (locked ? " object-locked" : "")
                }
                style={{
                  left: object.position.x + "%",
                  top: object.position.y + "%",
                  zIndex: getDepthIndex(object.position),
                }}
                onClick={() => tryObjectClick(object)}
                aria-label={object.label}
              >
                {isTarget && (
                  <span className="quest-marker" aria-hidden="true">!</span>
                )}
                <span className="object-orb" aria-hidden="true">
                  {locked ? "🔒" : object.icon}
                </span>
                <span className="object-label">
                  <strong>{object.label}</strong>
                  <small>{object.detail}</small>
                </span>
                {isTarget && <span className="target-beacon" />}
              </button>
            );
          })}

          {sceneNpcs.map((npc) => {
            const isTarget = objectiveTarget.id === `npc-${npc.id}`;
            const isNearby = nearbyNpcId === npc.id;
            return (
              <button
                key={npc.id}
                className={
                  "world-npc npc-" +
                  npc.id +
                  (isTarget ? " quest-target" : "") +
                  (isNearby ? " npc-nearby" : "")
                }
                style={{
                  left: npc.position.x + "%",
                  top: npc.position.y + "%",
                  zIndex: getDepthIndex(npc.position),
                }}
                onClick={() => tryNpcClick(npc)}
                aria-label={"คุยกับ " + npc.name}
              >
                {isTarget && (
                  <span className="quest-marker" aria-hidden="true">
                    {!currentMission ? "★" : "!"}
                  </span>
                )}
                <span className="npc-label">
                  <strong>{npc.name}</strong>
                  <small>{npc.role}</small>
                </span>
                <Image
                  src={npc.sprite}
                  alt={npc.name}
                  width={512}
                  height={768}
                  unoptimized
                  draggable={false}
                />
                {isTarget && <span className="target-beacon" />}
              </button>
            );
          })}

          <div
            ref={playerElementRef}
            className={
              "world-player facing-" +
              playerDirection +
              (isWalking ? " walking" : "")
            }
            data-position={
              PLAYER_START.x.toFixed(2) + "," + PLAYER_START.y.toFixed(2)
            }
            aria-label="ตัวละครนักออกแบบฝึกหัด"
          >
            <span className="player-label">นักออกแบบฝึกหัด</span>
            <Image
              src="/assets/student-adventurer.webp"
              alt="นักออกแบบฝึกหัด"
              width={512}
              height={512}
              unoptimized
              draggable={false}
            />
          </div>
        </div>

        <header className="game-hud">
          <div className="player-hud hud-panel">
            <span className="hud-avatar">PM</span>
            <span>
              <small>MEDIA ADVENTURER</small>
              <strong>นักออกแบบฝึกหัด</strong>
            </span>
            <div className="core-mini-row" aria-label="Media Core ที่เก็บแล้ว">
              {missions.map((mission) => (
                <i
                  key={mission.id}
                  className={
                    completed.includes(mission.id) ? "core-lit" : "core-empty"
                  }
                />
              ))}
            </div>
          </div>

          <div className="objective-hud hud-panel">
            <span
              className="objective-arrow"
              ref={compassArrowRef}
              aria-hidden="true"
            >
              ▲
            </span>
            <span className="objective-copy">
              <small>
                {currentMission
                  ? "QUEST " + currentMission.order + "/" + missions.length
                  : "ALL CORES RESTORED"}
              </small>
              <strong>
                {objectiveTarget.label}
              </strong>
              <em ref={distanceLabelRef}>ตามลูกศรไป</em>
            </span>
          </div>

          <nav className="hud-menu" aria-label="เมนูเกม">
            <button
              onClick={() => {
                haltMovement();
                setQuestLogOpen(true);
              }}
              aria-label="เปิดสมุดภารกิจ"
              title="สมุดภารกิจ"
            >
              ▤
            </button>
            <button
              onClick={() => {
                haltMovement();
                setInventoryOpen(true);
              }}
              aria-label="เปิดกระเป๋าหลักฐาน"
              title="กระเป๋าหลักฐาน"
            >
              🎒
            </button>
            <button
              onClick={toggleSound}
              aria-label={soundOn ? "ปิดเสียง" : "เปิดเสียง"}
              title={soundOn ? "ปิดเสียง" : "เปิดเสียง"}
            >
              {soundOn ? "♪" : "×"}
            </button>
            <button
              onClick={() => {
                haltMovement();
                setPaused(true);
              }}
              aria-label="พักเกม"
              title="พักเกม"
            >
              Ⅱ
            </button>
          </nav>
        </header>

        <div className="zone-chip-game" aria-live="polite">
          <span>{sceneConfig.icon}</span>
          <strong>{zoneName}</strong>
        </div>

        <div className="compass-card hud-panel">
          <small>NEXT TARGET</small>
          <strong>{objectiveTarget.name}</strong>
          <span>{currentMission?.english ?? "MISSION COMPLETE"}</span>
        </div>

        {currentMission && currentRoute && startedMissionId === currentMission.id && (
          <button
            className="field-kit hud-panel"
            onClick={() => {
              haltMovement();
              setInventoryOpen(true);
            }}
          >
            <span>🎒</span>
            <span>
              <small>QUEST ITEMS</small>
              <strong>
                {collectedQuestItems.length}/{currentRoute.items.length} ชิ้น
              </strong>
            </span>
            <span className="field-kit-icons">
              {currentRoute.items.map((item) => (
                <i
                  key={item.id}
                  className={
                    collectedQuestItems.includes(item.id) ? "found" : "missing"
                  }
                >
                  {collectedQuestItems.includes(item.id) ? item.icon : "?"}
                </i>
              ))}
            </span>
          </button>
        )}

        {(nearbyNpc || nearbyObject) && (
          <button className="talk-prompt" onClick={interactNearby}>
            <kbd>E</kbd>
            <span>
              <small>TH / EN</small>
              <strong>
                {nearbyObject
                  ? `ใช้งาน ${nearbyObject.label}`
                  : `คุยกับ ${nearbyNpc?.name}`}
              </strong>
            </span>
          </button>
        )}

        <div className="mobile-controls" aria-label="ระบบควบคุมบนมือถือ">
          <div
            ref={joystickRef}
            className={"virtual-joystick" + (joystickActive ? " joystick-active" : "")}
            {...joystickHandlers}
            role="application"
            aria-label="ลากจอยเพื่อเดิน"
          >
            <span className="joystick-arrows" aria-hidden="true">••••</span>
            <span
              className="joystick-knob"
              style={{
                transform: `translate3d(${joystickVector.x}px, ${joystickVector.y}px, 0)`,
              }}
              aria-hidden="true"
            >
              ◆
            </span>
          </div>
          <button
            className={"touch-action-button" + ((nearbyNpc || nearbyObject) ? " action-ready" : "")}
            onPointerDown={useTouchAction}
            onClick={(event) => event.preventDefault()}
            onContextMenu={(event) => event.preventDefault()}
            aria-label="โต้ตอบกับสิ่งที่อยู่ใกล้"
          >
            <span>✦</span>
            <strong>ใช้</strong>
          </button>
        </div>

        {toast && <div className="game-toast">{toast}</div>}

        {dialogue && (
          <div className="dialogue-layer" role="presentation">
            <section
              className="game-dialogue"
              role="dialog"
              aria-modal="true"
              aria-label={
                npcs.find((npc) => npc.id === dialogue.npcId)?.name ??
                "บทสนทนา"
              }
            >
              <div className="dialogue-portrait">
                <Image
                  src={
                    npcs.find((npc) => npc.id === dialogue.npcId)?.sprite ??
                    "/assets/mentor-npc.webp"
                  }
                  alt=""
                  width={512}
                  height={768}
                  unoptimized
                />
              </div>
              <div className="dialogue-main">
                <div className="speaker-name">
                  <strong>
                    {npcs.find((npc) => npc.id === dialogue.npcId)?.name}
                  </strong>
                  <span>
                    {npcs.find((npc) => npc.id === dialogue.npcId)?.role}
                  </span>
                </div>
                <p>{dialogue.lines[dialogue.index]}</p>
                <footer>
                  <span>
                    {dialogue.index + 1}/{dialogue.lines.length}
                  </span>
                  <button onClick={advanceDialogue}>
                    {dialogue.index < dialogue.lines.length - 1
                      ? "ต่อไป"
                      : dialogue.startQuestAfter
                        ? "เริ่มสำรวจ"
                        : dialogue.missionId
                        ? "เริ่มมินิเกม"
                        : "เข้าใจแล้ว"}{" "}
                    ▶
                  </button>
                </footer>
              </div>
            </section>
          </div>
        )}

        {miniMission && (
          <div className="mission-layer">
            <section
              className={"mini-game-board mission-" + miniMission.zone}
              role="dialog"
              aria-modal="true"
              aria-labelledby="mini-game-title"
            >
              <header className="mini-game-header">
                <div className="mission-pixel-icon">{miniMission.icon}</div>
                <div>
                  <small>
                    MISSION {miniMission.order} • {miniMission.english}
                  </small>
                  <h2 id="mini-game-title">{miniMission.title}</h2>
                  <p>{miniMission.mini.prompt}</p>
                </div>
                <button
                  className="exit-mini-game"
                  onClick={() => {
                    setMiniMission(null);
                    resetMiniState();
                  }}
                  aria-label="ออกจากมินิเกม"
                >
                  ×
                </button>
              </header>

              {miniResult === "correct" ? (
                <div className="mission-success">
                  <div className="core-reveal" aria-hidden="true">
                    <span>{miniMission.icon}</span>
                  </div>
                  <p className="success-kicker">KNOWLEDGE UNLOCKED</p>
                  <h3>{miniMission.badge}</h3>
                  <p>{miniMission.summary}</p>
                  <div className="knowledge-cards">
                    <article>
                      <strong>★ ทำไมสำคัญ</strong>
                      <span>{miniMission.importance}</span>
                    </article>
                    <article>
                      <strong>◆ ตัวอย่างงานจริง</strong>
                      <span>{miniMission.example}</span>
                    </article>
                  </div>
                  <button className="claim-core-button" onClick={claimReward}>
                    รับ Media Core <span>✦</span>
                  </button>
                </div>
              ) : (
                <>
                  <div className="mini-game-instruction">
                    <span>HOW TO PLAY</span>
                    <strong>{miniMission.mini.instruction}</strong>
                  </div>
                  <div className="mini-game-content">{renderMiniGame()}</div>
                  {miniResult === "wrong" && (
                    <p className="mini-hint">
                      <strong>ลองอีกครั้ง:</strong> {miniMission.mini.hint}
                    </p>
                  )}
                  <footer className="mini-game-footer">
                    <span>
                      ไม่มีหักคะแนน • ทดลองใหม่ได้จนกว่าจะเข้าใจ
                    </span>
                    <button
                      onClick={checkMiniGame}
                      disabled={!miniReady()}
                    >
                      ตรวจคำตอบ ▶
                    </button>
                  </footer>
                </>
              )}
            </section>
          </div>
        )}

        {reward && (
          <div className="reward-layer">
            <section className="reward-card" role="dialog" aria-modal="true">
              <div className="reward-rays" aria-hidden="true" />
              <p>MEDIA CORE RESTORED</p>
              <div className="reward-core">{reward.icon}</div>
              <h2>{reward.badge}</h2>
              <strong>
                เก็บแล้ว {completed.length}/{missions.length} ชิ้น
              </strong>
              <p>
                {reward.order === missions.length
                  ? "พลังทุกขั้นตอนเชื่อมต่อกันแล้ว!"
                  : "เส้นทางภารกิจถัดไปถูกเปิดแล้ว"}
              </p>
              <button onClick={closeReward}>
                {reward.order === missions.length
                  ? "ดูบทสรุปการผจญภัย"
                  : "กลับสู่โลกเกม"}{" "}
                ▶
              </button>
            </section>
          </div>
        )}

        {questLogOpen && (
          <div className="menu-layer">
            <section
              className="quest-journal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="journal-title"
            >
              <header>
                <div>
                  <small>ADVENTURE JOURNAL</small>
                  <h2 id="journal-title">สมุด Media Core</h2>
                </div>
                <button
                  onClick={() => setQuestLogOpen(false)}
                  aria-label="ปิดสมุดภารกิจ"
                >
                  ×
                </button>
              </header>
              <p className="journal-intro">
                ทุก Core คือขั้นตอนที่เชื่อมต่อกัน จากการเข้าใจโจทย์
                ไปจนถึงสื่อที่พร้อมเผยแพร่
              </p>
              <div className="journal-grid">
                {missions.map((mission) => {
                  const done = completed.includes(mission.id);
                  const active = currentMission?.id === mission.id;
                  return (
                    <article
                      key={mission.id}
                      className={
                        done ? "journal-done" : active ? "journal-active" : "journal-locked"
                      }
                    >
                      <span className="journal-number">
                        {done ? mission.icon : active ? mission.order : "?"}
                      </span>
                      <div>
                        <small>{mission.english}</small>
                        <strong>{mission.title}</strong>
                        <p>
                          {done
                            ? mission.summary
                            : active
                              ? objectiveTarget.label
                              : "ปลดล็อกเมื่อผ่านภารกิจก่อนหน้า"}
                        </p>
                      </div>
                      <b>{done ? "CORE ✓" : active ? "CURRENT" : "LOCKED"}</b>
                    </article>
                  );
                })}
              </div>
              <footer>
                <span>
                  ความคืบหน้า {completed.length}/{missions.length}
                </span>
                <button onClick={() => setQuestLogOpen(false)}>
                  กลับสู่เกม
                </button>
              </footer>
            </section>
          </div>
        )}

        {inventoryOpen && (
          <div className="menu-layer">
            <section
              className="adventure-inventory"
              role="dialog"
              aria-modal="true"
              aria-labelledby="inventory-title"
            >
              <header>
                <div>
                  <small>FIELD INVENTORY</small>
                  <h2 id="inventory-title">กระเป๋าหลักฐาน</h2>
                </div>
                <button
                  onClick={() => setInventoryOpen(false)}
                  aria-label="ปิดกระเป๋า"
                >
                  ×
                </button>
              </header>

              <div className="inventory-body">
                <section>
                  <p className="inventory-section-title">MISSION ITEMS</p>
                  {currentMission && currentRoute ? (
                    <div className="quest-item-grid">
                      {currentRoute.items.map((item) => {
                        const found = collectedQuestItems.includes(item.id);
                        return (
                          <article
                            key={item.id}
                            className={found ? "item-found" : "item-missing"}
                          >
                            <span>{found ? item.icon : "?"}</span>
                            <div>
                              <strong>{found ? item.label : "ยังไม่ค้นพบ"}</strong>
                              <small>
                                {found ? item.detail : "สำรวจตามเข็มทิศภารกิจ"}
                              </small>
                            </div>
                            <b>{found ? "FOUND" : "MISSING"}</b>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="inventory-empty">ภารกิจหลักเสร็จสมบูรณ์แล้ว</p>
                  )}
                </section>

                <section>
                  <p className="inventory-section-title">DELIVERABLES</p>
                  <div className="deliverable-grid">
                    {missions.map((mission) => {
                      const route = getQuestRoute(mission.id);
                      const unlocked = completed.includes(mission.id);
                      return (
                        <article
                          key={mission.id}
                          className={unlocked ? "deliverable-ready" : "deliverable-locked"}
                        >
                          <span>{unlocked ? route?.deliverable.icon : "🔒"}</span>
                          <div>
                            <small>{mission.english}</small>
                            <strong>
                              {unlocked ? route?.deliverable.label : "ยังไม่ปลดล็อก"}
                            </strong>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              </div>

              <footer>
                <span>
                  หลักฐานปัจจุบัน {collectedQuestItems.length}/
                  {currentRoute?.items.length ?? 0}
                </span>
                <button onClick={() => setInventoryOpen(false)}>
                  กลับสู่เกม
                </button>
              </footer>
            </section>
          </div>
        )}

        {paused && (
          <div className="menu-layer">
            <section
              className="pause-menu"
              role="dialog"
              aria-modal="true"
              aria-labelledby="pause-title"
            >
              <p>GAME PAUSED</p>
              <h2 id="pause-title">พักการผจญภัย</h2>
              <button className="resume-button" onClick={() => setPaused(false)}>
                ▶ เล่นต่อ
              </button>
              <button onClick={toggleSound}>
                {soundOn ? "♪ ปิดเสียง" : "♪ เปิดเสียง"}
              </button>
              <button onClick={toggleEffects}>
                {liteEffects ? "✦ เปิดเอฟเฟกต์เต็ม" : "⚡ ใช้เอฟเฟกต์เบา"}
              </button>
              <button
                onClick={() => {
                  setPaused(false);
                  setQuestLogOpen(true);
                }}
              >
                ▤ เปิดสมุดภารกิจ
              </button>
              <button className="title-return-button" onClick={returnToTitle}>
                กลับหน้าเริ่มเกม
              </button>
              <small>กด ESC เพื่อพักหรือเล่นต่อ</small>
            </section>
          </div>
        )}

        {finale && (
          <div className="finale-layer">
            <section
              className="game-finale"
              role="dialog"
              aria-modal="true"
              aria-labelledby="finale-title"
            >
              <div className="finale-core-ring" aria-hidden="true">
                {missions.map((mission) => (
                  <span key={mission.id}>{mission.icon}</span>
                ))}
              </div>
              <p>ALL 8 MEDIA CORES RESTORED</p>
              <h2 id="finale-title">MEDIA PROCESS MASTER</h2>
              <p className="finale-copy">
                คุณเชื่อมกระบวนการออกแบบกราฟิก 5 ขั้น กับกระบวนการผลิตวิดีโอ
                3P ได้สำเร็จแล้ว ต่อไปคือเปลี่ยนความรู้นี้เป็นผลงานของตนเอง
              </p>
              <div className="assignment-scroll">
                <article>
                  <span>1</span>
                  <div>
                    <strong>เลือกรูปแบบ</strong>
                    <p>Infographic หรือ Digital Brochure</p>
                  </div>
                </article>
                <article>
                  <span>2</span>
                  <div>
                    <strong>นำเสนอให้ครบ</strong>
                    <p>Graphic Workflow 5 ขั้น และ 3P Production 3 ขั้น</p>
                  </div>
                </article>
                <article>
                  <span>3</span>
                  <div>
                    <strong>สร้างด้วยตนเอง</strong>
                    <p>อธิบายความสำคัญและตัวอย่างด้วยภาษาของตนเอง</p>
                  </div>
                </article>
                <article>
                  <span>4</span>
                  <div>
                    <strong>เตรียมส่ง</strong>
                    <p>
                      PDF/JPEG/PNG • [รหัสนักศึกษา_ชื่อ_งานกระบวนการออกแบบ]
                    </p>
                  </div>
                </article>
              </div>
              <div className="finale-actions">
                <button onClick={() => setFinale(false)}>
                  กลับไปสำรวจ
                </button>
                <button onClick={returnToTitle}>จบการผจญภัย</button>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
