-- ============================================================
-- 001: events에 외부 소스 추적 컬럼 추가 + meta 테이블 생성
-- ============================================================

-- events: 외부 API 연동을 위한 소스 식별 컬럼
ALTER TABLE events ADD COLUMN source    TEXT;
ALTER TABLE events ADD COLUMN source_id TEXT;

-- (source, source_id) 조합으로 upsert할 수 있도록 UNIQUE 인덱스
CREATE UNIQUE INDEX idx_events_source_id
  ON events (source, source_id)
  WHERE source IS NOT NULL;

-- start_at NOT NULL 제약 완화 (외부 API 데이터에 날짜 누락 가능)
ALTER TABLE events ALTER COLUMN start_at DROP NOT NULL;

-- ------------------------------------------------------------
-- meta: 수집기 상태 저장 (last_res_no 등)
-- ------------------------------------------------------------
CREATE TABLE meta (
  key        TEXT        PRIMARY KEY,
  value      TEXT        NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE meta ENABLE ROW LEVEL SECURITY;
-- service_role 전용 (공개 정책 없음)
