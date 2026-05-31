-- ============================================================
-- munsaeng — 부산 문화행사 플랫폼 Supabase 스키마
-- ============================================================

-- ------------------------------------------------------------
-- 1. categories (행사 카테고리)
-- ------------------------------------------------------------
CREATE TABLE categories (
  id         UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT    NOT NULL UNIQUE,          -- 예: '전시', '공연', '축제', '강연'
  slug       TEXT    NOT NULL UNIQUE,          -- URL용 영문 슬러그, 예: 'exhibition'
  sort_order SMALLINT DEFAULT 0 NOT NULL,      -- 노출 순서
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 기본 카테고리 시드 데이터
INSERT INTO categories (name, slug, sort_order) VALUES
  ('전시',   'exhibition',  1),
  ('공연',   'performance',  2),
  ('축제',   'festival',    3),
  ('강연',   'lecture',     4),
  ('체험',   'experience',  5),
  ('기타',   'etc',         99);

-- ------------------------------------------------------------
-- 2. events (행사)
-- ------------------------------------------------------------
CREATE TABLE events (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  title        TEXT        NOT NULL,
  category_id  UUID        REFERENCES categories(id) ON DELETE SET NULL,
  start_at     TIMESTAMPTZ NOT NULL,
  end_at       TIMESTAMPTZ,
  venue        TEXT,                           -- 장소명 (예: 부산문화회관)
  address      TEXT,                           -- 도로명 주소
  price        INTEGER,                        -- 가격(원), NULL이면 미정
  is_free      BOOLEAN     DEFAULT false NOT NULL,
  image_url    TEXT,
  link_url     TEXT,                           -- 외부 예매/안내 링크
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 인덱스
CREATE INDEX idx_events_start_at    ON events (start_at);
CREATE INDEX idx_events_category_id ON events (category_id);
CREATE INDEX idx_events_is_free     ON events (is_free);

-- updated_at 자동 갱신 트리거 함수 (공용)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_events_updated_at
BEFORE UPDATE ON events
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- 3. hearts (찜/좋아요)
-- ------------------------------------------------------------
CREATE TABLE hearts (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id   UUID        NOT NULL REFERENCES events(id)     ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT hearts_unique_per_user UNIQUE (event_id, user_id)
);

CREATE INDEX idx_hearts_event_id ON hearts (event_id);
CREATE INDEX idx_hearts_user_id  ON hearts (user_id);

-- ------------------------------------------------------------
-- 4. RLS (Row Level Security)
-- ------------------------------------------------------------

-- categories: 누구나 읽기 가능, 쓰기는 관리자만 (service_role)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_public_read"
  ON categories FOR SELECT USING (true);

-- events: 누구나 읽기 가능, 쓰기는 service_role
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events_public_read"
  ON events FOR SELECT USING (true);

-- hearts: 읽기 공개 / 본인 데이터만 삽입·삭제
ALTER TABLE hearts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hearts_public_read"
  ON hearts FOR SELECT USING (true);

CREATE POLICY "hearts_insert_own"
  ON hearts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "hearts_delete_own"
  ON hearts FOR DELETE
  USING (auth.uid() = user_id);
