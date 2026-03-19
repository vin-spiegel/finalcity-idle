import { useState, useEffect, useRef } from "react";
import { ChevronLeft } from "lucide-react";
import avatar from "../assets/image.png";
import mapPreview from "../assets/map-preview.png";
import zoneWorld  from "../assets/zones/world.png";
import zoneKirtas from "../assets/zones/kirtas.png";
import zoneVoid   from "../assets/zones/void.png";

const ZONE_IMAGES: Record<string, string> = {
  // world & branches
  world:            zoneWorld,
  "urban-ruins":    zoneKirtas,
  "mana-research":  zoneVoid,
  "outer-nature":   zoneKirtas,
  "underground-veins": zoneVoid,
  kirtas:           zoneKirtas,
  "red-canyon":     zoneKirtas,
  "gray-plateau":   zoneVoid,
  "final-city-outer": zoneVoid,
  // leaves
  "camp3-commercial":  zoneKirtas,
  "camp3-factory":     zoneKirtas,
  "camp3-mana-rift":   zoneKirtas,
  "camp3-ancient-lab": zoneVoid,
  "camp3-void-depths": zoneVoid,
  // Phase B leaves
  "lumber-dead-forest": zoneKirtas,
  "lumber-mutant-plants": zoneKirtas,
  "lumber-forbidden-deep": zoneVoid,
  "miner-quarry": zoneVoid,
  "miner-mana-vein": zoneVoid,
  "miner-crystal-cave": zoneVoid,
};
import { useGame } from "../context/GameContext";
import { api } from "../lib/api";
import type { ZoneRow } from "../lib/api";


// ─── Types ────────────────────────────────────────────────────

type DangerLevel = "안전" | "보통" | "위험" | "극한";

type ZoneNode = {
  id:          string;
  parentId:    string | null;
  name:        string;
  desc:        string;
  art:         string;
  levelReq:    number;
  dangerLevel: DangerLevel;
  // branch: tickSec = null, leaf: tickSec set
  tickSec:     number | null;
  actionType:  string | null;
  jobType:     string | null;
  children:    ZoneNode[];
};

// ─── Static ───────────────────────────────────────────────────

const DANGER_CLASS: Record<DangerLevel, string> = {
  "안전": "danger--safe",
  "보통": "danger--normal",
  "위험": "danger--danger",
  "극한": "danger--extreme",
};

const HUD_LOG_COUNT = 4;

// ─── NPC presence ─────────────────────────────────────────────

type NpcModalState = {
  name: string;
  lines: string[];
  count: number;
  isEnding?: boolean;
  coolProgress?: number;
  isPostCooldown?: boolean;    // 쿨타임 직후인지 여부
  postCooldownPhase?: boolean; // 쿨타임 후 두 번째 대화부터 별도 리스트 사용
  shownLines?: string[];       // 이미 나온 일반 대사 목록
  shownPostLines?: string[];   // 이미 나온 쿨타임 후 대사 목록
  permanentEnd?: boolean;      // 영구 대화 차단 (감정 소진)
};

const NPC_TITLES = ["방랑자", "잡역부", "채집꾼", "탐색자", "유랑자", "개척자", "폐허사냥꾼"];
const NPC_NAMES  = ["하켄", "세라", "나린", "루카", "에이", "볼크", "이든", "카라", "미르", "다온"];

// 순환회원 고정 멤버 — 항상 순환회원_이름 으로만 등장
const SUNHWAN_NAMES = ["카이", "시오", "펜", "렌", "토르", "유이"];

const NPC_GENERIC_LINES = [
  "이 구역은 처음이에요?",
  "자원 채집 효율이 꽤 좋은 편이에요.",
  "조심하세요. 가끔 이상한 마나 파동이 감지된대요.",
  "순환회가 이 구역 출입을 제한하려 했는데, 그냥 무시하고 왔어요.",
  "오늘은 피폭 수치가 평소보다 낮네요.",
  "파편 줍는 데 30분 걸릴 때도 있는데, 가끔 희귀한 것도 나오니까요.",
  "마나 결정 품질이 여기가 좋다고 소문이 나서 왔어요.",
  "폐허 사냥꾼들이 자주 지나가는데, 눈 마주치지 않는 게 나아요.",
  "여기선 혼자 다니지 않는 게 기본이에요.",
  "이 구역 지형이 낯설어서 처음엔 많이 헤맸어요.",
];

const NPC_REASON: Record<string, string> = {
  "방랑자":    "딱히 목적 없이 돌아다니다 보니까 여기까지 왔어요.",
  "순환회원":  "조직에서 이 구역 자원 조사 임무를 줬어요.",
  "채집꾼":    "이 근처 채집이 제 생계예요.",
  "잡역부":    "부탁받은 일이 있어서요. 자세한 건 말 못 해요.",
  "탐색자":    "이 구역 지도 데이터가 부족해서 직접 와봤어요.",
  "유랑자":    "여기저기 다니다 보면 재밌는 게 나오더라고요.",
  "개척자":    "언젠가 여기에 베이스캠프 만들 생각이에요.",
  "폐허사냥꾼":"위험한 곳일수록 값진 게 있거든요.",
};

// ─── 개척자_다온 대기 이전 대사 ───
const DAON_TALK_LIST = [
  "이 구역 지형이 아직 기록되지 않았어요. 함부로 움직이면 안 됩니다.",
  "오늘 북동쪽 잔해지대를 탐색했어요. 예상보다 마나 균열이 많더군요.",
  "지도에 없는 땅은 존재하지 않는 것과 같아요.",
  "폐허라도 정확한 위치를 기록해야 해요. 그게 제 사명이에요.",
  "저 잔해 더미, 위치 기록해도 될까요? 나중에 중요한 지형 표지가 될 수 있어요.",
  "마나 농도가 짙어지면 지형 자체가 바뀌는 경우도 있어요. 그래서 계속 다시 봐야 해요.",
  "길도 없이 돌아다니는 사람들을 보면 조마조마해요.",
  "언젠가 이 구역 전체를 지도로 남기는 게 목표예요.",
  "이 구역엔 이름이 없어요. 제가 임시로 '황야 지대 일곱째 구역'이라 불러요.",
];

// ─── 개척자_다온 쿨타임 후 전용 대사 ───
const DAON_POST_COOLDOWN_LINES: string[] = [
  "측량 마쳤어요. 예상보다 마나 잔류가 심하더군요.",
  "북쪽 잔해지대에 균열이 새로 생겼어요. 지도를 고쳐야 해요.",
  "생각보다 오래 걸렸어요. 현장이 예사롭지 않았거든요.",
  "마나 흐름이 어젯밤과 달라요. 기록해뒀어요.",
  "저쪽에 함몰지가 생겼어요. 지형 변동 기록에 추가해야겠어요.",
  "아직 발을 들인 사람이 없는 구역이 많아요. 할 일이 산더미네요.",
  "돌아왔어요. 보고가 필요하면 말해요.",
  "위험 요소 셋 발견했어요. 마나 균열 둘, 불안정한 잔해 하나예요.",
  "구역 명칭을 '황야 지대 일곱째 구역 남부'로 수정했어요. 더 정확한 구분이에요.",
  "오늘 목표의 절반도 못 했어요. 예상보다 지형이 복잡했거든요.",
];

// ─── 유랑자_카라 쿨타임 후 전용 대사 ───
const KARA_POST_COOLDOWN_LINES: string[] = [
  "왔어요. 뭐 보러 갔는지 까먹었는데 그냥 왔어요.",
  "생각했던 거랑 달랐어요. 뭘 생각했는지는 모르겠고.",
  "어, 아직 여기 있었어요? 다행이다. 아, 아니 뭐가 다행인지는 모르겠지만.",
  "별거 없었어요. 있었을 수도 있는데 저는 몰랐을 수도 있고.",
  "생각보다 멀었어요. 아니면 제가 느린 건가.",
  "다녀왔어요. 딱히 할 말은 없는데 그냥 말하고 싶었어요.",
  "저 없는 동안 뭐 했어요? 아, 대답 안 해도 돼요.",
  "이상한 거 봤는데 설명하기가 애매해요. 그냥 이상했어요.",
  "금방 온다고 했는데, 금방이 맞나요?",
  "왔어요. 어, 반갑다. 저만 그런가.",
];

// ─── 잡역부_미르 쿨타임 후 전용 대사 (여기에 추가) ───
const MIR_POST_COOLDOWN_LINES: string[] = [
  "혹시, 순환회에서 오셨나요?",
  "높은 직급이면.. 곤란한데.. 일반인 맞죠?",
  "그래도 오늘은 덥지는 않네. 편하게 말해도 되겠죠?",
  "마나폭풍은, 들어가본 사람이 드물다고 해.",
  "아무리 그래도, 할건 해야지. 일하러 안가?",
  "아는 사람이 순환회 들어간 뒤로 연락이 없어.",
  "여기서 오래 일하다 보면, 다들 어디론가 가버려.",
  "잔해 치우는 일이 이렇게 길어질 줄은 몰랐는데.",
  "가끔은 내가 이 구역에 박혀있는 건지, 선택한 건지 모르겠어.",
  "마나 노출 수치가 오른다는데. 뭐, 어쩌겠어.",
  "파이널 시티 안쪽은 밤에도 밝다던데. 한 번도 못 가봤어.",
  "먼저 간 사람들이 나쁜 게 아니라는 거 알아. 근데 가끔은 서운하더라고.",
  "집으로 갈 시간이 되면 기분이 좋아야 하는데, 요즘은 그냥 그래.",
  "이 구역에 새로 온 사람들은 다 눈이 살아있어. 나도 그랬을 텐데.",
  "뭐, 일이 있다는 게 어디야. 그렇게 생각하려고.",
  "카라랑 이야기 해본적 있어요? 저번에 사고 쳤다던데.",
  "불안해. 미칠거 같아!",
];

// ─── 잡역부_미르 조건부 대사: requires 대사가 나온 후에만 등장 ───
const MIR_POST_COOLDOWN_CONDITIONAL: { line: string; requires: string }[] = [
  { line: "카라는 생각보다 순수한 놈이야. 가만 보면 귀엽다니까.", requires: "카라랑 이야기 해본적 있어요? 저번에 사고 쳤다던데." },
  { line: "카라는 생각없어 보이지만 순수한 녀석이에요. 바보는 아니란거죠.", requires: "카라랑 이야기 해본적 있어요? 저번에 사고 쳤다던데." },
  // ── "불안해" 이후 감정 체인 (10개 소진 시 영구 차단) ──
  { line: "아, 미안해요. 갑자기 이런 말 해서.", requires: "불안해. 미칠거 같아!" },
  { line: "그냥... 요즘 잠을 잘 못 자서 그래요.", requires: "불안해. 미칠거 같아!" },
  { line: "가끔은 이 구역이 나를 집어삼킬 것 같은 기분이 들어.", requires: "불안해. 미칠거 같아!" },
  { line: "별거 아닌데. 그냥 가끔 그래요.", requires: "불안해. 미칠거 같아!" },
  { line: "있잖아요, 당신한테만 하는 말인데.", requires: "불안해. 미칠거 같아!" },
  { line: "마나 노출 때문인지, 요즘 꿈이 이상해.", requires: "불안해. 미칠거 같아!" },
  { line: "아무한테도 말 못 했어. 이런 거.", requires: "불안해. 미칠거 같아!" },
  { line: "그냥 들어줘서 고마워요. 정말로.", requires: "불안해. 미칠거 같아!" },
  { line: "이제 좀 괜찮아진 것 같아. 고마워요.", requires: "불안해. 미칠거 같아!" },
  { line: "다음에 또 봐요. 아마.", requires: "불안해. 미칠거 같아!" },
];

// 이 체인이 전부 소진되면 영구 차단
const MIR_BURNOUT_TRIGGER = "불안해. 미칠거 같아!";
const MIR_BURNOUT_CHAIN = MIR_POST_COOLDOWN_CONDITIONAL
  .filter(c => c.requires === MIR_BURNOUT_TRIGGER)
  .map(c => c.line);

// ─── NPC 대사 리스트 (여기에 주실 리스트를 추가하면 됩니다) ───
const MIR_TALK_LIST = [
  "순환회에서 감투를 쓴 그새끼. 왜이렇게 꺼드럭대는지 모르겠네요.",
  "요즘 공장에 이상한 소문이 돌아요. 밤마다 기계들이 스스로 움직인다나.",
  "이 구역 잔해들 사이에서 가끔 옛날 물건들이 나오는데, 꽤 쏠쏠해요.",
  "언젠가는 이 짓도 그만두고 파이널 시티 안쪽으로 들어가고 싶네요.",
  "그래도, 할 일이 있어서 다행이네요.",
  "순환회에 그녀석이 들어갔다던데. 잘 지내려나. 누구냐고요? 제 옛 연인이요.",
  "그래도 포기 하지 않아.나는. 아, 들으셨어요 ?",
  "오래전 가끔은 마나 폭풍 소리가 자장가처럼 들릴 때가 있어요. 미친 소리 같지만요.",
  "저, 경보기가 울리는데, 꺼주실래요 ? 시끄러워서.",
  // ... 추가될 대사들은 여기에 계속 넣으면 됩니다.
];

