/**
 * 부산광역시 공연전시 API 수집기
 *
 * Theme API  : getBusanCultureTheme  (공연/축제/강연 등)
 * Exhibit API: getBusanCultureExhibit (전시)
 *
 * 첫 실행  : 전체 페이지 순회 → op_ed_dt >= 오늘인 항목만 upsert → last_res_no 저장
 * 이후 실행 : 마지막 페이지부터 역순 → 저장된 res_no 만나면 중단
 *
 * 실행: npm run collect:busan
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SVC_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const API_KEY          = process.env.BUSAN_API_KEY!

const NUM_OF_ROWS = 100

const supabase = createClient(SUPABASE_URL, SUPABASE_SVC_KEY)

// ── API 설정 ────────────────────────────────────────────────────
type ApiConfig = {
  source:       string
  metaKey:      string
  url:          string
  defaultCategory: string  // prg_nm 없을 때 사용
}

const APIS: ApiConfig[] = [
  {
    source:          'busan-culture-theme',
    metaKey:         'busan_culture_theme_last_res_no',
    url:             'https://apis.data.go.kr/6260000/BusanCultureThemeService/getBusanCultureTheme',
    defaultCategory: '기타',
  },
  {
    source:          'busan-culture-exhibit',
    metaKey:         'busan_culture_exhibit_last_res_no',
    url:             'https://apis.data.go.kr/6260000/BusanCultureExhibitService/getBusanCultureExhibit',
    defaultCategory: '전시',
  },
]

// ── API 타입 ────────────────────────────────────────────────────
type ApiItem = {
  res_no:    string | number
  title:     string
  prg_nm?:   string
  op_st_dt?: string
  op_ed_dt?: string
  place_nm?: string
  dabom_url?: string
  pay_at?:   string
}

type PageResult = { items: ApiItem[]; totalCount: number }

// ── API 호출 ────────────────────────────────────────────────────
async function fetchPage(apiUrl: string, pageNo: number): Promise<PageResult> {
  const url = new URL(apiUrl)
  url.searchParams.set('serviceKey', API_KEY)
  url.searchParams.set('pageNo',     String(pageNo))
  url.searchParams.set('numOfRows',  String(NUM_OF_ROWS))
  url.searchParams.set('type',       'json')

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)

  const text = await res.text()
  if (text.trimStart().startsWith('<')) {
    throw new Error(`API가 XML 에러 반환 (키 확인 필요):\n${text.slice(0, 500)}`)
  }

  const json = JSON.parse(text)
  const body = json?.response?.body ?? json?.[Object.keys(json)[0]]?.body ?? json?.body

  if (!body) throw new Error(`응답 파싱 실패: ${JSON.stringify(json).slice(0, 200)}`)

  const totalCount = Number(body.totalCount ?? 0)
  const raw = body.items
  let items: ApiItem[] = []

  if (Array.isArray(raw)) {
    items = raw
  } else if (raw?.item) {
    items = Array.isArray(raw.item) ? raw.item : [raw.item]
  }

  return { items, totalCount }
}

// ── 파싱 헬퍼 ──────────────────────────────────────────────────
function parseDate(d?: string): string | null {
  if (!d) return null
  const s = d.replace(/-/g, '')
  if (s.length !== 8 || /^0+$/.test(s)) return null
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
}

function todayKst(): string {
  return new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10)
}

// ── prg_nm → DB 카테고리명 매핑 ────────────────────────────────
function toCategoryName(prgNm: string | undefined, defaultCategory: string): string {
  if (!prgNm) return defaultCategory
  const p = prgNm.trim()
  if (/전시|갤러리|미술|사진/.test(p))                           return '전시'
  if (/공연|연극|뮤지컬|콘서트|오페라|무용|발레|국악|클래식|재즈/.test(p)) return '공연'
  if (/축제|페스티벌|마당|마켓|장터/.test(p))                     return '축제'
  if (/강연|강의|강좌|교육|워크숍|세미나/.test(p))                 return '강연'
  if (/체험|투어|여행|탐방/.test(p))                             return '체험'
  return defaultCategory
}

// ── 카테고리 맵 ─────────────────────────────────────────────────
async function buildCategoryMap(): Promise<Map<string, string>> {
  const { data, error } = await supabase.from('categories').select('id, name')
  if (error) throw error
  return new Map((data ?? []).map((c) => [c.name, c.id]))
}

// ── row 변환 ────────────────────────────────────────────────────
function toEventRow(item: ApiItem, catMap: Map<string, string>, apiConfig: ApiConfig) {
  const startDate  = parseDate(item.op_st_dt)
  const endDate    = parseDate(item.op_ed_dt)
  const catName    = toCategoryName(item.prg_nm, apiConfig.defaultCategory)
  const isFree     = !item.pay_at || item.pay_at.trim() === 'N'

  return {
    source:      apiConfig.source,
    source_id:   String(item.res_no),
    title:       item.title ?? '',
    category_id: catMap.get(catName) ?? catMap.get('기타') ?? null,
    start_at:    startDate ? `${startDate}T00:00:00+09:00` : null,
    end_at:      endDate   ? `${endDate}T23:59:59+09:00`   : null,
    venue:       item.place_nm  ?? null,
    address:     null,
    image_url:   null,
    link_url:    item.dabom_url ?? null,
    is_free:     isFree,
    price:       isFree ? 0 : null,
    is_featured: false,
    updated_at:  new Date().toISOString(),
  }
}

// ── upsert ──────────────────────────────────────────────────────
async function upsertBatch(rows: ReturnType<typeof toEventRow>[]) {
  if (rows.length === 0) return
  const { error } = await supabase
    .from('events')
    .upsert(rows, { onConflict: 'source,source_id' })
  if (error) throw error
  console.log(`  ✔ ${rows.length}건 upsert`)
}

// ── meta 테이블 ─────────────────────────────────────────────────
async function getLastResNo(metaKey: string): Promise<number | null> {
  const { data, error } = await supabase
    .from('meta')
    .select('value')
    .eq('key', metaKey)
    .maybeSingle()
  if (error) {
    console.warn(`meta 접근 실패 (전체 수집으로 진행): ${error.message}`)
    return null
  }
  return data ? Number(data.value) : null
}

async function saveLastResNo(metaKey: string, resNo: number) {
  const { error } = await supabase
    .from('meta')
    .upsert({ key: metaKey, value: String(resNo), updated_at: new Date().toISOString() })
  if (error) {
    console.warn(`meta 저장 실패: ${error.message}`)
    return
  }
  console.log(`meta 업데이트: ${metaKey} = ${resNo}`)
}

// ── 전체 수집 ───────────────────────────────────────────────────
async function runFirstSync(api: ApiConfig, catMap: Map<string, string>) {
  console.log(`[${api.source}] 전체 수집 시작`)
  const today = todayKst()

  let page = 1, totalPages = 1, maxResNo = 0, upserted = 0

  do {
    process.stdout.write(`  p${page}/${totalPages} `)
    const { items, totalCount } = await fetchPage(api.url, page)
    if (page === 1) {
      totalPages = Math.ceil(totalCount / NUM_OF_ROWS)
      console.log(`전체 ${totalCount}건 / ${totalPages}p`)
    }

    for (const item of items) {
      const n = Number(item.res_no)
      if (n > maxResNo) maxResNo = n
    }

    const rows = items
      .filter((item) => {
        const end = parseDate(item.op_ed_dt)
        return end !== null && end >= today && item.title
      })
      .map((item) => toEventRow(item, catMap, api))

    await upsertBatch(rows)
    upserted += rows.length
    page++
  } while (page <= totalPages)

  if (maxResNo > 0) await saveLastResNo(api.metaKey, maxResNo)
  console.log(`[${api.source}] 완료: ${upserted}건, last_res_no=${maxResNo}\n`)
}

// ── 증분 수집 ───────────────────────────────────────────────────
async function runIncrementalSync(api: ApiConfig, catMap: Map<string, string>, lastResNo: number) {
  console.log(`[${api.source}] 증분 수집 시작 (last_res_no=${lastResNo})`)
  const today = todayKst()

  const { totalCount } = await fetchPage(api.url, 1)
  const totalPages = Math.ceil(totalCount / NUM_OF_ROWS)
  console.log(`  전체 ${totalCount}건 / ${totalPages}p`)

  let maxResNo = lastResNo, upserted = 0, stopped = false

  for (let page = totalPages; page >= 1 && !stopped; page--) {
    process.stdout.write(`  p${page}/${totalPages} `)
    const { items } = await fetchPage(api.url, page)
    items.sort((a, b) => Number(b.res_no) - Number(a.res_no))

    const newItems: ApiItem[] = []
    for (const item of items) {
      const resNo = Number(item.res_no)
      if (resNo <= lastResNo) { stopped = true; break }
      if (resNo > maxResNo) maxResNo = resNo
      newItems.push(item)
    }

    const rows = newItems
      .filter((item) => {
        const end = parseDate(item.op_ed_dt)
        return end !== null && end >= today && item.title
      })
      .map((item) => toEventRow(item, catMap, api))

    await upsertBatch(rows)
    upserted += rows.length
  }

  if (maxResNo > lastResNo) await saveLastResNo(api.metaKey, maxResNo)
  else console.log('  새로운 데이터 없음')
  console.log(`[${api.source}] 완료: ${upserted}건\n`)
}

// ── 진입점 ──────────────────────────────────────────────────────
async function main() {
  const missing = (['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'BUSAN_API_KEY'] as const)
    .filter((k) => !process.env[k])

  if (missing.length) {
    console.error('❌ 환경변수 누락:', missing.join(', '))
    process.exit(1)
  }

  console.log(`=== 수집 시작 ${new Date().toISOString()} ===\n`)

  const catMap = await buildCategoryMap()

  for (const api of APIS) {
    const lastResNo = await getLastResNo(api.metaKey)
    if (lastResNo === null) {
      await runFirstSync(api, catMap)
    } else {
      await runIncrementalSync(api, catMap, lastResNo)
    }
  }

  console.log('=== 전체 완료 ===')
}

main().catch((err) => {
  console.error('❌ 수집 실패:', err)
  process.exit(1)
})
