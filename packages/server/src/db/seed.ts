import { sql } from "drizzle-orm";
import { db } from "./index.js";
import { sectors } from "./schema.js";

const SECTOR_DATA = [
  // ─── 야영지 3구역 (camp3) ───────────────────────────────────────────────
  {
    id: "camp3-commercial",
    zoneId: "camp3",
    regionKey: "kirtas",
    name: "상업 구획 폐건물",
    levelReq: 1,
    tickSec: 8,
    dangerLevel: "안전",
    jobType: "searcher",
    art: "░▒▓█▓▒░\n▒▓████▓▒\n▓██████▓\n▒▓████▓▒\n░▒▓█▓▒░",
    desc: "도시가 숨을 거두던 날에도 간판은 켜져 있었다. 마나 결정이 균열 사이로 자라나고 있지만, 아직 거스름돈을 기다리는 카운터가 남아 있다.",
    dropTable: [
      { resourceType: "bss",           amount: 1, chance: 1.0  },
      { resourceType: "mana_crystal",  amount: 1, chance: 0.4  },
    ],
  },
  {
    id: "camp3-factory",
    zoneId: "camp3",
    regionKey: "kirtas",
    name: "구 제조 공장 지하",
    levelReq: 5,
    tickSec: 18,
    dangerLevel: "보통",
    jobType: "technician",
    art: "▒░▒▓▒░▒\n░▓████▓░\n▓██▓███▓\n░▓████▓░\n▒░▒▓▒░▒",
    desc: "가동 정지 명령을 받지 못한 기계들이 지하 3층에서 아직 무언가를 찍어내고 있다. 순환회는 생산물의 정체를 공개하지 않는다.",
    dropTable: [
      { resourceType: "bss",            amount: 2, chance: 1.0  },
      { resourceType: "scrap_parts",    amount: 1, chance: 0.7  },
      { resourceType: "blueprint_frag", amount: 1, chance: 0.2  },
    ],
  },
  {
    id: "camp3-mana-rift",
    zoneId: "camp3",
    regionKey: "red-canyon",
    name: "마나 균열 지대",
    levelReq: 12,
    tickSec: 25,
    dangerLevel: "위험",
    jobType: "scholar",
    art: "░▒░▓░▒░\n▒▓▒█▒▓▒\n▓█▓▓▓█▓\n▒▓▒█▒▓▒\n░▒░▓░▒░",
    desc: "현실의 막이 얇아져 빛이 비틀린다. 순환회 공식 관측 기록에서 이 구역의 좌표는 세 번 삭제되었다.",
    dropTable: [
      { resourceType: "bss",              amount: 3, chance: 1.0  },
      { resourceType: "mana_crystal_mid", amount: 1, chance: 0.5  },
      { resourceType: "relic_frag",       amount: 1, chance: 0.15 },
    ],
  },
  {
    id: "camp3-ancient-lab",
    zoneId: "camp3",
    regionKey: "gray-plateau",
    name: "고대 연구소 잔해",
    levelReq: 20,
    tickSec: 35,
    dangerLevel: "위험",
    jobType: "scholar",
    art: "▓▒░▒░▒▓\n▒▓▒▓▒▓▒\n░▒▓███▒░\n▒▓▒▓▒▓▒\n▓▒░▒░▒▓",
    desc: "데이터는 지워졌으나 피실험체는 남아 있다. 연구 목적은 끝내 밝혀지지 않았고, 여기선 아무것도 자연사하지 않는다.",
    dropTable: [
      { resourceType: "bss",              amount: 4, chance: 1.0  },
      { resourceType: "mana_crystal_adv", amount: 1, chance: 0.4  },
      { resourceType: "ancient_record",   amount: 1, chance: 0.1  },
    ],
  },
  {
    id: "camp3-void-depths",
    zoneId: "camp3",
    regionKey: "final-city-outer",
    name: "공허 구역 심층부",
    levelReq: 30,
    tickSec: 50,
    dangerLevel: "극한",
    jobType: "searcher",
    art: "█▓▒░▒▓█\n▓█▓▒▓█▓\n▒▓█▓█▓▒\n▓█▓▒▓█▓\n█▓▒░▒▓█",
    desc: "도시의 끝에서 공허가 시작된다. 이 지점을 지나 귀환한 탐색자의 기록은 없다 — 장비만 가끔 돌아온다.",
    dropTable: [
      { resourceType: "bss",        amount: 6, chance: 1.0  },
      { resourceType: "rare_relic", amount: 1, chance: 0.3  },
      { resourceType: "mutant_mat", amount: 1, chance: 0.2  },
    ],
  },
] as const;

export async function seedSectors() {
  await db
    .insert(sectors)
    .values(SECTOR_DATA.map((s) => ({ ...s, dropTable: [...s.dropTable] })))
    .onConflictDoUpdate({
      target: sectors.id,
      set: {
        regionKey: sql`excluded.region_key`,
        art:       sql`excluded.art`,
        desc:      sql`excluded.desc`,
      },
    });

  console.log(`✅ Seeded ${SECTOR_DATA.length} sectors`);
}

// run directly: tsx src/db/seed.ts
if (process.argv[1]?.endsWith("seed.ts") || process.argv[1]?.endsWith("seed.js")) {
  seedSectors().then(() => process.exit(0));
}