// ─── 유랑자_카라 대기 이전 대사 ───
const KARA_TALK_LIST = [
  "어, 왔어요? 저 지금 뭐 하고 있었는지 까먹었는데.",
  "오늘 하늘 봤어요? 저는 봤는데, 그냥 봤어요.",
  "배고프다. 아, 근데 밥 먹었나? 먹었던 것 같기도 하고.",
  "저 사실 이름 잘 못 외워요. 당신 이름이 뭐였더라.",
  "마나 결정 주우면 예쁘잖아요. 저만 그렇게 생각하나요?",
  "어제 넘어져서 무릎 긁혔어요. 괜찮아요 그냥.",
  "저 여기 오래 있었는데 아직도 길을 잘 모르겠어요.",
  "저한테 화났어요? 아닌 것 같기도 하고.",
  "오늘따라 별로 할말이 없네요. 그냥 여기 있고 싶어서요.",
  "저 가끔 생각이 너무 많아지면 그냥 멍하니 있어요. 지금처럼요.",
];

// ─── 순환회원_시오 대기 이전 대사 (10개 중 5개 랜덤 노출) ───
const SIOH_TALK_LIST = [
  "아, 왔어요? 저 지금 잠깐 쉬는 중인데, 뭐 급한 건 아니죠?",
  "순환회 들어오면 대단한 거 알 줄 알았는데. 그냥 잔심부름만 해요, 사실.",
  "이 구역 조사하래서 왔는데, 뭘 조사하는 건지 아직도 잘 모르겠어요. 뭐, 어차피 보고서엔 '이상 없음' 쓸 거지만.",
  "마나 결정이요? 손대지 말라던데. 근데 다들 줍더라고요. 저도 줬어요.",
  "위에서 시키는 거 그냥 하면 되는 거잖아요. 굳이 왜인지 알아야 해요?",
  "이거 솔직히 말하면 안 되는 건데. 뭐, 당신이 보고할 사람도 아니잖아요?",
  "토르, 무섭지 않아요? 저는 좀 무서운데. 표정을 모르겠어요 진짜.",
  "순환회 생각보다 별 거 없어요. 딱 봐도 알 것 같죠?",
  "아 오늘 진짜 피곤한데. 일은 해야 하고. 뭐, 천천히 하면 되죠.",
  "저 여기 온 지 얼마 안 됐는데, 이미 여기가 제일 편하네요. 뭔가 이상하죠?",
];

// ─── 순환회원_시오 쿨타임 후 전용 대사 ───
const SIOH_POST_COOLDOWN_LINES: string[] = [
  "또 왔어요? 뭐, 오는 건 막진 않죠.",
  "잠깐 쉬었더니 좀 나네요. 그래도 별로긴 한데.",
  "저 사실 오늘 세 번째 쉬는 중이에요. 비밀이에요.",
  "위에서 보면 뭐라 할 것 같은데. 뭐, 안 보이니까.",
  "이거 보고에 쓸 게 있긴 한데, 어떻게 쓰면 좋을지 모르겠어요.",
  "뭐, 같이 있는 거야 나쁘지 않아요. 딱히 갈 데도 없고.",
  "순환회원이 이러면 안 되는데. 뭐, 어때요.",
  "솔직히 이 구역 뭘 조사하는 건지 물어보고 싶었어요. 당신도 모르죠?",
  "카이한테 보고했더니 '알겠어' 한마디가 끝이에요. 뭘 알겠다는 건지.",
  "렌이 이 구역 다녀갔다던데, 뭘 봤는지는 안 알려줘요. 원래 그래요, 걔.",
];

// ─── 순환회원_카이 대기 이전 대사 ───
const KAI_TALK_LIST = [
  "여기 자주 와요?",
  "이 구역, 보고서에 안 나오는 내용이 많아요.",
  "순환회 안에서도 모르는 게 있다는 거, 알아요?",
  "...아무것도 아니에요. 그냥 생각이 많아서.",
  "이상하다고 느낀 적 있어요? 이 구역.",
  "물어봐도 되는 건지 모르겠는데. 뭐, 됐어요.",
  "저 말 많이 하는 편 아니에요. 그냥 참고로.",
  "당신, 여기 처음 오는 사람 같지 않아요.",
  "가끔 보고서 내용이 다음 날 바뀌어 있어요. 저만 그런 건지.",
  "뭔가 물어보려다 그만뒀어요. 괜찮아요.",
];

// ─── 순환회원_카이 쿨타임 후 전용 대사 ───
const KAI_POST_COOLDOWN_LINES: string[] = [
  "아까 한 말, 다른 데서 하지 마요.",
  "저 왜 이런 말 하는지 모르겠어요. 그냥 나오네요.",
  "순환회에서 사람이 빠지는 방식이 좀 이상해요.",
  "위에서 내려오는 지시가 가끔 앞뒤가 안 맞아요.",
  "당신 믿어도 되는지 판단 중이에요. 아직.",
  "이 구역에 접근 금지 구간이 있어요. 지도엔 없는.",
  "펜한테 물어봤는데, 그냥 웃더라고요. 그게 더 이상했어요.",
  "시오는 몰라요. 알면 안 돼요.",
  "제가 너무 많이 말한 것 같은데. 들은 거 잊어줘요.",
  "...다음에 또 봐요. 아마.",
];

// ─── 순환회원_펜 대기 이전 대사 ───
const PEN_TALK_LIST = [
  "순환회 좋아서 다니는 거 아니에요. 오해 없이.",
  "이익이 있으면 움직이고, 없으면 안 움직여요. 간단해요.",
  "감정으로 판단하는 사람 옆에 있으면 피곤해요.",
  "이 구역 자원 가치, 공식 수치보다 세 배는 높아요. 공식 발표는 거짓말이에요.",
  "당신은 뭘 원해서 여기 있어요?",
  "모르는 게 많으면 쓸모가 없어요. 제 기준이에요.",
  "순환회가 뭘 숨기는지는 알아요. 말 안 할 거지만.",
  "좋은 사람이 되려고 노력 안 해요. 시간 낭비거든요.",
  "저한테 친절하게 대할 필요 없어요. 불편해요.",
  "당신, 생각보다 오래 살아남을 것 같네요.",
];

// ─── 순환회원_펜 쿨타임 후 전용 대사 ───
const PEN_POST_COOLDOWN_LINES: string[] = [
  "이 정도 얘기했으면 뭔가 보답이 있어야 하는데.",
  "카이가 당신 얘기 하던데. 신경 쓰이는 모양이에요.",
  "저 원래 이렇게 말 많이 안 해요. 당신이 특이한 거예요.",
  "순환회 상층부가 숨기는 거, 이득 때문이에요. 항상.",
  "유이는 순진해요. 유지하는 게 좋을 것 같은데, 뭐.",
  "렌이 뭔가 봤다는 건 알아요. 묻진 않았어요.",
  "제 계산엔 당신이 변수예요. 마음에 안 들어요.",
  "이 구역 조사 결과 보고서, 저한테 미리 와요. 그게 정상은 아니죠.",
  "살아남는 방법은 아는 척 안 하는 거예요.",
  "다음에 또 볼 것 같은데. 별로 싫진 않아요.",
];

// ─── 순환회원_유이 대기 이전 대사 ───
const YUI_TALK_LIST = [
  "어, 안녕하세요! 여기 처음 오셨어요?",
  "순환회 진짜 대단한 조직이에요. 저 들어오고 싶었거든요!",
  "이 구역 마나 수치 오늘 특히 높아요! 흥미롭죠?",
  "저 보고서 쓰는 거 엄청 꼼꼼하게 해요. 자랑이에요.",
  "토르를 멀리서만 봤는데, 진짜 포스 있어요.",
  "카이는 말이 없는데 일을 잘 해요. 존경해요.",
  "순환회 들어온 게 제일 잘한 선택인 것 같아요!",
  "마나 결정 수집량 오늘 목표치 달성했어요!",
  "여기 위험하다는 사람도 있던데, 저는 괜찮던데요.",
  "언젠가 상급까지 올라가고 싶어요. 열심히 하면 되죠!",
];

// ─── 순환회원_유이 쿨타임 후 전용 대사 ───
const YUI_POST_COOLDOWN_LINES: string[] = [
  "오늘도 이상 없었어요! 완벽한 하루예요.",
  "렌이 요즘 좀 이상한 것 같아요. 걱정돼요.",
  "순환회 규정 다 외웠어요. 자랑이에요.",
  "마나 폭풍 구역은 아직 못 가봤는데, 언젠가 가보고 싶어요!",
  "시오는 항상 쉬는 것 같은데 왜 혼나지 않는 건지.",
  "보고서에 '이상 없음' 쓰는 날이 제일 좋아요.",
  "여기 사람들 다 좋은 것 같아요. 운이 좋죠?",
  "토르가 저한테 말 걸어줬어요. '조심해'. 뭘 조심하라는 건지.",
  "순환회가 우릴 지켜주는 거잖아요. 든든해요.",
  "오늘도 열심히 했으니까, 내일도 잘 될 거예요!",
];

// ─── 순환회원_렌 대기 이전 대사 ───
const REN_TALK_LIST = [
  "...저 지금 좀 바빠요. 아니, 바쁜 건 아닌데.",
  "저기, 혹시 이 구역에서 이상한 거 본 적 있어요?",
  "아무것도 아니에요. 그냥... 아무것도 아니에요.",
  "잠을 좀 못 잤어요. 별 이유는 없어요.",
  "여기 오래 있으면 안 될 것 같은데. 저만 그런 건가요?",
  "저 원래 이런 사람 아닌데... 그냥 요즘.",
  "아무한테도 말하면 안 돼요. 이거.",
  "아, 아무 말도 안 했어요. 방금.",
  "여기서 빨리 나가고 싶은데, 임무가 있으니까.",
  "당신... 믿을 수 있는 사람이에요?",
];

// ─── 순환회원_렌 쿨타임 후 전용 대사 ───
const REN_POST_COOLDOWN_LINES: string[] = [
  "저번에 한 말, 잊어줘요. 부탁이에요.",
  "사람이... 그냥 없어지는 게 말이 돼요?",
  "제가 본 게 맞는 건지 모르겠어요. 근데 분명히 봤어요.",
  "보고하면 안 될 것 같아서요. 뭔가.",
  "카이도 이상하다는 거 아는 것 같은데. 말을 안 해요.",
  "펜한테 물어봤더니 그냥 조용히 하래요.",
  "저, 순환회 그만두면 어떻게 될까요.",
  "...아무것도 아니에요. 진짜로.",
  "밤에 혼자 있으면 안 될 것 같아요. 요즘.",
  "당신한테만 하는 말인데. 도망갈 수 있으면 도망가요.",
];

// ─── 순환회원_토르 대기 이전 대사 ───
const TOR_TALK_LIST = [
  "셋이 들어왔어. 둘이 나왔고.",
  "...마나는 다 기억해.",
  "괜찮아. 원래 이래.",
  "어, 당신도 봤어?",
  "순환회가 아니야. 순환이야.",
  "다 돌아와. 형태만 달라지고.",
  "여기서 없어진 것들이 어디 가는지 알아?",
  "...기다리고 있었어.",
  "어차피 끝은 같아.",
  "순환은 공평해.",
];

// ─── 순환회원_토르 쿨타임 후 전용 대사 ───
const TOR_POST_COOLDOWN_LINES: string[] = [
  "몇 번째야, 여기 온 게.",
  "마나 폭풍 안에 형태가 있어. 분명히.",
  "유이는 몰라도 돼. 아직은.",
  "사라진 게 아니야. 그 사람들.",
  "...두려운 거 정상이야. 나도 그랬으니까.",
  "당신한테 뭔가 느껴져. 좋은 거야.",
  "끝을 본 적 있어? 나는 봤어.",
  "순환이 완성되면 다 이해해.",
  "급하지 않아. 곧 알게 돼.",
  "...괜찮아.",
];

// ─── 채집꾼_세라 대기 이전 대사 ───
const SERA_TALK_LIST = [
  "이 구역 채집 루트, 제가 정했어요.",
  "방해하지 않으면 같이 있어도 돼요.",
  "마나 결정 등급 구분도 못 하는 사람이 너무 많아요.",
  "여기서 빈손으로 돌아가는 건 실력 문제예요.",
  "...3등급짜리네. 생각보다 괜찮은데.",
  "이 공장 지하, 처음엔 저도 겁났어요. 지금은 아니고.",
  "채집은 감이에요. 계산만으론 안 돼요.",
  "...이쪽 루트가 더 빠른데. 아, 미안해요. 혼자 생각했어요.",
  "여기 오래 있으면 마나에 감각이 생겨요. 좋은 건지 모르겠지만.",
  "당신, 눈이 좋네요. 그거면 충분해요.",
];

// ─── 채집꾼_세라 쿨타임 후 전용 대사 ───
const SERA_POST_COOLDOWN_LINES: string[] = [
  "아까 본 결정, 2등급이에요. 잘 보관해요.",
  "...아직 두 개 더 있어. 좀만 더.",
  "당신한테 말하는 거, 습관이 되면 안 되는데.",
  "혼자 다니는 사람 오래 못 봤어요. 당신은 좀 달라 보이는데.",
  "...이 농도면 오늘 할당량 채워. 됐다.",
  "채집하다 보면 가끔 이상한 게 나와요. 보고는 안 해요.",
  "마나 농도 올라가고 있어요. 느껴져요?",
  "여기 처음 왔을 때 목표가 있었어요. 지금도 있고요.",
  "당신 괜찮은 편이에요. 그게 칭찬이에요.",
  "다음에 또 오면 말 걸어도 돼요. 제가 허락하는 거예요.",
];

