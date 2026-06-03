/**
 * 부산광역시 문화행사 수집기
 * 실행: npx ts-node --project tsconfig.scripts.json scripts/collectors/busan-culture.ts
 */

import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

import { createClient } from '@supabase/supabase-js';
import { XMLParser } from 'fast-xml-parser';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const API_KEY = process.env.BUSAN_API_KEY!;
const xmlParser = new XMLParser({ isArray: (name) => name === 'item' });

// ─── API 페이지 전체 수집 ────────────────────────────────────

async function fetchAllPages(baseUrl: string): Promise<Record<string, string>[]> {
  const all: Record<string, string>[] = [];
  let page = 1;
  while (true) {
    const url = `${baseUrl}?serviceKey=${encodeURIComponent(API_KEY)}&pageNo=${page}&numOfRows=100&type=json`;
    const text = await fetch(url).then((r) => r.text());

    let items: Record<string, string>[];
    if (text.trimStart().startsWith('<')) {
      const parsed = xmlParser.parse(text);
      const raw = parsed?.response?.body?.items?.item;
      items = raw == null ? [] : Array.isArray(raw) ? raw : [raw];
    } else {
      items = JSON.parse(text)?.body?.items ?? [];
    }

    console.log(`  p${page}: ${items.length}건`);
    all.push(...items);
    if (items.length < 100) break;
    page++;
  }
  return all;
}

// ─── upsert ──────────────────────────────────────────────────

async function upsertEvents(rows: object[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await supabase
    .from('events')
    .upsert(rows, { onConflict: 'source,source_id' });
  if (error) throw error;
}

// ─── 날짜 정규화 ─────────────────────────────────────────────

function toDate(raw: string): string | null {
  const s = raw?.replace(/-/g, '').trim() ?? '';
  if (s.length !== 8 || /^0+$/.test(s)) return null;
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

// ─── 메인 ────────────────────────────────────────────────────

async function main() {
  console.log(`=== 수집 시작 ${new Date().toISOString()} ===`);

  // 공연전시 테마
  console.log('\n[Theme]');
  const themeItems = await fetchAllPages(
    'https://apis.data.go.kr/6260000/BusanCultureThemeService/getBusanCultureTheme'
  );
  const themeRows = themeItems
    .filter((i) => toDate(i.op_st_dt) && toDate(i.op_ed_dt))
    .map((i) => ({
      source: 'busan-culture-theme',
      source_id: i.res_no,
      title: i.title,
      start_at: toDate(i.op_st_dt),
      end_at: toDate(i.op_ed_dt),
      venue: i.place_nm || null,
      is_free: i.pay_at === 'N',
      is_featured: false,
      link_url: i.dabom_url || null,
      updated_at: new Date().toISOString(),
    }));
  await upsertEvents(themeRows);
  console.log(`→ ${themeRows.length}건 upsert`);

  // 전시
  console.log('\n[Exhibit]');
  const exhibitItems = await fetchAllPages(
    'https://apis.data.go.kr/6260000/BusanCultureExhibitService/getBusanCultureExhibit'
  );
  const exhibitRows = exhibitItems
    .filter((i) => toDate(i.op_st_dt) && toDate(i.op_ed_dt))
    .map((i) => ({
      source: 'busan-culture-exhibit',
      source_id: i.res_no,
      title: i.title,
      start_at: toDate(i.op_st_dt),
      end_at: toDate(i.op_ed_dt),
      venue: i.place_nm || null,
      is_free: i.pay_at === 'N',
      is_featured: false,
      link_url: null,
      updated_at: new Date().toISOString(),
    }));
  await upsertEvents(exhibitRows);
  console.log(`→ ${exhibitRows.length}건 upsert`);

  console.log('\n=== 완료 ===');
}

main().catch((e) => { console.error(e); process.exit(1); });
