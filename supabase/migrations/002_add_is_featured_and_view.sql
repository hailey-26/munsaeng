-- ============================================================
-- 002: is_featured 컬럼 + heart_count 뷰 추가
-- ============================================================

ALTER TABLE events ADD COLUMN is_featured BOOLEAN DEFAULT false NOT NULL;
CREATE INDEX idx_events_is_featured ON events (is_featured) WHERE is_featured = true;

-- 행사별 heart 수 집계 뷰 (TOP 10 조회용)
CREATE OR REPLACE VIEW event_heart_counts AS
SELECT
  e.id          AS event_id,
  COUNT(h.id)   AS heart_count
FROM events e
LEFT JOIN hearts h ON e.id = h.event_id
GROUP BY e.id;