// ─── 폐허사냥꾼_하켄 대기 이전 대사 ───
const HAKEN_TALK_LIST = [
  "이 공장 지하 3층, 천장이 무너지기 직전이에요. 진짜 스릴 있어요.",
  "...저기 균열 더 벌어진 것 같은데. 어, 왔어요?",
  "위험하다고 들었는데, 직접 와보니까 생각보다 더 위험하네요. 좋아요.",
  "마나 폭풍 한번 맞아보고 싶어요. 기회가 없어서.",
  "...저거 타면 딱이겠는데. 아, 저 혼자 생각했어요.",
  "여기 처음 왔을 때 바닥이 꺼졌어요. 그때부터 여기가 좋아졌어요.",
  "폐허 사냥꾼들 중에 저만큼 깊이 들어가는 사람 없어요. 자랑이에요.",
  "위험할수록 집중이 잘 돼요. 저만 그런 건 아니죠?",
  "...다음엔 저쪽으로 가봐야겠다. 더 불안정할 것 같아서.",
  "잔해 타고 내려오는 거, 해봤어요? 진짜 추천해요.",
];

// ─── 폐허사냥꾼_하켄 쿨타임 후 전용 대사 ───
const HAKEN_POST_COOLDOWN_LINES: string[] = [
  "아까 천장 무너졌어요. 타이밍 딱 맞췄어요.",
  "...저기 좀 더 들어가면 어떻게 될까. 해봐야 알겠지.",
  "사실 무서운 적이 없어요. 그게 문제라는 말도 들었는데, 모르겠어요.",
  "공허 구역 근처까지 가봤어요. 공기가 달라요. 좋은 의미로요.",
  "...균열 소리 나는데. 좋은 신호예요.",
  "언젠가 파이널 시티 핵심부 들어갈 거예요. 진짜로요.",
  "마나 농도 높은 구역일수록 감각이 살아나요.",
  "당신도 한번 깊이 들어와봐요. 살아 돌아오면 달라져요.",
  "이 직업, 오래 하다 보면 두려움이 기대로 바뀌어요. 그게 좋아요.",
  "또 와요. 저 대부분 여기 있어요. 살아있으면요. 농담이에요.",
];

// ─── 탐색자_나린 (마나 균열 지대) ───
const NARIN_TALK_LIST = [
  "이 구역 마나 균열 밀도가 높아요. 조사 온 거예요?",
  "균열 근처에선 장비가 오작동하는 경우가 있어요.",
  "공간 왜곡이 자주 일어나서 방향 감각이 흐려져요.",
  "이 구역 좌표가 지도에서 세 번 삭제됐다는 말 들었어요.",
  "빛이 비틀리면 이미 늦어요. 조심하는 게 나아요.",
];
const NARIN_POST_COOLDOWN_LINES: string[] = [
  "마나 파동이 오늘따라 강하네요.",
  "균열이 새로 생긴 것 같아요. 기록해야겠어요.",
  "이 구역 관측 기록이 자꾸 사라져요. 이상한 일이에요.",
  "오래 있으면 두통이 생겨요. 익숙해지긴 했는데.",
  "순환회가 이 구역 좌표를 숨기는 이유가 있을 거예요.",
];

// ─── 탐색자_루카 (마나 균열 지대) ───
const LUCA_TALK_LIST = [
  "여기 마나 농도, 측정기가 범위를 벗어나요.",
  "이 구역 출입 제한 구역이 계속 늘어나고 있어요.",
  "빛이 이상하게 꺾이는 거 보여요? 공간 왜곡이에요.",
  "균열 소리가 들려요? 저는 이제 안 들려요. 적응한 것 같아요.",
  "오래 있으면 시간 감각이 이상해져요.",
];
const LUCA_POST_COOLDOWN_LINES: string[] = [
  "균열이 확장되고 있어요. 빠르게.",
  "오늘 조사 기록이 또 없어졌어요.",
  "마나 결정이 여기선 색이 달라요. 순도가 다른가봐요.",
  "이 구역에서 며칠째 있는데 익숙해지지가 않아요.",
  "언제 철수 명령 떨어질지 모르겠어요.",
];

// ─── 잡역부_에이 (고대 연구소 잔해) ───
const EI_TALK_LIST = [
  "여기 연구소, 뭘 연구했는지 아무도 몰라요.",
  "피실험체 흔적이 아직 남아있어요. 보지 않는 게 나아요.",
  "데이터가 지워진 게 아니에요. 처음부터 없었던 거예요.",
  "이 구역에선 아무것도 자연사하지 않는다는 말이 있어요.",
  "15 이하는 들어오지 말라고 했는데. 당신 괜찮아요?",
];
const EI_POST_COOLDOWN_LINES: string[] = [
  "연구소 내부는 아직 절반도 못 봤어요.",
  "이상한 소리가 들려요. 기계인지 아닌지 모르겠어요.",
  "여기 있던 사람들이 어디 갔는지 아무도 몰라요.",
  "마나 잔류량이 너무 높아요. 오래 있으면 안 좋아요.",
  "그래도 여기서 나오는 유물들, 가치가 높아요.",
];

// ─── 잡역부_볼크 (고대 연구소 잔해) ───
const VOLK_TALK_LIST = [
  "이 구역 실종률이 평균의 세 배래요. 체감돼요.",
  "연구소 문서가 하나도 안 남아있어요. 의도적으로 지운 것 같아요.",
  "고대 문명 유적이라는데, 얼마나 오래된 건지 아무도 몰라요.",
  "마나가 이상하게 농축돼있어요. 공기가 무거운 느낌이에요.",
  "여기서 나오는 유물들, 순환회가 전부 수거해가요.",
];
const VOLK_POST_COOLDOWN_LINES: string[] = [
  "연구소 안쪽에 아직 잠긴 문이 있어요.",
  "오늘도 유물 하나 나왔는데 바로 수거당했어요.",
  "여기 오래 있으면 꿈이 이상해진다는 말, 사실이에요.",
  "누군가 여기 먼저 다녀간 것 같아요. 흔적이 있어요.",
  "마나 농도 때문인지 판단력이 흐려지는 느낌이에요.",
];

// ─── 방랑자_이든 (공허 구역 심층부) ───
const EDEN_TALK_LIST = [
  "여기까지 온 거예요? 대단하네요.",
  "여기서 귀환한 기록이 없다는 거, 알고 온 거죠?",
  "공허가 뭔지 설명하기가 어려워요. 직접 느껴야 알아요.",
  "장비가 여기선 오래 못 버텨요. 마나가 부식시켜요.",
  "이 구역 공기, 숨이 좀 무거워요.",
];
const EDEN_POST_COOLDOWN_LINES: string[] = [
  "공허 구역이 확장되고 있어요. 조금씩.",
  "장비 돌아온 거 봤어요? 주인은 안 왔는데.",
  "여기선 시간이 다르게 흐르는 것 같아요.",
  "이 구역 마나는 일반 마나랑 성질이 달라요. 연구가 없어요.",
  "다음에 또 와요. 여기까지 오는 사람이 많지 않아서.",
];

const NPC_SPECIAL_LINES: Record<string, string[]> = {
  "미르": MIR_TALK_LIST,
  "카라": KARA_TALK_LIST,
  "다온": DAON_TALK_LIST,
  "시오": SIOH_TALK_LIST,
  "카이": KAI_TALK_LIST,
  "펜":   PEN_TALK_LIST,
  "유이": YUI_TALK_LIST,
  "렌":   REN_TALK_LIST,
  "토르": TOR_TALK_LIST,
  "세라": SERA_TALK_LIST,
  "하켄": HAKEN_TALK_LIST,
  "나린": NARIN_TALK_LIST,
  "루카": LUCA_TALK_LIST,
  "에이": EI_TALK_LIST,
  "볼크": VOLK_TALK_LIST,
  "이든": EDEN_TALK_LIST,
};

function lcg(seed: number) {
  return ((seed * 1664525 + 1013904223) >>> 0) / 0x100000000;
}

const ALL_NPC_NAMES = [...SUNHWAN_NAMES, ...NPC_NAMES];

// 특정 존 고정 NPC 배치
const ZONE_FIXED_NPCS: Record<string, string[]> = {
  "camp3-commercial":  ["잡역부_미르", "유랑자_카라", "개척자_다온"],
  "camp3-factory":     ["순환회원_시오", "폐허사냥꾼_하켄", "채집꾼_세라"],
  "camp3-mana-rift":   ["탐색자_나린", "탐색자_루카"],
  "camp3-ancient-lab": ["잡역부_에이", "잡역부_볼크"],
  "camp3-void-depths": ["방랑자_이든"],
};

function zoneNpcs(zoneId: string, count = 3): string[] {
  if (ZONE_FIXED_NPCS[zoneId]) return ZONE_FIXED_NPCS[zoneId];

  let seed = 0;
  for (let i = 0; i < zoneId.length; i++) seed = (seed * 31 + zoneId.charCodeAt(i)) >>> 0;
  return Array.from({ length: count }, (_, i) => {
    const a = lcg(seed ^ (i * 0xdeadbeef));
    const b = lcg(seed ^ (i * 0xcafebabe));
    const name  = ALL_NPC_NAMES[Math.floor(b * ALL_NPC_NAMES.length)];
    const title = SUNHWAN_NAMES.includes(name) ? "순환회원" : NPC_TITLES[Math.floor(a * NPC_TITLES.length)];
    return `${title}_${name}`;
  });
}

