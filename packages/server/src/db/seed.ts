import { sql } from "drizzle-orm";
import { db } from "./index.js";
import { zones } from "./schema.js";

// ─── Zone tree ────────────────────────────────────────────────────────────────
// Branch nodes: parentId set, tickSec/jobType/dropTable = null
// Leaf nodes:   have tickSec, jobType, dropTable

const ZONE_DATA = [
  // ── Root ──────────────────────────────────────────────────────────────────
  {
    id: "world", parentId: null,
    name: "세계", desc: "탐색 가능한 모든 구역.", art: "", levelReq: 1, dangerLevel: "안전",
    tickSec: null, jobType: null, dropTable: null,
  },

  // ── Branch: 키르타스 평원 ──────────────────────────────────────────────────
  {
    id: "kirtas", parentId: "world",
    name: "키르타스 평원", levelReq: 1, dangerLevel: "보통",
    desc: "도시 붕괴 이후 폐허가 된 개척지. 낮은 위험도에도 마나 결정 채굴 가치가 높아 탐색대가 끊이지 않는다.",
    art: "", tickSec: null, jobType: null, dropTable: null,
  },

  // ── Branch: 붉은 협곡 ─────────────────────────────────────────────────────
  {
    id: "red-canyon", parentId: "world",
    name: "붉은 협곡", levelReq: 12, dangerLevel: "위험",
    desc: "산화된 마나 층이 지층을 물들인 협곡. 균열 밀도가 높아 공간 왜곡이 빈번하게 발생한다.",
    art: "", tickSec: null, jobType: null, dropTable: null,
  },

  // ── Branch: 회색 고원 ─────────────────────────────────────────────────────
  {
    id: "gray-plateau", parentId: "world",
    name: "회색 고원", levelReq: 20, dangerLevel: "위험",
    desc: "고대 문명 유적이 점재하는 불모지. 탐색 대원들의 실종률이 지역 평균의 세 배에 달한다.",
    art: "", tickSec: null, jobType: null, dropTable: null,
  },

  // ── Branch: 파이널 시티 외곽 ──────────────────────────────────────────────
  {
    id: "final-city-outer", parentId: "world",
    name: "파이널 시티 외곽", levelReq: 30, dangerLevel: "극한",
    desc: "도시 핵심부를 감싼 공허의 경계선. 이 선을 넘어 귀환한 탐색자의 기록은 없다.",
    art: "", tickSec: null, jobType: null, dropTable: null,
  },

  // ── Leaves: 키르타스 평원 ─────────────────────────────────────────────────
  {
    id: "camp3-commercial", parentId: "kirtas",
    name: "상업 구획 폐건물", levelReq: 1, dangerLevel: "안전",
    tickSec: 8, jobType: "searcher",
    art: "░▒▓█▓▒░\n▒▓████▓▒\n▓██████▓\n▒▓████▓▒\n░▒▓█▓▒░",
    desc: "도시가 숨을 거두던 날에도 간판은 켜져 있었다. 마나 결정이 균열 사이로 자라나고 있지만, 아직 거스름돈을 기다리는 카운터가 남아 있다.",
    dropTable: [
      { resourceType: "bss",          amount: 1, chance: 1.0 },
      { resourceType: "mana_crystal", amount: 1, chance: 0.4 },
    ],
  },
  {
    id: "camp3-factory", parentId: "kirtas",
    name: "구 제조 공장 지하", levelReq: 5, dangerLevel: "보통",
    tickSec: 18, jobType: "technician",
    art: "▒░▒▓▒░▒\n░▓████▓░\n▓██▓███▓\n░▓████▓░\n▒░▒▓▒░▒",
    desc: "가동 정지 명령을 받지 못한 기계들이 지하 3층에서 아직 무언가를 찍어내고 있다. 순환회는 생산물의 정체를 공개하지 않는다.",
    dropTable: [
      { resourceType: "bss",            amount: 2, chance: 1.0 },
      { resourceType: "scrap_parts",    amount: 1, chance: 0.7 },
      { resourceType: "blueprint_frag", amount: 1, chance: 0.2 },
    ],
  },

  // ── Leaves: 붉은 협곡 ────────────────────────────────────────────────────
  {
    id: "camp3-mana-rift", parentId: "red-canyon",
    name: "마나 균열 지대", levelReq: 12, dangerLevel: "위험",
    tickSec: 25, jobType: "scholar",
    art: "░▒░▓░▒░\n▒▓▒█▒▓▒\n▓█▓▓▓█▓\n▒▓▒█▒▓▒\n░▒░▓░▒░",
    desc: "현실의 막이 얇아져 빛이 비틀린다. 순환회 공식 관측 기록에서 이 구역의 좌표는 세 번 삭제되었다.",
    dropTable: [
      { resourceType: "bss",              amount: 3, chance: 1.0  },
      { resourceType: "mana_crystal_mid", amount: 1, chance: 0.5  },
      { resourceType: "relic_frag",       amount: 1, chance: 0.15 },
    ],
  },

  // ── Leaves: 회색 고원 ────────────────────────────────────────────────────
  {
    id: "camp3-ancient-lab", parentId: "gray-plateau",
    name: "고대 연구소 잔해", levelReq: 20, dangerLevel: "위험",
    tickSec: 35, jobType: "scholar",
    art: "▓▒░▒░▒▓\n▒▓▒▓▒▓▒\n░▒▓███▒░\n▒▓▒▓▒▓▒\n▓▒░▒░▒▓",
    desc: "데이터는 지워졌으나 피실험체는 남아 있다. 연구 목적은 끝내 밝혀지지 않았고, 여기선 아무것도 자연사하지 않는다.",
    dropTable: [
      { resourceType: "bss",              amount: 4, chance: 1.0 },
      { resourceType: "mana_crystal_adv", amount: 1, chance: 0.4 },
      { resourceType: "ancient_record",   amount: 1, chance: 0.1 },
    ],
  },

  // ── Leaves: 파이널 시티 외곽 ─────────────────────────────────────────────
  {
    id: "camp3-void-depths", parentId: "final-city-outer",
    name: "공허 구역 심층부", levelReq: 30, dangerLevel: "극한",
    tickSec: 50, jobType: "searcher",
    art: "█▓▒░▒▓█\n▓█▓▒▓█▓\n▒▓█▓█▓▒\n▓█▓▒▓█▓\n█▓▒░▒▓█",
    desc: "도시의 끝에서 공허가 시작된다. 이 지점을 지나 귀환한 탐색자의 기록은 없다 — 장비만 가끔 돌아온다.",
    dropTable: [
      { resourceType: "bss",        amount: 6, chance: 1.0 },
      { resourceType: "rare_relic", amount: 1, chance: 0.3 },
      { resourceType: "mutant_mat", amount: 1, chance: 0.2 },
    ],
  },
] as const;

export async function seedZones() {
  await db
    .insert(zones)
    .values(ZONE_DATA.map(z => ({
      ...z,
      parentId:  z.parentId  ?? null,
      tickSec:   z.tickSec   ?? null,
      jobType:   z.jobType   ?? null,
      dropTable: z.dropTable ? [...z.dropTable] : null,
    })))
    .onConflictDoUpdate({
      target: zones.id,
      set: {
        name:        sql`excluded.name`,
        desc:        sql`excluded.desc`,
        art:         sql`excluded.art`,
        levelReq:    sql`excluded.level_req`,
        dangerLevel: sql`excluded.danger_level`,
        tickSec:     sql`excluded.tick_sec`,
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
