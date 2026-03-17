import { sql } from "drizzle-orm";
import { db } from "./index.js";
import { zones } from "./schema.js";

// ─── Zone tree ────────────────────────────────────────────────────────────────
// Branch nodes: parentId set, tickSec/actionType/jobType/dropTable = null
// Leaf nodes:   have tickSec, actionType, jobType, dropTable
// levelReq on leaves = required skill level (jobType) to enter (0 = always open)

const ZONE_DATA = [
  // ── Root ──────────────────────────────────────────────────────────────────
  {
    id: "world", parentId: null,
    name: "세계", desc: "탐색 가능한 모든 구역.", art: "", levelReq: 0, dangerLevel: "안전",
    tickSec: null, actionType: null, jobType: null, dropTable: null,
  },

  // ── Branch: 도심 폐허 지대 (기존 키르타스 평원 등 통합) ─────────────────────
  {
    id: "urban-ruins", parentId: "world",
    name: "도심 폐허 지대", levelReq: 0, dangerLevel: "보통",
    desc: "도시 붕괴 이후 폐허가 된 상업 및 제조 구역. 고철과 기본적인 마나 결정을 얻을 수 있다.",
    art: "", tickSec: null, actionType: null, jobType: null, dropTable: null,
  },

  // ── Branch: 마나 연구 구역 (기존 붉은 협곡/회색 고원 등 통합) ───────────────
  {
    id: "mana-research", parentId: "world",
    name: "마나 연구 구역", levelReq: 0, dangerLevel: "위험",
    desc: "고대 연구소와 마나 균열이 집중된 지역. 고대 기술과 순도 높은 마나 자원이 발견된다.",
    art: "", tickSec: null, actionType: null, jobType: null, dropTable: null,
  },

  // ── Branch: 외곽 자연 구역 (Phase B) ──────────────────────────────────────
  {
    id: "outer-nature", parentId: "world",
    name: "외곽 자연 구역", levelReq: 0, dangerLevel: "보통",
    desc: "도시 외곽의 거대 식물군락. 변이된 목재와 희귀한 포자를 채집할 수 있다.",
    art: "", tickSec: null, actionType: null, jobType: null, dropTable: null,
  },

  // ── Branch: 지하 광맥 구역 (Phase B) ──────────────────────────────────────
  {
    id: "underground-veins", parentId: "world",
    name: "지하 광맥 구역", levelReq: 0, dangerLevel: "위험",
    desc: "도시 깊숙한 곳의 광산과 동굴. 희귀 광물과 강력한 마나 결정을 채굴한다.",
    art: "", tickSec: null, actionType: null, jobType: null, dropTable: null,
  },

  // ── Leaves: 도심 폐허 지대 ────────────────────────────────────────────────
  {
    id: "camp3-commercial", parentId: "urban-ruins",
    name: "상업 구획 폐건물", levelReq: 0, dangerLevel: "안전",
    tickSec: 8, actionType: "탐험", jobType: "searcher",
    art: "░▒▓█▓▒░\n▒▓████▓▒\n▓██████▓\n▒▓████▓▒\n░▒▓█▓▒░",
    desc: "도시가 숨을 거두던 날에도 간판은 켜져 있었다. 마나 결정이 균열 사이로 자라나고 있지만, 아직 거스름돈을 기다리는 카운터가 남아 있다.",
    dropTable: [
      { resourceType: "mana_crystal",   chance: 0.70, minQty: 1, maxQty: 3 },
      { resourceType: "scrap_parts",     chance: 0.40, minQty: 1, maxQty: 2 },
      { resourceType: "blueprint_frag", chance: 0.05, minQty: 1, maxQty: 1 },
    ],
  },
  {
    id: "camp3-factory", parentId: "urban-ruins",
    name: "구 제조 공장 지하", levelReq: 0, dangerLevel: "보통",
    tickSec: 18, actionType: "작업", jobType: "technician",
    art: "▒░▒▓▒░▒\n░▓████▓░\n▓██▓███▓\n░▓████▓░\n▒░▒▓▒░▒",
    desc: "가동 정지 명령을 받지 못한 기계들이 지하 3층에서 아직 무언가를 찍어내고 있다. 순환회는 생산물의 정체를 공개하지 않는다.",
    dropTable: [
      { resourceType: "scrap_parts",     chance: 0.60, minQty: 2, maxQty: 4 },
      { resourceType: "blueprint_frag", chance: 0.35, minQty: 1, maxQty: 2 },
      { resourceType: "mana_crystal_mid", chance: 0.10, minQty: 1, maxQty: 1 },
    ],
  },

  // ── Leaves: 마나 연구 구역 ───────────────────────────────────────────────
  {
    id: "camp3-mana-rift", parentId: "mana-research",
    name: "마나 균열 지대", levelReq: 0, dangerLevel: "위험",
    tickSec: 25, actionType: "조사", jobType: "scholar",
    art: "░▒░▓░▒░\n▒▓▒█▒▓▒\n▓█▓▓▓█▓\n▒▓▒█▒▓▒\n░▒░▓░▒░",
    desc: "현실의 막이 얇아져 빛이 비틀린다. 순환회 공식 관측 기록에서 이 구역의 좌표는 세 번 삭제되었다.",
    dropTable: [
      { resourceType: "mana_crystal_mid", chance: 0.55, minQty: 1, maxQty: 2 },
      { resourceType: "relic_frag",       chance: 0.25, minQty: 1, maxQty: 1 },
      { resourceType: "mana_crystal_adv", chance: 0.08, minQty: 1, maxQty: 1 },
      { resourceType: "bss",              chance: 0.03, minQty: 1, maxQty: 1, onComplete: true },
    ],
  },
  {
    id: "camp3-ancient-lab", parentId: "mana-research",
    name: "고대 연구소 잔해", levelReq: 15, dangerLevel: "위험",
    tickSec: 35, actionType: "조사", jobType: "scholar",
    art: "▓▒░▒░▒▓\n▒▓▒▓▒▓▒\n░▒▓███▒░\n▒▓▒▓▒▓▒\n▓▒░▒░▒▓",
    desc: "데이터는 지워졌으나 피실험체는 남아 있다. 연구 목적은 끝내 밝혀지지 않았고, 여기선 아무것도 자연사하지 않는다.",
    dropTable: [
      { resourceType: "mana_crystal_adv", chance: 0.45, minQty: 1, maxQty: 2 },
      { resourceType: "ancient_record",   chance: 0.20, minQty: 1, maxQty: 1 },
      { resourceType: "rare_relic",       chance: 0.10, minQty: 1, maxQty: 1 },
      { resourceType: "bss",              chance: 0.08, minQty: 1, maxQty: 1, onComplete: true },
    ],
  },
  {
    id: "camp3-void-depths", parentId: "mana-research", // Moved to mana-research for hierarchy
    name: "공허 구역 심층부", levelReq: 20, dangerLevel: "극한",
    tickSec: 50, actionType: "탐험", jobType: "searcher",
    art: "█▓▒░▒▓█\n▓█▓▒▓█▓\n▒▓█▓█▓▒\n▓█▓▒▓█▓\n█▓▒░▒▓█",
    desc: "도시의 끝에서 공허가 시작된다. 이 지점을 지나 귀환한 탐색자의 기록은 없다 — 장비만 가끔 돌아온다.",
    dropTable: [
      { resourceType: "rare_relic",  chance: 0.35, minQty: 1, maxQty: 1 },
      { resourceType: "mutant_mat",  chance: 0.25, minQty: 1, maxQty: 2 },
      { resourceType: "mana_crystal_adv", chance: 0.15, minQty: 2, maxQty: 3 },
      { resourceType: "bss",         chance: 0.15, minQty: 1, maxQty: 1, onComplete: true },
    ],
  },

  // ── Leaves: 외곽 자연 구역 (Phase B) ─────────────────────────────────────
  {
    id: "lumber-dead-forest", parentId: "outer-nature",
    name: "고사목 숲", levelReq: 0, dangerLevel: "안전",
    tickSec: 20, actionType: "벌목", jobType: "lumberjack",
    art: "  /\\  \n /  \\ \n/____\\\n  ||  ",
    desc: "말라죽은 나무들이 가득한 숲. 비록 생명력은 없으나 건축 자재로 쓰기 좋은 목재를 얻을 수 있다.",
    dropTable: [
      { resourceType: "wood", chance: 0.70, minQty: 1, maxQty: 2 },
      { resourceType: "resin", chance: 0.30, minQty: 1, maxQty: 1 },
    ],
  },
  {
    id: "lumber-mutant-plants", parentId: "outer-nature",
    name: "변이 식물군락", levelReq: 10, dangerLevel: "보통",
    tickSec: 40, actionType: "벌목", jobType: "lumberjack",
    art: " <&&> \n<&  &>\n <&&> \n  ||  ",
    desc: "마나에 노출되어 기괴하게 성장한 식물들. 일반적인 목재와는 다른 특수한 성질을 지닌 자원을 제공한다.",
    dropTable: [
      { resourceType: "mutant_wood", chance: 0.60, minQty: 1, maxQty: 2 },
      { resourceType: "spore_crystal", chance: 0.20, minQty: 1, maxQty: 1 },
    ],
  },
  {
    id: "lumber-forbidden-deep", parentId: "outer-nature",
    name: "금단의 숲 심층부", levelReq: 30, dangerLevel: "위험",
    tickSec: 60, actionType: "벌목", jobType: "lumberjack",
    art: "!!!!!!!!\n!!/\\!!\n!/  \\!\n!!||!!",
    desc: "빛조차 닿지 않는 숲의 심장부. 고대부터 존재해 온 거대 나무들이 잠들어 있다.",
    dropTable: [
      { resourceType: "ancient_wood", chance: 0.50, minQty: 1, maxQty: 1 },
      { resourceType: "bss", chance: 0.10, minQty: 1, maxQty: 1, onComplete: true },
    ],
  },

  // ── Leaves: 지하 광맥 구역 (Phase B) ─────────────────────────────────────
  {
    id: "miner-quarry", parentId: "underground-veins",
    name: "얕은 채석장", levelReq: 0, dangerLevel: "보통",
    tickSec: 25, actionType: "채굴", jobType: "miner",
    art: " /--\\ \n|    |\n \\__/ ",
    desc: "누구에게나 열려 있는 공공 채석장. 기본적인 석재와 소량의 철광석을 얻을 수 있다.",
    dropTable: [
      { resourceType: "stone", chance: 0.70, minQty: 2, maxQty: 4 },
      { resourceType: "iron_ore", chance: 0.30, minQty: 1, maxQty: 2 },
    ],
  },
  {
    id: "miner-mana-vein", parentId: "underground-veins",
    name: "마나석 광맥", levelReq: 15, dangerLevel: "위험",
    tickSec: 45, actionType: "채굴", jobType: "miner",
    art: " *  * \n* ** *\n *  * ",
    desc: "푸른 빛을 내뿜는 마나석이 묻힌 광맥. 채굴 중 발생하는 마나 파동에 주의해야 한다.",
    dropTable: [
      { resourceType: "mana_stone", chance: 0.60, minQty: 1, maxQty: 2 },
      { resourceType: "rare_mineral", chance: 0.20, minQty: 1, maxQty: 1 },
    ],
  },
  {
    id: "miner-crystal-cave", parentId: "underground-veins",
    name: "심층 결정 동굴", levelReq: 35, dangerLevel: "극한",
    tickSec: 70, actionType: "채굴", jobType: "miner",
    art: " <><><>\n<><><>\n <><><>",
    desc: "지하 깊은 곳, 거대한 결정들이 자라나는 동굴. 결정의 코어는 막대한 에너지를 담고 있다.",
    dropTable: [
      { resourceType: "crystal_core", chance: 0.50, minQty: 1, maxQty: 1 },
      { resourceType: "bss", chance: 0.20, minQty: 1, maxQty: 1, onComplete: true },
    ],
  },
] as const;