function npcDialog(npcName: string, zoneId: string, idx: number, talkCount: number = 0, shownLines?: string[], isPostCooldown?: boolean): { lines: string[], isEnding: boolean } {
  let seed = 0;
  for (let i = 0; i < zoneId.length; i++) seed = (seed * 31 + zoneId.charCodeAt(i)) >>> 0;
  seed ^= (idx + 1) * 0xf00dbabe;

  const title  = npcName.split("_")[0];
  const reason = NPC_REASON[title] ?? "딱히 이유는 없어요.";

  const charName = npcName.split("_")[1] ?? npcName;

  // 특수 대사가 있는 NPC인 경우
  if (NPC_SPECIAL_LINES[charName]) {
    // 첫 만남 고정 대사
    if (charName === "미르" && talkCount === 1) {
      return { lines: [reason, "그래도, 할 일이 있어서 다행이네요."], isEnding: false };
    }
    if (charName === "다온" && talkCount === 1) {
      return { lines: [reason, "이 구역은 아직 미기록 지역이에요. 가볍게 보면 안 됩니다."], isEnding: false };
    }

    // 쿨타임 직후에는 지정된 대사 고정
    if (isPostCooldown) {
      if (charName === "미르") {
        return { lines: ["...", "좋아요. 무슨 말이 하고싶은건가요?"], isEnding: false };
      }
      if (charName === "카라") {
        const line = KARA_POST_COOLDOWN_LINES[Math.floor(Math.random() * KARA_POST_COOLDOWN_LINES.length)];
        return { lines: ["...", line], isEnding: false };
      }
      if (charName === "다온") {
        const line = DAON_POST_COOLDOWN_LINES[Math.floor(Math.random() * DAON_POST_COOLDOWN_LINES.length)];
        return { lines: ["...", line], isEnding: false };
      }
      if (charName === "시오") {
        return { lines: ["...", "어, 또 왔네요. 뭐, 좋아요."], isEnding: false };
      }
      if (charName === "카이") {
        return { lines: ["...", "또 왔군요."], isEnding: false };
      }
      if (charName === "펜") {
        return { lines: ["...", "또 왔네요. 뭔가 필요한 거 있어요?"], isEnding: false };
      }
      if (charName === "유이") {
        return { lines: ["...", "다시 왔어요? 반가워요!"], isEnding: false };
      }
      if (charName === "렌") {
        return { lines: ["...", "...또 왔어요."], isEnding: false };
      }
      if (charName === "토르") {
        return { lines: ["...", "...왔어."], isEnding: false };
      }
      if (charName === "세라") {
        return { lines: ["...", "또 왔군요."], isEnding: false };
      }
      if (charName === "하켄") {
        return { lines: ["...", "왔어요? 방금 좀 위험한 데 갔다 왔는데, 괜찮았어요."], isEnding: false };
      }
      if (charName === "나린") return { lines: ["...", "또 오셨어요."], isEnding: false };
      if (charName === "루카") return { lines: ["...", "왔어요."], isEnding: false };
      if (charName === "에이") return { lines: ["...", "다시 오셨네요."], isEnding: false };
      if (charName === "볼크") return { lines: ["...", "또 오셨어요."], isEnding: false };
      if (charName === "이든") return { lines: ["...", "살아있네요."], isEnding: false };
      return { lines: ["...", "하, 이런 곳에서도 수다를 좋아하는 분이 있네."], isEnding: false };
    }

    // 시오: 5개 대사 후 종료
    if (charName === "시오") {
      const shown = shownLines ?? [];
      const displayReason = talkCount === 1 ? reason : "...";
      if (shown.length >= 5) {
        return { lines: ["...", "아, 피곤하다. 이런 것도 일이라고."], isEnding: true };
      }
      const remaining = SIOH_TALK_LIST.filter(l => !shown.includes(l));
      const line = remaining[Math.floor(Math.random() * remaining.length)];
      return { lines: [displayReason, line], isEnding: false };
    }
    // 카이: 5개 대사 후 종료
    if (charName === "카이") {
      const shown = shownLines ?? [];
      const displayReason = talkCount === 1 ? reason : "...";
      if (shown.length >= 5) {
        return { lines: ["...", "...말 너무 많이 했네요. 그만할게요."], isEnding: true };
      }
      const remaining = KAI_TALK_LIST.filter(l => !shown.includes(l));
      const line = remaining[Math.floor(Math.random() * remaining.length)];
      return { lines: [displayReason, line], isEnding: false };
    }
    // 펜: 5개 대사 후 종료
    if (charName === "펜") {
      const shown = shownLines ?? [];
      const displayReason = talkCount === 1 ? reason : "...";
      if (shown.length >= 5) {
        return { lines: ["...", "할 말 다 했어요. 시간 낭비 이제 그만."], isEnding: true };
      }
      const remaining = PEN_TALK_LIST.filter(l => !shown.includes(l));
      const line = remaining[Math.floor(Math.random() * remaining.length)];
      return { lines: [displayReason, line], isEnding: false };
    }
    // 유이: 5개 대사 후 종료
    if (charName === "유이") {
      const shown = shownLines ?? [];
      const displayReason = talkCount === 1 ? reason : "...";
      if (shown.length >= 5) {
        return { lines: ["...", "아, 저 순찰 가야 해요! 나중에 또 얘기해요!"], isEnding: true };
      }
      const remaining = YUI_TALK_LIST.filter(l => !shown.includes(l));
      const line = remaining[Math.floor(Math.random() * remaining.length)];
      return { lines: [displayReason, line], isEnding: false };
    }
    // 렌: 5개 대사 후 종료
    if (charName === "렌") {
      const shown = shownLines ?? [];
      const displayReason = talkCount === 1 ? reason : "...";
      if (shown.length >= 5) {
        return { lines: ["...", "...저 그냥 가야겠어요. 죄송해요."], isEnding: true };
      }
      const remaining = REN_TALK_LIST.filter(l => !shown.includes(l));
      const line = remaining[Math.floor(Math.random() * remaining.length)];
      return { lines: [displayReason, line], isEnding: false };
    }
    // C티어 공통 처리 (나린/루카/에이/볼크/이든): 5개 전부 소진 후 종료
    const C_TIER: Record<string, { list: string[]; ending: string }> = {
      "나린": { list: NARIN_TALK_LIST, ending: "저 조사 계속해야 해요." },
      "루카": { list: LUCA_TALK_LIST,  ending: "슬슬 자리 옮겨야 할 것 같아요." },
      "에이": { list: EI_TALK_LIST,    ending: "더 깊이 들어가봐야 해요." },
      "볼크": { list: VOLK_TALK_LIST,  ending: "순찰 돌아야 해요." },
      "이든": { list: EDEN_TALK_LIST,  ending: "저 더 안쪽으로 가볼게요." },
    };
    if (C_TIER[charName]) {
      const { list, ending } = C_TIER[charName];
      const shown = shownLines ?? [];
      const displayReason = talkCount === 1 ? reason : "...";
      if (shown.length >= list.length) {
        return { lines: ["...", ending], isEnding: true };
      }
      const remaining = list.filter(l => !shown.includes(l));
      const line = remaining[Math.floor(Math.random() * remaining.length)];
      return { lines: [displayReason, line], isEnding: false };
    }
    // 세라: 5개 대사 후 종료
    if (charName === "세라") {
      const shown = shownLines ?? [];
      const displayReason = talkCount === 1 ? reason : "...";
      if (shown.length >= 5) {
        return { lines: ["...", "일 있어요. 비켜줘요."], isEnding: true };
      }
      const remaining = SERA_TALK_LIST.filter(l => !shown.includes(l));
      const line = remaining[Math.floor(Math.random() * remaining.length)];
      return { lines: [displayReason, line], isEnding: false };
    }
    // 하켄: 5개 대사 후 종료
    if (charName === "하켄") {
      const shown = shownLines ?? [];
      const displayReason = talkCount === 1 ? reason : "...";
      if (shown.length >= 5) {
        return { lines: ["...", "아, 저 저기 불안정한 구역 좀 확인하러 가야겠어요. 재밌겠다."], isEnding: true };
      }
      const remaining = HAKEN_TALK_LIST.filter(l => !shown.includes(l));
      const line = remaining[Math.floor(Math.random() * remaining.length)];
      return { lines: [displayReason, line], isEnding: false };
    }
    // 토르: 5개 대사 후 종료
    if (charName === "토르") {
      const shown = shownLines ?? [];
      const displayReason = talkCount === 1 ? reason : "...";
      if (shown.length >= 5) {
        return { lines: ["...", "다음엔 더 가까워질 거야."], isEnding: true };
      }
      const remaining = TOR_TALK_LIST.filter(l => !shown.includes(l));
      const line = remaining[Math.floor(Math.random() * remaining.length)];
      return { lines: [displayReason, line], isEnding: false };
    }

    let specials = [...NPC_SPECIAL_LINES[charName]];

    if (charName === "미르" && talkCount >= 5) {
      specials.push("저기, 그렇게 한가해요?");
    }
    if (charName === "카라" && talkCount >= 5) {
      specials.push("잠깐만. 저게 뭔지좀 보고 올게!");
    }
    if (charName === "다온" && talkCount >= 5) {
      specials.push("잠깐, 저 구역 측량이 필요해요. 곧 돌아올게요.");
    }

    // 이미 나온 대사 제외
    const shown = shownLines ?? [];
    const remaining = specials.filter(l => !shown.includes(l));
    if (remaining.length > 0) specials = remaining;

    const chosenLine = specials[Math.floor(Math.random() * specials.length)];
    const isEnding = chosenLine === "저기, 그렇게 한가해요?" || chosenLine === "잠깐만. 저게 뭔지좀 보고 올게!" || chosenLine === "잠깐, 저 구역 측량이 필요해요. 곧 돌아올게요.";
    
    const displayReason = talkCount === 1 ? reason : "...";

    return { lines: [displayReason, chosenLine], isEnding };
  }

  const i1     = Math.floor(lcg(seed ^ 0x1111) * NPC_GENERIC_LINES.length);
  let   i2     = Math.floor(lcg(seed ^ 0x2222) * NPC_GENERIC_LINES.length);
  if (i2 === i1) i2 = (i2 + 1) % NPC_GENERIC_LINES.length;
  return { lines: [reason, NPC_GENERIC_LINES[i1], NPC_GENERIC_LINES[i2]], isEnding: false };
}

// ─── Helpers ──────────────────────────────────────────────────

