export type LogSegment =
  | { type: "plain";     text: string }
  | { type: "highlight"; text: string }
  | { type: "reward";    text: string }
  | { type: "danger";    text: string }
  | { type: "good";      text: string };

export type LogEntry = { time: string; segments: LogSegment[] };

export const INITIAL_LOGS: LogEntry[] = [
  { time: "17:51", segments: [{ type: "highlight", text: "마나 결정(중급)" }, { type: "plain", text: " ×2 획득 — " }, { type: "reward", text: "+120 BSS 상당" }] },
  { time: "17:48", segments: [{ type: "plain", text: "폐허 탐색 중 " }, { type: "danger", text: "변이체(2단계) 조우" }, { type: "plain", text: " — 자동 회피 성공" }] },
  { time: "17:44", segments: [{ type: "highlight", text: "고대 유물 파편" }, { type: "plain", text: " 발견 — 유물 복원 스킬 적용 중" }] },
  { time: "17:38", segments: [{ type: "plain", text: "폐허 탐색 " }, { type: "good", text: "Lv.12 달성" }, { type: "plain", text: " — 탐색 속도 +5%" }] },
  { time: "17:21", segments: [{ type: "plain", text: "순환_기공사_렌 에게 " }, { type: "highlight", text: "정화수 ×1" }, { type: "plain", text: " 수령 — " }, { type: "good", text: "마나 피폭 -8%" }] },
];
