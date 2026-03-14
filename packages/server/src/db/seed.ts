import { db } from "./index.js";
import { sectors } from "./schema.js";

const SECTOR_DATA = [
  // ─── 야영지 3구역 (camp3) ───────────────────────────────────────────────
  {
    id: "camp3-commercial",
    zoneId: "camp3",
    name: "상업 구획 폐건물",
    levelReq: 1,
    tickSec: 8,
    dangerLevel: "안전",
    jobType: "searcher",
    dropTable: [
      { resourceType: "bss",           amount: 1, chance: 1.0  },
      { resourceType: "mana_crystal",  amount: 1, chance: 0.4  },
    ],
  },
  {
    id: "camp3-factory",
    zoneId: "camp3",
    name: "구 제조 공장 지하",
    levelReq: 5,
    tickSec: 18,
    dangerLevel: "보통",
    jobType: "technician",
    dropTable: [
      { resourceType: "bss",           amount: 2, chance: 1.0  },
      { resourceType: "scrap_parts",   amount: 1, chance: 0.7  },
      { resourceType: "blueprint_frag",amount: 1, chance: 0.2  },
    ],
  },
  {
    id: "camp3-mana-rift",
    zoneId: "camp3",
    name: "마나 균열 지대",
    levelReq: 12,
    tickSec: 25,
    dangerLevel: "위험",
    jobType: "scholar",
    dropTable: [
      { resourceType: "bss",              amount: 3, chance: 1.0  },
      { resourceType: "mana_crystal_mid", amount: 1, chance: 0.5  },
      { resourceType: "relic_frag",       amount: 1, chance: 0.15 },
    ],
  },
  {
    id: "camp3-ancient-lab",
    zoneId: "camp3",
    name: "고대 연구소 잔해",
    levelReq: 20,
    tickSec: 35,
    dangerLevel: "위험",
    jobType: "scholar",
    dropTable: [
      { resourceType: "bss",              amount: 4, chance: 1.0  },
      { resourceType: "mana_crystal_adv", amount: 1, chance: 0.4  },
      { resourceType: "ancient_record",   amount: 1, chance: 0.1  },
    ],
  },
  {
    id: "camp3-void-depths",
    zoneId: "camp3",
    name: "공허 구역 심층부",
    levelReq: 30,
    tickSec: 50,
    dangerLevel: "극한",
    jobType: "searcher",
    dropTable: [
      { resourceType: "bss",           amount: 6,  chance: 1.0  },
      { resourceType: "rare_relic",    amount: 1,  chance: 0.3  },
      { resourceType: "mutant_mat",    amount: 1,  chance: 0.2  },
    ],
  },
] as const;

export async function seedSectors() {
  await db
    .insert(sectors)
    .values(SECTOR_DATA.map((s) => ({ ...s, dropTable: [...s.dropTable] })))
    .onConflictDoNothing();

  console.log(`✅ Seeded ${SECTOR_DATA.length} sectors`);
}

// run directly: tsx src/db/seed.ts
if (process.argv[1]?.endsWith("seed.ts") || process.argv[1]?.endsWith("seed.js")) {
  seedSectors().then(() => process.exit(0));
}