function fmtElapsed(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function buildTree(rows: ZoneRow[]): ZoneNode[] {
  const map = new Map<string, ZoneNode>();
  for (const r of rows) {
    map.set(r.id, {
      ...r,
      dangerLevel: r.dangerLevel as DangerLevel,
      children: [],
    });
  }
  const roots: ZoneNode[] = [];
  for (const node of map.values()) {
    if (node.parentId === null) {
      roots.push(node);
    } else {
      map.get(node.parentId)?.children.push(node);
    }
  }
  return roots;
}

function findNode(roots: ZoneNode[], id: string): ZoneNode | null {
  for (const n of roots) {
    if (n.id === id) return n;
    const found = findNode(n.children, id);
    if (found) return found;
  }
  return null;
}

function findLeaf(roots: ZoneNode[], id: string): ZoneNode | null {
  const node = findNode(roots, id);
  return node?.tickSec != null ? node : null;
}

function findPathTo(nodes: ZoneNode[], targetId: string, acc: string[] = []): string[] | null {
  for (const node of nodes) {
    const next = [...acc, node.id];
    if (node.id === targetId) return next;
    const found = findPathTo(node.children, targetId, next);
    if (found) return found;
  }
  return null;
}

// ─── Component ────────────────────────────────────────────────

export default function Content({ partySlot1, setPartySlot1 }: { partySlot1: string | null; setPartySlot1: (v: string | null) => void }) {
  const { state, dispatch, mapTickRef, navigateToActiveRef, zones: zoneRows } = useGame();
  const { currentAction, progress, logs, skills } = state;

  const [roots,     setRoots]     = useState<ZoneNode[]>([]);
  const [starting,  setStarting]  = useState(false);
  const [stopping,  setStopping]  = useState(false);
  const [toast,     setToast]     = useState<string | null>(null);
  const [npcModal,  setNpcModal]  = useState<NpcModalState | null>(null);
  const [partyView,       setPartyView]       = useState(false);
  const [partySlotSelect, setPartySlotSelect] = useState(false);
  const [cycleHQView,     setCycleHQView]     = useState(false);
  const [partyStatusFilter, setPartyStatusFilter] = useState<"all" | "available" | "busy">("all");
  const [partyJobFilter,    setPartyJobFilter]    = useState<string | null>(null);
  const [npcDetailPopup,    setNpcDetailPopup]    = useState<string | null>(null);
  const [addCompanionOpen,  setAddCompanionOpen]  = useState(false);
  const [companionTarget,   setCompanionTarget]   = useState<1 | 2>(1);
  const [slot1Member,       setSlot1Member]       = useState<string | null>(null); // "__player__" | NPC이름 | null
  const [teamPopupLeaf,     setTeamPopupLeaf]     = useState<ZoneNode | null>(null);

  // ── 방문객 시스템 ──
  const VISITOR_COOLDOWN = 5 * 60 * 60 * 1000; // 5시간
  const VISITOR_SLOT_COUNT = 5;

  type VisitorSlot = { visitor: string | null; nextVisitorAt: number; unlocked: boolean };

  const [hiredCompanions, setHiredCompanions] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("hiredCompanions") ?? "[]"); } catch { return []; }
  });
  const [visitorSlots, setVisitorSlots] = useState<VisitorSlot[]>(() => {
    try {
      const saved = localStorage.getItem("visitorSlots");
      if (saved) return JSON.parse(saved);
    } catch {}
    return Array.from({ length: VISITOR_SLOT_COUNT }, (_, i) => ({
      visitor: null,
      nextVisitorAt: Date.now() + VISITOR_COOLDOWN,
      unlocked: i === 0,
    }));
  });
  const [tickNow, setTickNow] = useState(Date.now());

  const ALL_PARTY_NPCS = [
    "잡역부_미르", "유랑자_카라", "개척자_다온",
    "순환회원_시오", "폐허사냥꾼_하켄", "채집꾼_세라",
    "탐색자_나린", "탐색자_루카",
    "잡역부_에이", "잡역부_볼크",
    "방랑자_이든",
    "순환회원_카이", "순환회원_펜", "순환회원_유이", "순환회원_렌", "순환회원_토르",
  ];

  // 방문객 타이머 (1초 tick)
  const visitorSlotsRef = useRef(visitorSlots);
  visitorSlotsRef.current = visitorSlots;
  const hiredCompanionsRef = useRef(hiredCompanions);
  hiredCompanionsRef.current = hiredCompanions;

  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      setTickNow(now);
      const slots = visitorSlotsRef.current;
      let changed = false;
      const next = slots.map(slot => {
        if (!slot.unlocked || now < slot.nextVisitorAt) return slot;
        let newNextAt = slot.nextVisitorAt;
        while (newNextAt <= now) newNextAt += VISITOR_COOLDOWN;
        // 이미 다른 슬롯에 나온 방문객 제외
        const occupied = slots.map(s => s.visitor).filter(Boolean);
        const pool = ALL_PARTY_NPCS.filter(n => !hiredCompanionsRef.current.includes(n) && !occupied.includes(n));
        const picked = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : null;
        changed = true;
        return { ...slot, visitor: picked, nextVisitorAt: newNextAt };
      });
      if (changed) {
        setVisitorSlots(next);
        localStorage.setItem("visitorSlots", JSON.stringify(next));
      }
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const fmtCountdown = (target: number) => {
    const diff = Math.max(0, target - tickNow);
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${h}h ${m}m ${s}s`;
  };

  const hireVisitor = (slotIdx: number) => {
    const visitor = visitorSlots[slotIdx]?.visitor;
    if (!visitor || hiredCompanions.includes(visitor)) return;
    const updated = [...hiredCompanions, visitor];
    setHiredCompanions(updated);
    localStorage.setItem("hiredCompanions", JSON.stringify(updated));
  };

  const NPC_LOCATION: Record<string, string> = {
    "잡역부_미르":      "상업 구획 폐건물",
    "유랑자_카라":      "상업 구획 폐건물",
    "개척자_다온":      "상업 구획 폐건물",
    "순환회원_시오":    "구 제조 공장 지하",
    "폐허사냥꾼_하켄":  "구 제조 공장 지하",
    "채집꾼_세라":      "구 제조 공장 지하",
    "탐색자_나린":      "마나 균열 지대",
    "탐색자_루카":      "마나 균열 지대",
    "잡역부_에이":      "고대 연구소 잔해",
    "잡역부_볼크":      "고대 연구소 잔해",
    "방랑자_이든":      "공허 구역 심층부",
    "순환회원_카이":    "베이스캠프",
    "순환회원_펜":      "베이스캠프",
    "순환회원_유이":    "베이스캠프",
    "순환회원_렌":      "베이스캠프",
    "순환회원_토르":    "베이스캠프",
  };

  type NpcProfile = {
    traits: string[];         // 성격/특징 키워드
    stats: { label: string; value: number; max: number }[];
    desc: string;             // 한줄 소개
  };

  const NPC_PROFILES: Record<string, NpcProfile> = {
    "잡역부_미르": {
      traits: ["성실", "과묵"],
      desc: "말보다 손이 빠른 인물. 폐건물 구석구석을 꿰뚫고 있다.",
      stats: [
        { label: "전투력", value: 18, max: 100 },
        { label: "탐색",   value: 55, max: 100 },
        { label: "체력",   value: 70, max: 100 },
        { label: "운",     value: 40, max: 100 },
      ],
    },
    "유랑자_카라": {
      traits: ["자유분방", "낙천적"],
      desc: "어디서 왔는지 아무도 모른다. 그냥 어느 날 여기 있었다.",
      stats: [
        { label: "전투력", value: 42, max: 100 },
        { label: "탐색",   value: 68, max: 100 },
        { label: "체력",   value: 50, max: 100 },
        { label: "운",     value: 75, max: 100 },
      ],
    },
    "개척자_다온": {
      traits: ["리더십", "추진력"],
      desc: "먼저 들어가고 나중에 생각하는 스타일. 살아남은 게 신기하다.",
      stats: [
        { label: "전투력", value: 60, max: 100 },
        { label: "탐색",   value: 72, max: 100 },
        { label: "체력",   value: 65, max: 100 },
        { label: "운",     value: 45, max: 100 },
      ],
    },
    "순환회원_시오": {
      traits: ["냉정", "관찰력"],
      desc: "순환회 현장 담당. 감정을 드러내지 않지만 모든 걸 보고 있다.",
      stats: [
        { label: "전투력", value: 35, max: 100 },
        { label: "탐색",   value: 80, max: 100 },
        { label: "체력",   value: 55, max: 100 },
        { label: "운",     value: 50, max: 100 },
      ],
    },
    "폐허사냥꾼_하켄": {
      traits: ["무모함", "극한추구"],
      desc: "위험할수록 눈이 빛난다. 본인만 모른다.",
      stats: [
        { label: "전투력", value: 82, max: 100 },
        { label: "탐색",   value: 58, max: 100 },
        { label: "체력",   value: 90, max: 100 },
        { label: "운",     value: 30, max: 100 },
      ],
    },
    "채집꾼_세라": {
      traits: ["세심함", "친화력"],
      desc: "자원 감별 능력이 탁월하다. 대화를 좋아한다.",
      stats: [
        { label: "전투력", value: 22, max: 100 },
        { label: "탐색",   value: 74, max: 100 },
        { label: "체력",   value: 48, max: 100 },
        { label: "운",     value: 62, max: 100 },
      ],
    },
    "탐색자_나린": {
      traits: ["호기심", "신중함"],
      desc: "균열 지대 전문가. 지도에 없는 길을 가장 먼저 간다.",
      stats: [
        { label: "전투력", value: 38, max: 100 },
        { label: "탐색",   value: 85, max: 100 },
        { label: "체력",   value: 52, max: 100 },
        { label: "운",     value: 55, max: 100 },
      ],
    },
    "탐색자_루카": {
      traits: ["침착", "분석적"],
      desc: "마나 이상 현상을 수치로 읽는다. 말이 느린 편이다.",
      stats: [
        { label: "전투력", value: 30, max: 100 },
        { label: "탐색",   value: 78, max: 100 },
        { label: "체력",   value: 45, max: 100 },
        { label: "운",     value: 48, max: 100 },
      ],
    },
    "잡역부_에이": {
      traits: ["효율적", "무감정"],
      desc: "고대 연구소 구석을 청소하듯 훑는다. 감탄도 공포도 없다.",
      stats: [
        { label: "전투력", value: 25, max: 100 },
        { label: "탐색",   value: 60, max: 100 },
        { label: "체력",   value: 68, max: 100 },
        { label: "운",     value: 35, max: 100 },
      ],
    },
    "잡역부_볼크": {
      traits: ["우직함", "보호본능"],
      desc: "말수가 적고 등이 넓다. 뒤를 맡기기 좋은 인물.",
      stats: [
        { label: "전투력", value: 65, max: 100 },
        { label: "탐색",   value: 40, max: 100 },
        { label: "체력",   value: 88, max: 100 },
        { label: "운",     value: 38, max: 100 },
      ],
    },
    "방랑자_이든": {
      traits: ["고독", "체념"],
      desc: "공허 구역에서 혼자 살아남은 유일한 기록. 이유는 말하지 않는다.",
      stats: [
        { label: "전투력", value: 75, max: 100 },
        { label: "탐색",   value: 90, max: 100 },
        { label: "체력",   value: 72, max: 100 },
        { label: "운",     value: 88, max: 100 },
      ],
    },
    "순환회원_카이": {
      traits: ["눈치빠름", "정보수집"],
      desc: "순환회 내부 정보통. 알면서 모르는 척이 특기다.",
      stats: [
        { label: "전투력", value: 40, max: 100 },
        { label: "탐색",   value: 70, max: 100 },
        { label: "체력",   value: 50, max: 100 },
        { label: "운",     value: 60, max: 100 },
      ],
    },
    "순환회원_펜": {
      traits: ["냉소적", "계산적"],
      desc: "모든 걸 손익으로 환산한다. 틀린 적이 거의 없다.",
      stats: [
        { label: "전투력", value: 45, max: 100 },
        { label: "탐색",   value: 65, max: 100 },
        { label: "체력",   value: 55, max: 100 },
        { label: "운",     value: 42, max: 100 },
      ],
    },
    "순환회원_유이": {
      traits: ["밝음", "순수"],
      desc: "진실을 모른다. 그래서 제일 밝다.",
      stats: [
        { label: "전투력", value: 28, max: 100 },
        { label: "탐색",   value: 55, max: 100 },
        { label: "체력",   value: 60, max: 100 },
        { label: "운",     value: 80, max: 100 },
      ],
    },
    "순환회원_렌": {
      traits: ["불안", "예민"],
      desc: "무언가를 목격했다. 말할 수가 없다.",
      stats: [
        { label: "전투력", value: 32, max: 100 },
        { label: "탐색",   value: 62, max: 100 },
        { label: "체력",   value: 42, max: 100 },
        { label: "운",     value: 50, max: 100 },
      ],
    },
    "순환회원_토르": {
      traits: ["광신적", "체념"],
      desc: "순환을 믿는다. 끝이 시작이라고 한다.",
      stats: [
        { label: "전투력", value: 55, max: 100 },
        { label: "탐색",   value: 50, max: 100 },
        { label: "체력",   value: 78, max: 100 },
        { label: "운",     value: 20, max: 100 },
      ],
    },
  };

  // NPC 대화 쿨타임 타이머
  useEffect(() => {
    if (!npcModal?.isEnding || npcModal?.permanentEnd) return;

    const duration = 5000; // 5초 쿨타임
    const interval = 50;   // 0.05초마다 갱신
    const step = (interval / duration) * 100;

    const timer = setInterval(() => {
      setNpcModal(current => {
        if (!current || !current.isEnding) {
          clearInterval(timer);
          return current;
        }
        const nextProgress = (current.coolProgress || 0) + step;
        if (nextProgress >= 100) {
          clearInterval(timer);
          return { ...current, isEnding: false, coolProgress: 0, count: 1, isPostCooldown: true };
        }
        return { ...current, coolProgress: nextProgress };
      });
    }, interval);

    return () => clearInterval(timer);
  }, [npcModal?.isEnding]);



  useEffect(() => {
    if (zoneRows.length > 0) setRoots(buildTree(zoneRows));
  }, [zoneRows]);

  // path = list of zone IDs navigated into (excludes "world" root)
  const [path, setPath] = useState<string[]>([]);

  // 탐험 중인 구역으로 이동하는 함수 — Topbar에서 호출 가능하도록 ref 등록
  useEffect(() => {
    navigateToActiveRef.current = () => {
      if (!state.isExploring || !currentAction.zoneId || roots.length === 0) return;
      const topLevel = roots.find(n => n.id === "world")?.children ?? roots.filter(n => n.id !== "world");
      const autoPath = findPathTo(topLevel, currentAction.zoneId);
      if (autoPath) setPath(autoPath);
    };
  });

  // 로드 시 탐험 중인 구역으로 자동 이동 + 토스트
  useEffect(() => {
    if (roots.length === 0 || !state.isExploring || !currentAction.zoneId) return;
    const topLevel = roots.find(n => n.id === "world")?.children ?? roots.filter(n => n.id !== "world");
    const autoPath = findPathTo(topLevel, currentAction.zoneId);
    if (autoPath) {
      setPath(autoPath);
      const zoneName = findNode(roots, currentAction.zoneId)?.name ?? currentAction.zoneId;
      setToast(`◉ ${zoneName}에서 탐험 중`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roots]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const activeZone     = state.isExploring ? currentAction.zoneId : "";
  const activeLeaf     = findLeaf(roots, activeZone);
  const hudLogs        = logs.slice(0, HUD_LOG_COUNT);
  const elapsed        = Math.floor((Date.now() - currentAction.createdAt) / 1000);

  // Current node being browsed (null = world root)
  const currentNode = path.length > 0 ? findNode(roots, path[path.length - 1]) : null;
  const topLevel    = roots.find(n => n.id === "world")?.children ?? roots.filter(n => n.id !== "world");
  const children    = currentNode ? currentNode.children : topLevel;

  // Map HUD: only show active exploration overlay when viewing the active leaf
  const showActiveHud  = activeLeaf != null && state.isExploring && currentNode?.id === activeZone;
  const hudZoneName    = showActiveHud ? activeLeaf!.name : (currentNode?.name ?? "세계 지도");
  const hudSubLine     = showActiveHud
    ? `${activeLeaf!.desc.slice(0, 40)}…`
    : currentNode
      ? `${currentNode.dangerLevel}`
      : "탐색 가능한 구역";
  const hudDesc        = showActiveHud ? activeLeaf!.desc : (currentNode?.desc ?? "지도를 탐색하여 다음 목적지를 선택하십시오.");

  const viewKey = currentNode?.id ?? "world";

  // Breadcrumbs
  const crumbs = [
    { id: "__root__", label: "세계 지도" },
    ...path.map(id => ({ id, label: findNode(roots, id)?.name ?? id })),
  ];

  const goBack = () => {
    setNpcModal(null);
    setPartyView(false);
    setPartySlotSelect(false);
    setCycleHQView(false);
    setPath(p => p.slice(0, -1));
  };

  const navigate = (id: string) => {
    if (findNode(roots, id)) setPath(p => [...p, id]);
  };

  const navigateToCrumb = (id: string) => {
    setNpcModal(null);
    setPartyView(false);
    setPartySlotSelect(false);
    setCycleHQView(false);
    if (id === "__root__") {
      setPath([]);
    } else {
      const idx = path.indexOf(id);
      if (idx >= 0) setPath(p => p.slice(0, idx + 1));
    }
  };

  return (
    <div className="content">
      {toast && <div className="entry-toast">{toast}</div>}
      <div className="content-header">
        <div className="breadcrumb-row">
          {path.length > 0 && (
            <button className="back-btn" title="뒤로" onClick={goBack}>
              <ChevronLeft size={14} />
            </button>
          )}
          <nav className="breadcrumb">
            {crumbs.map((c, i) => (
              <span key={c.id} className="breadcrumb-item">
                {i < crumbs.length - 1 ? (
                  <button className="breadcrumb-link" onClick={() => navigateToCrumb(c.id)}>{c.label}</button>
                ) : (
                  <span className="breadcrumb-current">{c.label}</span>
                )}
                {i < crumbs.length - 1 && <span className="breadcrumb-sep">›</span>}
              </span>
            ))}
          </nav>
          <div className="nearby-topbar">
            <div className="top-avatar"><img src={avatar} alt="" /></div>
            <div className="top-avatar"><img src={avatar} alt="" /></div>
            <div className="top-avatar"><img src={avatar} alt="" /></div>
            <div className="top-avatar"><img src={avatar} alt="" /></div>
            <div className="top-avatar"><img src={avatar} alt="" /></div>
            <div className="top-avatar-more">+29</div>
          </div>
        </div>
      </div>

      {/* ── 팀 구성 팝업 ── */}
      {teamPopupLeaf && (() => {
        const leaf = teamPopupLeaf;
        const doStart = async () => {
          setTeamPopupLeaf(null);
          setStarting(true);
          dispatch({ type: "CHANGE_ZONE", zoneId: leaf.id, tickSec: leaf.tickSec! });
          try {
            await api.startExploration(leaf.id);
          } catch {
            dispatch({ type: "STOP_EXPLORE" });
          } finally {
            setStarting(false);
          }
        };
        const btnBase: React.CSSProperties = { padding: "8px 16px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", border: "1px solid var(--border)" };
        return (
          <div
            style={{ position: "absolute", inset: 0, zIndex: 50, backgroundColor: "rgba(0,0,0,0.88)", display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={() => setTeamPopupLeaf(null)}
          >
            <div
              style={{ width: "85%", maxWidth: 340, backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "20px 18px", position: "relative" }}
              onClick={e => e.stopPropagation()}
            >
              {/* 제목 */}
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>팀 구성</div>
              <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 16 }}>
                {leaf.name} · {leaf.actionType} 시작 전 팀을 확인하세요.
              </div>

              {/* 슬롯 4개 */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>

                {/* 슬롯 1 */}
                {slot1Member ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <img src={avatar} alt={slot1Member} style={{ width: 40, height: 40, borderRadius: 5, border: "1px solid var(--border)", opacity: slot1Member === "__player__" ? 0.75 : 1 }} />
                    <div>
                      <div style={{ fontSize: 13, color: "var(--text)", fontWeight: slot1Member === "__player__" ? 700 : 400 }}>
                        {slot1Member === "__player__" ? "나 (플레이어)" : slot1Member}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>
                        {slot1Member === "__player__" ? "주도자" : (NPC_LOCATION[slot1Member] === "베이스캠프" ? "동행 · 대기중" : "동행 · 타지역")}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 12, opacity: 0.55, cursor: "pointer" }}
                    onClick={() => { setCompanionTarget(1); setAddCompanionOpen(true); }}
                  >
                    <div style={{ width: 40, height: 40, borderRadius: 5, border: "1px dashed var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-dim)", fontSize: 18 }}>+</div>
                    <div style={{ fontSize: 12, color: "var(--text-dim)" }}>동행 없음 · 탭하여 추가</div>
                  </div>
                )}

                {/* 슬롯 2 */}
                {partySlot1 ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <img src={avatar} alt={partySlot1} style={{ width: 40, height: 40, borderRadius: 5, border: "1px solid var(--border)", opacity: partySlot1 === "__player__" ? 0.75 : 1 }} />
                    <div>
                      <div style={{ fontSize: 13, color: "var(--text)", fontWeight: partySlot1 === "__player__" ? 700 : 400 }}>
                        {partySlot1 === "__player__" ? "나 (플레이어)" : partySlot1}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>
                        {partySlot1 === "__player__" ? "주도자" : (NPC_LOCATION[partySlot1] === "베이스캠프" ? "동행 · 대기중" : "동행 · 타지역")}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 12, opacity: 0.55, cursor: "pointer" }}
                    onClick={() => { setCompanionTarget(2); setAddCompanionOpen(true); }}
                  >
                    <div style={{ width: 40, height: 40, borderRadius: 5, border: "1px dashed var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-dim)", fontSize: 18 }}>+</div>
                    <div style={{ fontSize: 12, color: "var(--text-dim)" }}>동행 없음 · 탭하여 추가</div>
                  </div>
                )}

                {/* 슬롯 3, 4 — 잠김 */}
                {[3, 4].map(n => (
                  <div key={n} style={{ display: "flex", alignItems: "center", gap: 12, opacity: 0.35 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 5, border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-dim)", fontSize: 16 }}>🔒</div>
                    <div>
                      <div style={{ fontSize: 13, color: "var(--text-dim)" }}>슬롯 {n}</div>
                      <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>해금 필요</div>
                    </div>
                  </div>
                ))}

              </div>

              {/* 하단 버튼 */}
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => setTeamPopupLeaf(null)}
                    style={{ ...btnBase, background: "transparent", color: "var(--text-dim)" }}
                  >
                    닫기
                  </button>
                  <button
                    onClick={() => { setSlot1Member(null); setPartySlot1(null); }}
                    style={{ ...btnBase, background: "transparent", color: "var(--text-dim)" }}
                  >
                    지우기
                  </button>
                </div>
                <button
                  onClick={doStart}
                  style={{ ...btnBase, backgroundColor: "var(--amber)", color: "#000", border: "none", padding: "8px 20px" }}
                >
                  {leaf.actionType} 시작
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── 동행 추가 팝업 (팀 구성 내) ── */}
      {addCompanionOpen && (
        <div
          style={{ position: "absolute", inset: 0, zIndex: 60, backgroundColor: "rgba(0,0,0,0.88)", display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setAddCompanionOpen(false)}
        >
          <div
            style={{ width: "85%", maxWidth: 320, backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "18px 16px", position: "relative" }}
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => setAddCompanionOpen(false)} style={{ position: "absolute", top: 10, right: 12, background: "none", border: "none", color: "var(--text-dim)", fontSize: 16, cursor: "pointer" }}>✕</button>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 14 }}>동행 선택</div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflowY: "auto" }}>

              {/* 나 자신 — 항상 맨 위, 대기중 탭에서만 표시 */}
              {partyStatusFilter !== "busy" && (
                <div
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
                    borderRadius: 6, cursor: "pointer",
                    border: "1px solid var(--border)",
                    backgroundColor: "rgba(255,255,255,0.03)",
                  }}
                  onClick={() => {
                    if (companionTarget === 1) { setSlot1Member("__player__"); }
                    else { setPartySlot1("__player__"); }
                    setAddCompanionOpen(false);
                  }}
                >
                  <img src={avatar} alt="나" style={{ width: 36, height: 36, borderRadius: 5, border: "1px solid var(--border)", flexShrink: 0, opacity: 0.75 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: "var(--text-dim)", fontWeight: 600, marginBottom: 4 }}>나 (플레이어)</div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 8, border: "1px solid var(--border)", color: "var(--text-dim)" }}>주도자</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-dim)", opacity: 0.5, flexShrink: 0 }}>나 자신</div>
                </div>
              )}

              {hiredCompanions.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--text-dim)", padding: "10px 0", textAlign: "center", opacity: 0.6 }}>
                  베이스캠프 → 동행 탭에서 동행인을 먼저 고용하세요.
                </div>
              ) : (
                hiredCompanions.map(npcName => {
                  const profile = NPC_PROFILES[npcName];
                  return (
                    <div
                      key={npcName}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border)", cursor: "pointer" }}
                      onClick={() => {
                        if (companionTarget === 1) { setSlot1Member(npcName); }
                        else { setPartySlot1(npcName); }
                        setAddCompanionOpen(false);
                      }}
                    >
                      <img src={avatar} alt={npcName} style={{ width: 36, height: 36, borderRadius: 5, border: "1px solid var(--border)", flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: "var(--text)", fontWeight: 600, marginBottom: 4 }}>{npcName}</div>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {profile?.traits.map(t => (
                            <span key={t} style={{ fontSize: 9, padding: "1px 6px", borderRadius: 8, border: "1px solid var(--amber-dim)", color: "var(--amber-dim)" }}>{t}</span>
                          ))}
                        </div>
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-dim)", opacity: 0.7, flexShrink: 0 }}>
                        대기중
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── NPC 상세 팝업 ── */}
      {npcDetailPopup && (() => {
        const profile = NPC_PROFILES[npcDetailPopup];
        const isAvailable = NPC_LOCATION[npcDetailPopup] === "베이스캠프";
        return (
          <div
            style={{
              position: "absolute", inset: 0, zIndex: 50,
              backgroundColor: "rgba(0,0,0,0.88)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
            onClick={() => setNpcDetailPopup(null)}
          >
            <div
              style={{
                width: "80%", maxWidth: 320,
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "20px 18px",
                position: "relative",
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* 닫기 */}
              <button
                onClick={() => setNpcDetailPopup(null)}
                style={{ position: "absolute", top: 10, right: 12, background: "none", border: "none", color: "var(--text-dim)", fontSize: 16, cursor: "pointer" }}
              >✕</button>

              {/* 헤더 */}
              <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 16 }}>
                <img src={avatar} alt={npcDetailPopup} style={{ width: 52, height: 52, borderRadius: 6, border: "1px solid var(--border)" }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>{npcDetailPopup}</div>
                  <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 3 }}>
                    {isAvailable ? "베이스캠프 상주" : `타지역 작업 중 · ${NPC_LOCATION[npcDetailPopup] ?? "미확인"}`}
                  </div>
                  <div style={{ display: "flex", gap: 5, marginTop: 6 }}>
                    {profile?.traits.map(t => (
                      <span key={t} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 10, border: "1px solid var(--amber-dim)", color: "var(--amber-dim)" }}>{t}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* 소개 */}
              {profile?.desc && (
                <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 16, lineHeight: 1.6, borderLeft: "2px solid var(--border)", paddingLeft: 10 }}>
                  {profile.desc}
                </div>
              )}

              {/* 스탯 */}
              {profile?.stats && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {profile.stats.map(s => (
                    <div key={s.label}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-dim)", marginBottom: 3 }}>
                        <span>{s.label}</span>
                        <span>{s.value}</span>
                      </div>
                      <div style={{ height: 4, backgroundColor: "var(--border)", borderRadius: 2 }}>
                        <div style={{ height: "100%", width: `${(s.value / s.max) * 100}%`, backgroundColor: "var(--amber)", borderRadius: 2, transition: "width 0.3s" }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 동행 버튼 */}
              {partySlot1 === npcDetailPopup ? (
                <div style={{ marginTop: 18, display: "flex", gap: 8 }}>
                  <button
                    disabled
                    style={{
                      flex: 1, padding: "9px 0",
                      backgroundColor: "var(--border)",
                      color: "var(--text-dim)",
                      border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "default",
                    }}
                  >
                    동행 중
                  </button>
                  <button
                    onClick={() => { setPartySlot1(null); setNpcDetailPopup(null); }}
                    style={{
                      flex: 1, padding: "9px 0",
                      backgroundColor: "transparent",
                      color: "var(--text-dim)",
                      border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer",
                    }}
                  >
                    동행 해제
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setPartySlot1(npcDetailPopup); setPartySlotSelect(false); setNpcDetailPopup(null); }}
                  style={{
                    marginTop: 18, width: "100%", padding: "9px 0",
                    backgroundColor: "var(--amber)",
                    color: "#000",
                    border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer",
                  }}
                >
                  동행 등록
                </button>
              )}
            </div>
          </div>
        );
      })()}

      <div className="content-body">

        {/* ── 동행 (파티) 뷰 ── */}
        {partyView ? (
          <>
            <div className="map-preview-wrap" data-view="basecamp">
              <img src={ZONE_IMAGES["basecamp"] ?? mapPreview} alt="동행" className="map-preview" />
              <div className="map-region-tint" />
              <div className="map-hud-top">
                <div className="map-hud-title-row">
                  <span className="map-hud-zone-name">{partySlotSelect ? "동료 선택" : "동행"}</span>
                </div>
                <div className="map-hud-sub">
                  {partySlotSelect ? "함께할 동료를 선택하세요." : "함께 탐색할 동료를 편성하세요."}
                </div>
              </div>
            </div>

            {/* ── 방문객 슬롯 ── */}
            <div style={{ padding: "12px 14px 0" }}>
              <div style={{ fontSize: 10, color: "var(--text-dim)", marginBottom: 8, letterSpacing: 1, textTransform: "uppercase" }}>
                방문객 슬롯
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {visitorSlots.map((slot, idx) => {
                  if (!slot.unlocked) {
                    return (
                      <div key={idx} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", border: "1px solid var(--border)", opacity: 0.4, backgroundColor: "rgba(0,0,0,0.2)" }}>
                        <div style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "var(--text-dim)" }}>🔒</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, color: "var(--text-dim)", fontWeight: 600 }}>슬롯 {idx + 1}</div>
                          <div style={{ fontSize: 10, color: "var(--text-dim)" }}>해금 필요</div>
                        </div>
                      </div>
                    );
                  }
                  if (!slot.visitor) {
                    return (
                      <div key={idx} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", border: "1px solid var(--border)", backgroundColor: "rgba(0,0,0,0.1)" }}>
                        <div style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "var(--text-dim)", opacity: 0.4 }}>···</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, color: "var(--text-dim)" }}>슬롯 {idx + 1} · 대기 중</div>
                          <div style={{ fontSize: 10, color: "var(--text-dim)", opacity: 0.6, marginTop: 2 }}>다음 방문객까지 · {fmtCountdown(slot.nextVisitorAt)}</div>
                        </div>
                      </div>
                    );
                  }
                  const isHired = hiredCompanions.includes(slot.visitor);
                  return (
                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", border: `1px solid ${isHired ? "var(--border)" : "var(--amber-dim)"}`, backgroundColor: isHired ? "rgba(0,0,0,0.1)" : "rgba(181,137,0,0.06)" }}>
                      <img src={avatar} alt={slot.visitor} style={{ width: 44, height: 44, borderRadius: 4, border: "1px solid var(--border)" }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 2 }}>{slot.visitor}</div>
                        <div style={{ fontSize: 10, color: "var(--text-dim)" }}>
                          {isHired ? "✓ 고용됨" : `교체까지 · ${fmtCountdown(slot.nextVisitorAt)}`}
                        </div>
                      </div>
                      {!isHired && (
                        <button
                          onClick={() => hireVisitor(idx)}
                          style={{ padding: "6px 14px", fontSize: 11, cursor: "pointer", background: "var(--amber-dim)", border: "none", color: "#000", fontWeight: 700, fontFamily: "inherit", flexShrink: 0 }}
                        >
                          고용하기
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── 고용된 동행인 목록 ── */}
            <div style={{ padding: "16px 14px 0" }}>
              <div style={{ fontSize: 10, color: "var(--text-dim)", marginBottom: 8, letterSpacing: 1, textTransform: "uppercase" }}>
                동행인 ({hiredCompanions.length})
              </div>
            </div>
            <div className="nav-list" style={{ maxHeight: "260px", overflowY: "auto" }}>
              <div className="nav-row" onClick={() => setPartyView(false)}>
                <div className="nav-row-info">
                  <div className="nav-row-name">← 돌아가기</div>
                </div>
              </div>
              {hiredCompanions.length === 0 ? (
                <div style={{ padding: "12px 14px", fontSize: 12, color: "var(--text-dim)", opacity: 0.5 }}>
                  고용된 동행인이 없습니다. 방문객을 고용해보세요.
                </div>
              ) : (
                hiredCompanions.map(npcName => {
                  const profile = NPC_PROFILES[npcName];
                  return (
                    <div
                      key={npcName}
                      className={`nav-row nav-row--npc${partySlot1 === npcName ? " nav-row--active" : ""}`}
                      onClick={() => setNpcDetailPopup(npcName)}
                    >
                      <img className="nav-row-avatar" src={avatar} alt={npcName} />
                      <div className="nav-row-info">
                        <div className="nav-row-name">{npcName}</div>
                        <div className="nav-row-sub" style={{ color: "var(--text-dim)", fontSize: 11 }}>
                          {profile?.traits.slice(0, 2).join(" · ") ?? "동행 가능"}
                        </div>
                      </div>
                      <div className="nav-row-arrow">›</div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : null}

        {/* ── 순환회 거점 뷰 ── */}
        {cycleHQView ? (
          <>
            <div className="map-preview-wrap" data-view="basecamp">
              <img src={ZONE_IMAGES["basecamp"] ?? mapPreview} alt="순환회 거점" className="map-preview" />
              <div className="map-region-tint" />
              <div className="map-hud-top">
                <div className="map-hud-title-row">
                  <span className="map-hud-zone-name">순환회 거점</span>
                </div>
                <div className="map-hud-sub">베이스캠프 내 순환회원 상주 구역</div>
              </div>
            </div>
            <div className="nav-list">
              <div className="nav-row" onClick={() => setCycleHQView(false)}>
                <div className="nav-row-info">
                  <div className="nav-row-name">← 돌아가기</div>
                </div>
              </div>
              {["순환회원_카이", "순환회원_펜", "순환회원_유이", "순환회원_렌", "순환회원_토르"].map((npcName) => (
                <div
                  key={npcName}
                  className="nav-row nav-row--npc"
                  onClick={() => {
                    const result = npcDialog(npcName, "basecamp", 0);
                    setCycleHQView(false);
                    setNpcModal({ name: npcName, lines: result.lines, isEnding: result.isEnding, count: 1 });
                  }}
                >
                  <img className="nav-row-avatar" src={avatar} alt={npcName} />
                  <div className="nav-row-info">
                    <div className="nav-row-name">{npcName}</div>
                    <div className="nav-row-sub" style={{ color: "var(--text-dim)" }}>베이스캠프 상주</div>
                  </div>
                  <div className="nav-row-arrow">›</div>
                </div>
              ))}
            </div>
          </>
        ) : null}

        {/* ── NPC 대화 / 맵 미리보기 ── */}
        {!partyView && !cycleHQView && npcModal ? (
          <div className="npc-dialog-wrap">
            <span className="modal-corner modal-corner--tl" />
            <span className="modal-corner modal-corner--tr" />
            <span className="modal-corner modal-corner--bl" />
            <span className="modal-corner modal-corner--br" />
            <div className="modal-header">
              <div className="modal-image-wrap">
                <img className="modal-image" src={avatar} alt={npcModal.name} />
              </div>
              <div className="modal-label">{npcModal.name}</div>
              <div className="modal-sublabel">탐험자</div>
            </div>
            <div className="modal-divider"><span>대화</span></div>
            <div className="modal-body">
              {npcModal.lines.map((line, i) => <p key={i}>{line}</p>)}
            </div>
          </div>
        ) : !partyView && !cycleHQView ? (
        <div className="map-preview-wrap" data-view={viewKey}>
          <img src={ZONE_IMAGES[viewKey] ?? mapPreview} alt="구역 지도" className="map-preview" />
          <div className="map-region-tint" />

          <div className="map-hud-top">
            <div className="map-hud-title-row">
              <span className="map-hud-zone-name">{hudZoneName}</span>
              {showActiveHud && <span className="map-hud-pct">{progress.toFixed(1)}%</span>}
            </div>
            <div className="map-hud-sub">{hudSubLine}</div>
            <div className="map-hud-desc">{hudDesc}</div>
            {showActiveHud && <div className="map-hud-elapsed">◷ {fmtElapsed(elapsed)}</div>}
          </div>

          {showActiveHud && (
            <div className="map-hud-log">
              {hudLogs.length > 0 && [...hudLogs].reverse().map((entry, i) => {
                const age = hudLogs.length - 1 - i;
                return (
                  <div key={i} className="map-hud-line" style={{ opacity: 1 - age * 0.22 }}>
                    {entry.segments.map((seg, j) =>
                      seg.type === "plain"
                        ? <span key={j}>{seg.text}</span>
                        : <span key={j} className={seg.type}>{seg.text}</span>
                    )}
                  </div>
                );
              })}
              <div className="map-hud-tick-bar">
                <div ref={mapTickRef} className="map-hud-tick-fill" />
              </div>
            </div>
          )}
        </div>
        ) : null}

        {/* ── Zone 리스트 / NPC 대화 액션 ── */}
        {!partyView && (
        <div className="nav-list">
          {npcModal ? (
            <>
              {npcModal.isEnding && !npcModal.permanentEnd && (
                <div style={{ 
                  height: '2px', // 더 얇게
                  background: 'rgba(0,0,0,0.3)', 
                  width: '100%', 
                  marginBottom: '-1px',
                  position: 'relative',
                  zIndex: 10
                }}>
                  <div style={{
                    height: '100%',
                    background: '#CC785C',
                    width: `${npcModal.coolProgress || 0}%`,
                    transition: 'width 0.05s linear',
                    boxShadow: '0 0 6px rgba(204, 120, 92, 0.5)'
                  }} />
                </div>
              )}
              <div 
                className={`nav-row ${npcModal.isEnding ? "nav-row--disabled" : ""}`}
                style={npcModal.isEnding ? { 
                  backgroundColor: "rgba(220, 50, 47, 0.2)", 
                  color: "var(--red-dim)",
                  opacity: 0.9, 
                  cursor: "not-allowed" 
                } : {}}
                onClick={() => {
                  if (npcModal.isEnding) return;
                  setNpcModal(current => {
                    if (!current) return null;
                    const nextCount = current.count + 1;
                    // current.lines[1]은 실제 대사 줄이므로 이를 excludeLine으로 전달
                    // 쿨타임 후 첫 클릭: "좋아요..." 대사를 보여주고 postCooldownPhase 진입
                    if (current.isPostCooldown) {
                      const { lines, isEnding } = npcDialog(current.name, currentNode?.id || 'world', Math.random(), nextCount, undefined, true);
                      return {
                        ...current,
                        count: nextCount,
                        lines,
                        isEnding,
                        isPostCooldown: false,
                        postCooldownPhase: true,
                      };
                    }
                    // postCooldownPhase: 다온 전용 리스트에서 대사 선택 (랜덤, 중복 없음)
                    if (current.postCooldownPhase && current.name.split("_")[1] === "다온") {
                      const shown = current.shownPostLines ?? [];
                      const remaining = DAON_POST_COOLDOWN_LINES.filter(l => !shown.includes(l));
                      if (remaining.length === 0) {
                        return {
                          ...current,
                          count: nextCount,
                          lines: ["...", "오늘 탐색 기록은 여기까지예요. 정리하러 가야 해요."],
                          isEnding: true,
                          permanentEnd: true,
                          postCooldownPhase: true,
                          shownPostLines: shown,
                        };
                      }
                      const line = remaining[Math.floor(Math.random() * remaining.length)];
                      return {
                        ...current,
                        count: nextCount,
                        lines: ["...", line],
                        isEnding: false,
                        postCooldownPhase: true,
                        shownPostLines: [...shown, line],
                      };
                    }
                    // postCooldownPhase: 카라 전용 리스트에서 대사 선택 (랜덤, 중복 없음)
                    if (current.postCooldownPhase && current.name.split("_")[1] === "카라") {
                      const shown = current.shownPostLines ?? [];
                      const remaining = KARA_POST_COOLDOWN_LINES.filter(l => !shown.includes(l));
                      if (remaining.length === 0) {
                        return {
                          ...current,
                          count: nextCount,
                          lines: ["...", "아 잠시 저 어디 좀 갔다올게요!"],
                          isEnding: true,
                          permanentEnd: true,
                          postCooldownPhase: true,
                          shownPostLines: shown,
                        };
                      }
                      const line = remaining[Math.floor(Math.random() * remaining.length)];
                      return {
                        ...current,
                        count: nextCount,
                        lines: ["...", line],
                        isEnding: false,
                        postCooldownPhase: true,
                        shownPostLines: [...shown, line],
                      };
                    }
                    // postCooldownPhase: 카이
                    if (current.postCooldownPhase && current.name.split("_")[1] === "카이") {
                      const shown = current.shownPostLines ?? [];
                      const remaining = KAI_POST_COOLDOWN_LINES.filter(l => !shown.includes(l));
                      if (remaining.length === 0) {
                        return { ...current, count: nextCount, lines: ["...", "...더 이상 말하면 안 될 것 같아요."], isEnding: true, permanentEnd: true, postCooldownPhase: true, shownPostLines: shown };
                      }
                      const line = remaining[Math.floor(Math.random() * remaining.length)];
                      return { ...current, count: nextCount, lines: ["...", line], isEnding: false, postCooldownPhase: true, shownPostLines: [...shown, line] };
                    }
                    // postCooldownPhase: 펜
                    if (current.postCooldownPhase && current.name.split("_")[1] === "펜") {
                      const shown = current.shownPostLines ?? [];
                      const remaining = PEN_POST_COOLDOWN_LINES.filter(l => !shown.includes(l));
                      if (remaining.length === 0) {
                        return { ...current, count: nextCount, lines: ["...", "이제 진짜 할 말 없어요."], isEnding: true, permanentEnd: true, postCooldownPhase: true, shownPostLines: shown };
                      }
                      const line = remaining[Math.floor(Math.random() * remaining.length)];
                      return { ...current, count: nextCount, lines: ["...", line], isEnding: false, postCooldownPhase: true, shownPostLines: [...shown, line] };
                    }
                    // postCooldownPhase: 유이
                    if (current.postCooldownPhase && current.name.split("_")[1] === "유이") {
                      const shown = current.shownPostLines ?? [];
                      const remaining = YUI_POST_COOLDOWN_LINES.filter(l => !shown.includes(l));
                      if (remaining.length === 0) {
                        return { ...current, count: nextCount, lines: ["...", "저 이제 정말 가야 해요!"], isEnding: true, permanentEnd: true, postCooldownPhase: true, shownPostLines: shown };
                      }
                      const line = remaining[Math.floor(Math.random() * remaining.length)];
                      return { ...current, count: nextCount, lines: ["...", line], isEnding: false, postCooldownPhase: true, shownPostLines: [...shown, line] };
                    }
                    // postCooldownPhase: 렌
                    if (current.postCooldownPhase && current.name.split("_")[1] === "렌") {
                      const shown = current.shownPostLines ?? [];
                      const remaining = REN_POST_COOLDOWN_LINES.filter(l => !shown.includes(l));
                      if (remaining.length === 0) {
                        return { ...current, count: nextCount, lines: ["...", "...더는 못 하겠어요. 미안해요."], isEnding: true, permanentEnd: true, postCooldownPhase: true, shownPostLines: shown };
                      }
                      const line = remaining[Math.floor(Math.random() * remaining.length)];
                      return { ...current, count: nextCount, lines: ["...", line], isEnding: false, postCooldownPhase: true, shownPostLines: [...shown, line] };
                    }
                    // postCooldownPhase: 토르
                    if (current.postCooldownPhase && current.name.split("_")[1] === "토르") {
                      const shown = current.shownPostLines ?? [];
                      const remaining = TOR_POST_COOLDOWN_LINES.filter(l => !shown.includes(l));
                      if (remaining.length === 0) {
                        return { ...current, count: nextCount, lines: ["...", "됐어."], isEnding: true, permanentEnd: true, postCooldownPhase: true, shownPostLines: shown };
                      }
                      const line = remaining[Math.floor(Math.random() * remaining.length)];
                      return { ...current, count: nextCount, lines: ["...", line], isEnding: false, postCooldownPhase: true, shownPostLines: [...shown, line] };
                    }
                    // postCooldownPhase: C티어 공통 (나린/루카/에이/볼크/이든)
                    const C_TIER_POST: Record<string, { list: string[]; ending: string }> = {
                      "나린": { list: NARIN_POST_COOLDOWN_LINES, ending: "오늘 조사는 여기까지예요." },
                      "루카": { list: LUCA_POST_COOLDOWN_LINES,  ending: "철수해야 할 것 같아요." },
                      "에이": { list: EI_POST_COOLDOWN_LINES,    ending: "오늘은 여기까지 볼게요." },
                      "볼크": { list: VOLK_POST_COOLDOWN_LINES,  ending: "더 있다간 안 될 것 같아요." },
                      "이든": { list: EDEN_POST_COOLDOWN_LINES,  ending: "저 더 안쪽으로 가볼게요. 진짜로." },
                    };
                    const cName = current.name.split("_")[1];
                    if (current.postCooldownPhase && C_TIER_POST[cName]) {
                      const { list, ending } = C_TIER_POST[cName];
                      const shown = current.shownPostLines ?? [];
                      const remaining = list.filter(l => !shown.includes(l));
                      if (remaining.length === 0) {
                        return { ...current, count: nextCount, lines: ["...", ending], isEnding: true, permanentEnd: true, postCooldownPhase: true, shownPostLines: shown };
                      }
                      const line = remaining[Math.floor(Math.random() * remaining.length)];
                      return { ...current, count: nextCount, lines: ["...", line], isEnding: false, postCooldownPhase: true, shownPostLines: [...shown, line] };
                    }
                    // postCooldownPhase: 세라
                    if (current.postCooldownPhase && current.name.split("_")[1] === "세라") {
                      const shown = current.shownPostLines ?? [];
                      const remaining = SERA_POST_COOLDOWN_LINES.filter(l => !shown.includes(l));
                      if (remaining.length === 0) {
                        return { ...current, count: nextCount, lines: ["...", "오늘 할당량 다 찼어요. 이제 가요."], isEnding: true, permanentEnd: true, postCooldownPhase: true, shownPostLines: shown };
                      }
                      const line = remaining[Math.floor(Math.random() * remaining.length)];
                      return { ...current, count: nextCount, lines: ["...", line], isEnding: false, postCooldownPhase: true, shownPostLines: [...shown, line] };
                    }
                    // postCooldownPhase: 하켄
                    if (current.postCooldownPhase && current.name.split("_")[1] === "하켄") {
                      const shown = current.shownPostLines ?? [];
                      const remaining = HAKEN_POST_COOLDOWN_LINES.filter(l => !shown.includes(l));
                      if (remaining.length === 0) {
                        return { ...current, count: nextCount, lines: ["...", "저 이제 진짜 저쪽 가봐야겠어요. 오래 기다렸거든요."], isEnding: true, permanentEnd: true, postCooldownPhase: true, shownPostLines: shown };
                      }
                      const line = remaining[Math.floor(Math.random() * remaining.length)];
                      return { ...current, count: nextCount, lines: ["...", line], isEnding: false, postCooldownPhase: true, shownPostLines: [...shown, line] };
                    }
                    // postCooldownPhase: 시오 전용 리스트에서 대사 선택 (랜덤, 중복 없음)
                    if (current.postCooldownPhase && current.name.split("_")[1] === "시오") {
                      const shown = current.shownPostLines ?? [];
                      const remaining = SIOH_POST_COOLDOWN_LINES.filter(l => !shown.includes(l));
                      if (remaining.length === 0) {
                        return {
                          ...current,
                          count: nextCount,
                          lines: ["...", "아, 저 이제 진짜 가야 해요. 다음에 봐요."],
                          isEnding: true,
                          permanentEnd: true,
                          postCooldownPhase: true,
                          shownPostLines: shown,
                        };
                      }
                      const line = remaining[Math.floor(Math.random() * remaining.length)];
                      return {
                        ...current,
                        count: nextCount,
                        lines: ["...", line],
                        isEnding: false,
                        postCooldownPhase: true,
                        shownPostLines: [...shown, line],
                      };
                    }
                    // postCooldownPhase: 미르 전용 리스트에서 대사 선택
                    if (current.postCooldownPhase && current.name.split("_")[1] === "미르") {
                      const shown = current.shownPostLines ?? [];

                      // 번아웃 체인 진행 중이면 순서대로
                      if (shown.includes(MIR_BURNOUT_TRIGGER)) {
                        const nextBurnoutLine = MIR_BURNOUT_CHAIN.find(l => !shown.includes(l));
                        if (nextBurnoutLine) {
                          const newShown = [...shown, nextBurnoutLine];
                          const burnoutDone = MIR_BURNOUT_CHAIN.every(l => newShown.includes(l));
                          return {
                            ...current,
                            count: nextCount,
                            lines: ["...", nextBurnoutLine],
                            isEnding: burnoutDone,
                            permanentEnd: burnoutDone,
                            postCooldownPhase: true,
                            shownPostLines: newShown,
                          };
                        }
                      }

                      // 조건부 대사가 있으면 무조건 먼저 순서대로 소진
                      const conditional = MIR_POST_COOLDOWN_CONDITIONAL
                        .filter(c => c.requires !== MIR_BURNOUT_TRIGGER && shown.includes(c.requires) && !shown.includes(c.line))
                        .map(c => c.line);
                      if (conditional.length > 0) {
                        const line = conditional[0];
                        return {
                          ...current,
                          count: nextCount,
                          lines: ["...", line],
                          isEnding: false,
                          postCooldownPhase: true,
                          shownPostLines: [...shown, line],
                        };
                      }
                      // "불안해" 대사는 10개 이상 본 뒤에만 풀에 추가
                      const remaining = MIR_POST_COOLDOWN_LINES.filter(l => {
                        if (l === MIR_BURNOUT_TRIGGER) return shown.length >= 10 && !shown.includes(l);
                        return !shown.includes(l);
                      });
                      if (remaining.length === 0) {
                        return { ...current, lines: ["...", "..."], isEnding: false };
                      }
                      const line = remaining[Math.floor(Math.random() * remaining.length)];
                      return {
                        ...current,
                        count: nextCount,
                        lines: ["...", line],
                        isEnding: false,
                        postCooldownPhase: true,
                        shownPostLines: [...shown, line],
                      };
                    }
                    // 일반 대화: 이미 나온 대사 제외하고 선택
                    const shown = current.shownLines ?? [];
                    const { lines, isEnding } = npcDialog(current.name, currentNode?.id || 'world', Math.random(), nextCount, shown);
                    const newShown = lines[1] ? [...shown, lines[1]] : shown;
                    return {
                      ...current,
                      count: nextCount,
                      lines,
                      isEnding,
                      isPostCooldown: false,
                      shownLines: newShown,
                    };
                  });
                }}
              >
                <div className="nav-row-info">
                  <div className="nav-row-name" style={npcModal.isEnding ? { color: "var(--red-dim)" } : {}}>
                    {npcModal.isEnding ? "더 이상 대화할 수 없다" : "대화를 이어간다"}
                  </div>
                </div>
                <div className="nav-row-arrow" style={npcModal.isEnding ? { color: "var(--red-dim)" } : {}}>
                  {npcModal.isEnding ? "✕" : "›"}
                </div>
              </div>

              <div className="nav-row" onClick={() => setNpcModal(null)}>
                <div className="nav-row-info">
                  <div className="nav-row-name">자리를 뜬다</div>
                </div>
                <div className="nav-row-arrow">›</div>
              </div>
            </>
          ) : roots.length === 0 ? (
            <>
              {[0.9, 0.65, 0.75, 0.55].map((w, i) => (
                <div key={i} className="nav-row nav-row--skeleton">
                  <div className="nav-row-info">
                    <div className="skeleton-line" style={{ width: `${w * 100}%` }} />
                    <div className="skeleton-line skeleton-line--sm" style={{ width: "40%" }} />
                  </div>
                </div>
              ))}
            </>
          ) : currentNode?.tickSec != null ? (
            /* ── Leaf view: action rows ── */
            (() => {
              const leaf       = currentNode;
              const isActive   = leaf.id === activeZone;
              const skillLevel = leaf.jobType ? (skills[leaf.jobType] ?? 0) : 0;
              const locked     = leaf.levelReq > 0 && skillLevel < leaf.levelReq;
              const action     = leaf.actionType ?? "탐험";
              return (
                <>
                  {/* 스킬 레벨 표시 */}
                  {leaf.jobType && (
                    <div className="nav-skill-row">
                      <span className="nav-skill-label">{action}</span>
                      <span className="nav-skill-level">{skillLevel.toFixed(2)}</span>
                      {locked && (
                        <span className="nav-skill-req"> (필요 {leaf.levelReq}.00)</span>
                      )}
                    </div>
                  )}

                  {/* 탐색 시작 / 탐색 중 */}
                  <div
                    className={`nav-row${isActive ? " nav-row--active" : ""}${starting ? " nav-row--pending" : ""}${locked ? " nav-row--locked" : ""}`}
                    onClick={() => {
                      if (isActive || starting || locked) return;
                      setSlot1Member(null);
                      setTeamPopupLeaf(leaf);
                    }}
                  >
                    <div className="nav-row-info">
                      <div className="nav-row-name">
                        {locked
                          ? `🔒 ${action} ${leaf.levelReq}.00 필요`
                          : starting ? "◌ 연결 중…"
                          : isActive ? `◉ ${action} 중`
                          : `▶ ${action} 시작`}
                      </div>
                      <div className="nav-row-badges">
                        {isActive
                          ? <>
                              <span className="badge">◷ {fmtElapsed(elapsed)}</span>
                              <span className="badge">{progress.toFixed(1)}%</span>
                            </>
                          : <>
                              <span className="badge">◷ {leaf.tickSec}s</span>
                              <span className={`badge badge--danger ${DANGER_CLASS[leaf.dangerLevel]}`}>{leaf.dangerLevel}</span>
                            </>
                        }
                      </div>
                    </div>
                    {isActive ? (
                      <button
                        className={`nav-row-cancel${stopping ? " nav-row-cancel--pending" : ""}`}
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (stopping) return;
                          setStopping(true);
                          dispatch({ type: "STOP_EXPLORE" });
                          try { await api.stopExploration(); }
                          catch { /* ok */ }
                          finally { setStopping(false); }
                        }}
                      >
                        {stopping ? "◌" : "✕"}
                      </button>
                    ) : (
                      <div className="nav-row-arrow">{locked ? "🔒" : "▶"}</div>
                    )}
                  </div>
                  {/* NPC 목록 */}
                  {zoneNpcs(leaf.id).map((npcName, i) => (
                    <div
                      key={i}
                      className="nav-row nav-row--npc"
                      onClick={() => {
                        const { lines, isEnding } = npcDialog(npcName, leaf.id, i, 1);
                        setNpcModal({
                          name: npcName,
                          lines,
                          count: 1,
                          isEnding,
                          isPostCooldown: false,
                          shownLines: lines[1] ? [lines[1]] : [],
                        });
                      }}
                    >
                      <img className="nav-row-avatar" src={avatar} alt={npcName} />
                      <div className="nav-row-info">
                        <div className="nav-row-name">{npcName}</div>
                      </div>
                      <div className="nav-row-arrow">›</div>
                    </div>
                  ))}
                </>
              );
            })()
          ) : currentNode?.id === "basecamp" ? (
            /* ── 베이스캠프 전용 UI ── */
            <>
              <div className="nav-row" onClick={() => {}}>
                <div className="nav-row-info">
                  <div className="nav-row-name">숙소</div>
                  <div className="nav-row-sub">휴식 및 회복</div>
                </div>
                <div className="nav-row-arrow">›</div>
              </div>
              <div className="nav-row" onClick={() => {}}>
                <div className="nav-row-info">
                  <div className="nav-row-name">광장</div>
                  <div className="nav-row-sub">탐색대 집결지</div>
                </div>
                <div className="nav-row-arrow">›</div>
              </div>
              <div className="nav-row" onClick={() => {}}>
                <div className="nav-row-info">
                  <div className="nav-row-name">거래소</div>
                  <div className="nav-row-sub">자원 교환 및 구매</div>
                </div>
                <div className="nav-row-arrow">›</div>
              </div>
              <div className="nav-row" onClick={() => setPartyView(true)}>
                <div className="nav-row-info">
                  <div className="nav-row-name">동행</div>
                </div>
                <div className="nav-row-arrow">›</div>
              </div>
              <div className="nav-row" onClick={() => setCycleHQView(true)}>
                <div className="nav-row-info">
                  <div className="nav-row-name">순환회 거점</div>
                  <div className="nav-row-sub">순환회원들이 머무는 구역</div>
                </div>
                <div className="nav-row-arrow">›</div>
              </div>
            </>
          ) : (
            /* ── Branch view: child list ── */
            children.map(node => {
              const isLeaf         = node.tickSec != null;
              const isActive       = node.id === activeZone;
              const containsActive = activeZone ? findNode([node], activeZone) !== null : false;
              const action         = node.actionType ?? null;
              const skillLevel     = node.jobType ? (skills[node.jobType] ?? 0) : 0;
              const locked         = node.levelReq > 0 && skillLevel < node.levelReq;

              return (
                <div
                  key={node.id}
                  className={`nav-row${isActive ? " nav-row--active" : ""}${locked ? " nav-row--locked" : ""}`}
                  onClick={() => navigate(node.id)}
                >
                  <div className="nav-row-info">
                    <div className="nav-row-name">
                      {locked && <span style={{ marginRight: 6 }}>🔒</span>}
                      {node.name}
                      {containsActive && !isActive && (
                        <span style={{ marginLeft: 7, fontSize: 7, color: "var(--amber-dim)", opacity: 0.7, verticalAlign: "middle" }}>●</span>
                      )}
                      {containsActive && !isActive && (
                        <span style={{ marginLeft: 4, fontSize: 9, color: "var(--amber-dim)", opacity: 0.45, animation: "pulse 5s infinite", verticalAlign: "middle" }}>현재 위치</span>
                      )}
                    </div>
                    <div className="nav-row-badges">
                      {locked && <span className="badge badge--danger">Lv.{node.levelReq} 필요</span>}
                      {isLeaf && action && <span className="badge">{action}</span>}
                      {isLeaf && <span className="badge">◷ {node.tickSec}s</span>}
                      <span className={`badge badge--danger ${DANGER_CLASS[node.dangerLevel]}`}>{node.dangerLevel}</span>
                      {isActive && <span className="badge badge--active">{action ?? "탐색"} 중</span>}
                    </div>
                  </div>
                  <div className="nav-row-arrow">{locked ? "🔒" : isLeaf ? "▸" : "›"}</div>
                </div>
              );
            })
          )}
        </div>
        )}

      </div>

    </div>
  );
}
