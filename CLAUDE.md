@AGENTS.md

# munsaeng 프로젝트 지침

## 서비스 개요

부산 지역 문화행사 큐레이션 플랫폼.
공연/전시/축제/박람회 정보를 주간 단위로 큐레이션해서 보여주는 웹 서비스.
기존 정보나열형 사이트(다봄 등)와 달리, 에디터가 직접 선별한 행사를 보여주는 것이 핵심 차별점.

---

## 기술 스택

- **Frontend/Backend**: Next.js 16 (App Router, TypeScript)
- **스타일**: Tailwind CSS
- **DB**: Supabase (PostgreSQL)
- **배포**: Vercel
- **패키지매니저**: npm

---

## 프로젝트 구조

```
app/
  page.tsx              메인 홈 페이지
  events/
    page.tsx            전체 행사 목록
    [id]/page.tsx       행사 상세
  search/page.tsx       탐색/검색
  wishlist/page.tsx     찜 목록
  admin/
    page.tsx            관리자 행사 목록
    events/new/page.tsx 행사 등록
    events/[id]/page.tsx 행사 수정/삭제
lib/
  supabase.ts           Supabase 클라이언트 + 타입 정의
scripts/
  collectors/           데이터 수집 스크립트 (추후)
```

---

## DB 스키마 (Supabase)

### categories

```sql
id         UUID PK
name       TEXT UNIQUE  -- 전시, 공연, 축제, 강연, 체험, 기타
slug       TEXT UNIQUE  -- exhibition, performance, festival, lecture, experience, etc
sort_order SMALLINT
created_at TIMESTAMPTZ
```

### events

```sql
id           UUID PK
title        TEXT NOT NULL
category_id  UUID FK → categories(id)
start_at     TIMESTAMPTZ NOT NULL
end_at       TIMESTAMPTZ
venue        TEXT        -- 장소명
address      TEXT        -- 도로명 주소
price        INTEGER     -- 원, NULL이면 미정
is_free      BOOLEAN DEFAULT false
image_url    TEXT        -- 행사 포스터 이미지
link_url     TEXT        -- 외부 예매/안내 링크
is_featured  BOOLEAN DEFAULT false  -- 이번 주 픽 여부
heart_count  INTEGER DEFAULT 0      -- 하트 수 (비정규화)
created_at   TIMESTAMPTZ DEFAULT NOW()
updated_at   TIMESTAMPTZ DEFAULT NOW()
```

### hearts

```sql
id         UUID PK
event_id   UUID FK → events(id) ON DELETE CASCADE
session_id TEXT    -- 비회원용 (localStorage UUID)
user_id    UUID    -- 회원용 (추후)
created_at TIMESTAMPTZ DEFAULT NOW()
UNIQUE (event_id, session_id)
```

---

## 환경변수

```
NEXT_PUBLIC_SUPABASE_URL=https://ogbasjpackgttshoxhsr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

---

## 디자인 시스템

### 컬러

```
메인 그린    #1D9E75  (브랜드 컬러, 활성 상태, 배지)
레드         #E24B4A  (D-day 마감임박, HOT 배지, 1위)
골드         #BA7517  (2위)
다크         #1D1D1D  (활성 칩 배경)
무료 배지    bg:#E1F5EE  text:#085041
유료 배지    bg:#F1EFE8  text:#444441
```

### 컴포넌트 스타일 원칙

- border-radius: 카드 12px, 칩 20px(pill), 배지 6~8px
- border: 0.5px solid (연한 회색)
- 카드 hover: background를 살짝 어둡게
- 모바일 퍼스트, 최대 너비 480px 기준
- 전체적으로 미니멀하고 깔끔한 느낌

### 메인 페이지 구조 (위→아래)

1. 상단바: "이번 주 부산" + 지역(해운대 · 남구 · 수영) + 주차 배지
2. 기분 필터 칩: 혼자 조용히 / 친구랑 신나게 / 무료만 / 데이트
3. HOT TOP 10: 접기/펼치기, 접힌 상태에서 2.5초마다 자동 전환
4. 이번 주 픽: is_featured=true 히어로 카드 (그라디언트 배경, 텍스트 오버레이)
5. 지금 열려 있어요: 2열 그리드, 포스터 이미지, D-day(우상단), 무료/유료(좌상단)
6. 하단 네비게이션: 홈 / 탐색 / 찜 (3개)

---

## 핵심 기능 및 정책

### 찜 기능

- 로그인 없이 localStorage 기반으로 저장
- key: `munsaeng_wishlist`, value: event id 배열 JSON
- 찜 목록 페이지에서 카카오톡 공유 가능

### 하트 (인기 집계)

- 비회원: localStorage에서 session_id 생성 후 hearts 테이블에 저장
- 중복 방지: (event_id, session_id) UNIQUE 제약
- heart_count는 hearts 테이블 기반으로 집계

### D-day 계산

- end_at 기준으로 계산
- D-0: 오늘 마감
- D-n: n일 후 마감
- 마감된 행사(end_at < 오늘)는 목록에서 자동 제외

### 관리자 페이지

- /admin 경로
- 환경변수 ADMIN_PASSWORD로 간단한 비밀번호 인증
- 행사 등록/수정/삭제
- 이미지는 Supabase Storage에 업로드

---

## 코딩 컨벤션

- 언어: TypeScript (any 사용 금지)
- 컴포넌트: Server Component 우선, 인터랙션 필요한 부분만 'use client'
- 데이터 페칭: Server Component에서 직접 Supabase 호출
- 에러 처리: 모든 Supabase 쿼리에 error 체크
- 파일명: kebab-case
- 컴포넌트명: PascalCase

---

## 배포 정보

- Frontend + Backend: Vercel (munsaeng.vercel.app)
- DB: Supabase
- GitHub: github.com/hailey-26/munsaeng (main 브랜치)
- git push origin main 하면 Vercel 자동 배포

---

## 현재 개발 단계

- [x] GitHub 레포 생성
- [x] Next.js 프로젝트 세팅
- [x] Supabase DB 연결
- [x] Vercel 배포
- [x] events/categories/hearts 테이블 생성
- [x] 샘플 데이터 입력
- [ ] 메인 페이지 UI 구현
- [ ] 관리자 CMS 페이지
- [ ] 찜 기능 (localStorage)
- [ ] 하트 기능
- [ ] 탐색/검색 페이지
- [ ] 카카오 공유
