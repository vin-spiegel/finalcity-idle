import { useEffect, useLayoutEffect, useRef } from 'react';
import avatarSrc from '../assets/image.png';

const TILE    = 20;
const MOVE_MS = 110;
const CHAR_SZ = 24;

const G=0, P=1, W=2, F=3, T=4, Q=5, D=6;
const WALKABLE = new Set([G, P, D]);

// ── 맵 (30 × 22) ─────────────────────────────────────────
const MAP: number[][] = [
  [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,4,4,0,0,1,1,1,1,0,0,0,1,1,1,1,0,0,0,4,4,0,0,0,0,0,0,0,2],
  [2,0,4,4,0,0,1,2,2,6,2,2,0,0,2,2,2,2,2,0,4,4,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,1,2,3,3,3,2,0,0,2,3,3,3,2,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,1,6,3,3,3,2,0,0,2,6,3,3,2,0,0,4,4,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,1,2,2,2,2,2,0,0,2,2,2,2,2,0,0,4,4,0,0,0,0,0,0,2],
  [2,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,1,0,4,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,1,0,4,4,0,5,5,5,5,0,0,0,0,0,0,0,4,4,0,0,0,0,0,0,2],
  [2,0,0,0,0,1,0,0,0,0,5,5,5,5,0,0,0,0,0,0,0,4,4,0,0,0,0,0,0,2],
  [2,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,4,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,4,4,0,0,2,2,6,2,2,0,0,0,2,2,6,2,2,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,2,3,3,3,2,0,0,0,2,3,3,3,2,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,2,2,2,2,2,0,0,0,2,2,2,2,2,0,0,4,4,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,4,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
];

const ROWS = MAP.length;
const COLS = MAP[0].length;

// ── 타일 렌더 ─────────────────────────────────────────────
function tile(ctx: CanvasRenderingContext2D, id: number, x: number, y: number, now: number) {
  const T = TILE;
  switch (id) {

    case G: {  // 잔디 — 게임 teal 팔레트에 맞춘 짙은 녹청
      ctx.fillStyle = '#0c2e22'; ctx.fillRect(x, y, T, T);
      ctx.fillStyle = '#0e3224'; ctx.fillRect(x+1, y+1, T-2, T-2);
      // 미세 잡초 텍스처
      ctx.fillStyle = '#0b2a1e';
      ctx.fillRect(x+3,  y+4,  1, 2);
      ctx.fillRect(x+9,  y+2,  1, 2);
      ctx.fillRect(x+14, y+7,  1, 2);
      ctx.fillRect(x+6,  y+13, 1, 2);
      ctx.fillRect(x+16, y+11, 1, 2);
      ctx.fillStyle = '#113828';
      ctx.fillRect(x+3,  y+4,  1, 1);
      ctx.fillRect(x+14, y+7,  1, 1);
      // 모서리 어두운 경계
      ctx.fillStyle = '#0a2a1e';
      ctx.fillRect(x, y+T-1, T, 1);
      ctx.fillRect(x+T-1, y, 1, T);
      break;
    }

    case P: {  // 돌길 — 슬레이트 블루-그레이
      ctx.fillStyle = '#18303e'; ctx.fillRect(x, y, T, T);
      // 돌 블록 4분할
      const h = Math.floor(T/2);
      ctx.fillStyle = '#1c3444'; ctx.fillRect(x+1,   y+1,   h-2, h-2);
      ctx.fillStyle = '#1a3242'; ctx.fillRect(x+h+1, y+1,   h-2, h-2);
      ctx.fillStyle = '#1a3040'; ctx.fillRect(x+1,   y+h+1, h-2, h-2);
      ctx.fillStyle = '#1e3646'; ctx.fillRect(x+h+1, y+h+1, h-2, h-2);
      // 줄눈 (모르타르)
      ctx.fillStyle = '#122830';
      ctx.fillRect(x, y+h, T, 1);
      ctx.fillRect(x+h, y, 1, T);
      // 상단·좌측 하이라이트
      ctx.fillStyle = '#22384a';
      ctx.fillRect(x, y, T, 1);
      ctx.fillRect(x, y, 1, T);
      // 하단·우측 그림자
      ctx.fillStyle = '#0e2030';
      ctx.fillRect(x, y+T-1, T, 1);
      ctx.fillRect(x+T-1, y, 1, T);
      break;
    }

    case W: {  // 건물 외벽 — 보라빛 다크 (원본 맵과 통일)
      ctx.fillStyle = '#12102a'; ctx.fillRect(x, y, T, T);
      // 벽면
      ctx.fillStyle = '#161430'; ctx.fillRect(x+1, y+1, T-3, T-3);
      // 벽돌 패턴
      ctx.fillStyle = '#1e1c3e';
      ctx.fillRect(x+2, y+3, T-5, 3);
      ctx.fillRect(x+2, y+9, T-5, 3);
      ctx.fillRect(x+2, y+15, T-5, 3);
      // 상단 하이라이트
      ctx.fillStyle = '#2a2650'; ctx.fillRect(x, y, T, 2);
      ctx.fillStyle = '#201e44'; ctx.fillRect(x, y+2, 2, T-2);
      // 그림자
      ctx.fillStyle = '#08060e'; ctx.fillRect(x+T-2, y+1, 2, T-1);
      ctx.fillStyle = '#08060e'; ctx.fillRect(x+1, y+T-2, T-1, 2);
      break;
    }

    case F: {  // 건물 내부 바닥
      ctx.fillStyle = '#0e2c22'; ctx.fillRect(x, y, T, T);
      ctx.fillStyle = '#102e24'; ctx.fillRect(x+1, y+1, T-2, T-2);
      // 마루 패턴
      ctx.fillStyle = '#0c2820';
      ctx.fillRect(x, y+Math.floor(T/2), T, 1);
      ctx.fillRect(x+Math.floor(T/2), y, 1, T);
      ctx.fillStyle = '#132e24';
      ctx.fillRect(x+2, y+2, T/2-3, T/2-3);
      ctx.fillRect(x+T/2+1, y+T/2+1, T/2-2, T/2-2);
      break;
    }

    case T: {  // 나무 — 픽셀아트 원형 잎사귀
      ctx.fillStyle = '#0a1e10'; ctx.fillRect(x, y, T, T);
      // 기둥
      ctx.fillStyle = '#1e1006';
      ctx.fillRect(x+T/2-1, y+T-6, 3, 6);
      ctx.fillRect(x+T/2-2, y+T-4, 5, 4);
      // 잎사귀 (4레이어 — 가장 어두운 것부터)
      const cx = x + T/2, cy = y + T/2 - 2;
      ctx.fillStyle = '#0c3016';
      ctx.fillRect(cx-7, cy-4, 14, 10);
      ctx.fillRect(cx-5, cy-6, 10, 14);
      ctx.fillStyle = '#104020';
      ctx.fillRect(cx-6, cy-3, 12,  8);
      ctx.fillRect(cx-4, cy-5, 8,  12);
      ctx.fillStyle = '#165428';
      ctx.fillRect(cx-5, cy-2, 10,  6);
      ctx.fillRect(cx-3, cy-4, 6,  10);
      ctx.fillStyle = '#1c6430';  // 하이라이트 (좌상단)
      ctx.fillRect(cx-4, cy-4, 5, 4);
      ctx.fillRect(cx-4, cy-4, 4, 5);
      break;
    }

    case Q: {  // 물 — 애니메이션 파문
      const t = Math.floor(now / 500) % 4;
      ctx.fillStyle = '#060c28'; ctx.fillRect(x, y, T, T);
      ctx.fillStyle = '#081038'; ctx.fillRect(x+1, y+1, T-2, T-2);
      // 물결선 (시간에 따라 위아래로)
      ctx.fillStyle = '#0c1a50';
      const offs = [0, 1, 2, 1];
      ctx.fillRect(x+2, y+4  + offs[t],      T-4, 1);
      ctx.fillRect(x+3, y+9  + offs[(t+1)%4], T-6, 1);
      ctx.fillRect(x+2, y+14 + offs[(t+2)%4], T-4, 1);
      // 반짝임
      ctx.fillStyle = '#1030608';
      if (t === 0) ctx.fillRect(x+T/2, y+6, 2, 1);
      // 경계 그림자
      ctx.fillStyle = '#04081e';
      ctx.fillRect(x, y+T-1, T, 1);
      ctx.fillRect(x+T-1, y, 1, T);
      break;
    }

    case D: {  // 문
      ctx.fillStyle = '#1a0e06'; ctx.fillRect(x, y, T, T);
      // 문틀
      ctx.fillStyle = '#281408';
      ctx.fillRect(x+2, y+1, T-4, T-2);
      // 문판
      ctx.fillStyle = '#1e1006';
      ctx.fillRect(x+3, y+2, T-6, T-4);
      // 상단 패널
      ctx.fillStyle = '#2e1808';
      ctx.fillRect(x+3, y+2, T-6, Math.floor((T-4)/2)-1);
      // 하단 패널
      ctx.fillStyle = '#28140a';
      ctx.fillRect(x+3, y+2+Math.floor((T-4)/2)+1, T-6, Math.floor((T-4)/2)-1);
      // 손잡이
      ctx.fillStyle = '#8a5a18';
      ctx.fillRect(x+T-6, y+T/2-1, 2, 4);
      // 경첩
      ctx.fillStyle = '#5a3a10';
      ctx.fillRect(x+4, y+4, 2, 2);
      ctx.fillRect(x+4, y+T-7, 2, 2);
      break;
    }
  }
}

// ── 컴포넌트 ─────────────────────────────────────────────
export default function BasecampMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef    = useRef<HTMLImageElement | null>(null);

  const s = useRef({
    tileX: 5, tileY: 12,
    renderX: 5 * TILE,
    renderY: 12 * TILE,
    moving: false,
    anim: null as { tx:number; ty:number; fromX:number; fromY:number; t0:number } | null,
  });

  useEffect(() => {
    const img = new Image();
    img.onload = () => { imgRef.current = img; };
    img.src = avatarSrc;
  }, []);

  useLayoutEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    c.width  = c.offsetWidth  || 390;
    c.height = c.offsetHeight || 280;
  }, []);

  // 렌더 루프
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let rafId: number;

    function frame() {
      const now = performance.now();
      const st  = s.current;
      const cw  = canvas!.width;
      const ch  = canvas!.height;

      // smoothstep 이동
      if (st.anim) {
        const raw = Math.min((now - st.anim.t0) / MOVE_MS, 1);
        const t   = raw * raw * (3 - 2 * raw);
        st.renderX = st.anim.fromX + (st.anim.tx * TILE - st.anim.fromX) * t;
        st.renderY = st.anim.fromY + (st.anim.ty * TILE - st.anim.fromY) * t;
        if (raw >= 1) {
          st.renderX = st.anim.tx * TILE; st.renderY = st.anim.ty * TILE;
          st.tileX = st.anim.tx; st.tileY = st.anim.ty;
          st.anim = null; st.moving = false;
        }
      }

      const camX = st.renderX + TILE / 2 - cw / 2;
      const camY = st.renderY + TILE / 2 - ch / 2;

      // 배경
      ctx!.fillStyle = '#091e18';
      ctx!.fillRect(0, 0, cw, ch);

      // 타일
      const c0 = Math.max(0, Math.floor(camX / TILE) - 1);
      const c1 = Math.min(COLS-1, Math.ceil((camX+cw) / TILE));
      const r0 = Math.max(0, Math.floor(camY / TILE) - 1);
      const r1 = Math.min(ROWS-1, Math.ceil((camY+ch) / TILE));

      for (let row = r0; row <= r1; row++)
        for (let col = c0; col <= c1; col++)
          tile(ctx!, MAP[row][col], Math.round(col*TILE - camX), Math.round(row*TILE - camY), now);

      // 캐릭터 그림자
      const px = Math.round(st.renderX - camX);
      const py = Math.round(st.renderY - camY);
      ctx!.save();
      ctx!.globalAlpha = 0.45;
      ctx!.fillStyle = '#000';
      ctx!.beginPath();
      ctx!.ellipse(px + TILE/2, py + TILE - 1, TILE/3 + 2, 3, 0, 0, Math.PI*2);
      ctx!.fill();
      ctx!.restore();

      // 캐릭터
      ctx!.imageSmoothingEnabled = false;
      if (imgRef.current) {
        ctx!.drawImage(imgRef.current, px + TILE/2 - CHAR_SZ/2, py + TILE/2 - CHAR_SZ/2, CHAR_SZ, CHAR_SZ);
      }

      // 비네트 (가장자리 어둡게)
      const vg = ctx!.createRadialGradient(cw/2, ch/2, ch*0.3, cw/2, ch/2, ch*0.85);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,0.45)');
      ctx!.fillStyle = vg;
      ctx!.fillRect(0, 0, cw, ch);

      rafId = requestAnimationFrame(frame);
    }

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // 키 입력
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) return;
      e.preventDefault();
      const st = s.current;
      if (st.moving) return;
      const dx = e.key==='ArrowLeft' ? -1 : e.key==='ArrowRight' ? 1 : 0;
      const dy = e.key==='ArrowUp'   ? -1 : e.key==='ArrowDown'  ? 1 : 0;
      const nx = st.tileX + dx, ny = st.tileY + dy;
      if (ny<0||ny>=ROWS||nx<0||nx>=COLS||!WALKABLE.has(MAP[ny][nx])) return;
      st.moving = true;
      st.anim = { tx:nx, ty:ny, fromX:st.renderX, fromY:st.renderY, t0:performance.now() };
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width:'100%', height:'100%', display:'block' }}
    />
  );
}