export async function seedZones() {
  // Clear existing zones to avoid hierarchy conflicts if needed, or just upsert
  await db
    .insert(zones)
    .values(ZONE_DATA.map(z => ({
      ...z,
      parentId:   z.parentId   ?? null,
      tickSec:    z.tickSec    ?? null,
      actionType: z.actionType ?? null,
      jobType:    z.jobType    ?? null,
      dropTable:  z.dropTable ? [...z.dropTable] : null,
    })))
    .onConflictDoUpdate({
      target: zones.id,
      set: {
        parentId:    sql`excluded.parent_id`,
        name:        sql`excluded.name`,
        desc:        sql`excluded.desc`,
        art:         sql`excluded.art`,
        levelReq:    sql`excluded.level_req`,
        dangerLevel: sql`excluded.danger_level`,
        tickSec:     sql`excluded.tick_sec`,
        actionType:  sql`excluded.action_type`,
        jobType:     sql`excluded.job_type`,
        dropTable:   sql`excluded.drop_table`,
      },
    });

  console.log(`✅ Seeded ${ZONE_DATA.length} zones`);
}

// run directly: tsx src/db/seed.ts
if (process.argv[1]?.endsWith("seed.ts") || process.argv[1]?.endsWith("seed.js")) {
  seedZones().then(() => process.exit(0));
}
