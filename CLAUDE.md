# FinalCity Idle — Claude Instructions

## 기술 스택

- **Monorepo**: pnpm workspaces (`packages/client`, `packages/server`, `packages/shared`)
- **Client**: Vite + React + TypeScript
- **Server**: Hono + Node.js + TypeScript
- **DB**: PostgreSQL + Drizzle ORM
- **Deploy**: Railway

## DB 규칙

**스키마 변경 시 항상 `db:push` 사용** — migration 파일 생성 없이 DB에 직접 반영.

```bash
pnpm --filter server db:push
```

`db:generate` / `db:migrate`는 사용하지 않음.

## 개발 서버 실행

```bash
pnpm dev          # client + server 동시 실행
```

## 배포 (Railway)

- `railway.json`이 빌드/시작 명령 관리
- 빌드: shared → client → server → client dist 복사
- 스키마 변경 후 Railway DB에 push: `DATABASE_URL=<railway-url> pnpm --filter server db:push`

## 인증

- Google OAuth + 도메인 화이트리스트 (추후 구현)
- 로컬 개발 중에는 auth 없이 `userId`를 직접 body에 전달
