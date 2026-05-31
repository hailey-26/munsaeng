/**
 * 부산광역시 공연전시 API 수집기
 *
 * 첫 실행  : 전체 페이지 순회 → op_ed_dt >= 오늘인 항목만 upsert → last_res_no 저장
 * 이후 실행 : 마지막 페이지부터 역순 → 저장된 res_no 만나면 중단
 *
 * 실행: npx tsx scripts/collectors/busan-culture-api.ts
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

// ── 환경변수 ────────────────────────────────────────────────────
const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SVC_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!
const API_KEY           = process.env.BUSAN_API_SERVICE_KEY!

const BASE_URL    = 'https://apis.data.go.kr/6260000/BusanCultureThemeService/getBusanCultureTheme'
const NUM_OF_ROWS = 100
const META_KEY    = 'busan_culture_last_res_no'
const SOURCE      = 'busan-culture-api'

// ── Supabase 클라이언트 (service_role: RLS 우회) ─────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_SVC_KEY)

// ── API 타입 ────────────────────────────────────────────────────
type ApiItem = {
  res_no:    string | number
  res_title: string
  cate_nm?:  string
  op_st_dt?: string   // 운영 시작일 YYYYMMDD
  op_ed_dt?: string   // 운영 종료일 YYYYMMDD
  place?:    string
  addr1?:    string
  main_img?: string
  home_url?: string
  use_fee?:  string
}

type PageResult = { items: ApiItem[]; totalCount: number }

// ── API 호출 ────────────────────────────────────────────────────
async function fetchPage(pageNo: number): Promise<PageResult> {
  const url = new URL(BASE_URL)
  url.searchParams.set('serviceKey', API_KEY)
  url.searchParams.set('pageNo',     String(pageNo))
  url.searchParams.set('numOfRows',  String(NUM_OF_ROWS))
  url.searchParams.set('type',       'json')

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)

  const json = await res.json()

  // 공공데이터포털은 서비스명이 최상위 키인 경우와 "response"인 경우 두 가지가 있음
  const body =
    json?.response?.body ??
    json?.[Object.keys(json)[0]]?.body

  if (!body) throw new Error(`응답 파싱 실패 (body 없음): ${JSON.stringify(json).slice(0, 200)}`)

  const totalCount = Number(body.totalCount ?? 0)

  // 단건이면 객체, 복수면 배열로 오는 공공API 특성 처리
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
function parseDate(yyyymmdd: string | undefined): string | null {
  if (!yyyymmdd || yyyymmdd.length < 8) return null
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`
}

function parseFee(useFee?: string): { is_free: boolean; price: number | null } {
  if (!useFee || useFee.trim() === '' || /무료/.test(useFee)) {
    return { is_free: true, price: 0 }
  }
  const digits = useFee.replace(/,/g, '').match(/\d+/)
  return { is_free: false, price: digits ? Number(digits[0]) : null }
}

/** KST 기준 오늘 날짜 (YYYY-MM-DD) */
function todayKst(): string {
  return new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10)
}

// ── 카테고리 이름 → UUID 매핑 ───────────────────────────────────
async function buildCategoryMap(): Promise<Map<string, string>> {
  const { data, error } = await supabase.from('categories').select('id, name')
  if (error) throw error
  return new Map((data ?? []).map((c) => [c.name, c.id]))
}

// ── API Item → events row 변환 ──────────────────────────────────
function toEventRow(item: ApiItem, catMap: Map<string, string>) {
  const { is_free, price } = parseFee(item.use_fee)
  const startDate = parseDate(item.op_st_dt)
  const endDate   = parseDate(item.op_ed_dt)

  return {
    source:      SOURCE,
    source_id:   String(item.res_no),
    title:       item.res_title ?? '',
    category_id: (item.cate_nm && catMap.get(item.cate_nm)) || catMap.get('기타') || null,
    start_at:    startDate ? `${startDate}T00:00:00+09:00` : null,
    end_at:      endDate   ? `${endDate}T23:59:59+09:00`   : null,
    venue:       item.place    ?? null,
    address:     item.addr1    ?? null,
    image_url:   item.main_img ?? null,
    link_url:    item.home_url ?? null,
    is_free,
    price,
  }
}

// ── Supabase upsert ─────────────────────────────────────────────
async function upsertBatch(rows: ReturnType<typeof toEventRow>[]) {
  if (rows.length === 0) return
  const { error } = await supabase
    .from('events')
    .upsert(rows, { onConflict: 'source,source_id' })
  if (error) throw error
  console.log(`  ✔ ${rows.length}건 upsert`)
}

// ── meta 테이블 ─────────────────────────────────────────────────
async function getLastResNo(): Promise<number | null> {
  const { data } = await supabase
    .from('meta')
    .select('value')
    .eq('key', META_KEY)
    .maybeSingle()
  return data ? Number(data.value) : null
}

async function saveLastResNo(resNo: number) {
  const { error } = await supabase
    .from('meta')
    .upsert({ key: META_KEY, value: String(resNo), updated_at: new Date().toISOString() })
  if (error) throw error
  console.log(`meta 업데이트: last_res_no = ${resNo}`)
}

// ── 첫 실행: 전체 순회 ──────────────────────────────────────────
async function runFirstSync() {
  console.log('=== [첫 실행] 전체 데이터 수집 시작 ===\n')
  const today  = todayKst()
  const catMap = await buildCategoryMap()

  let page       = 1
  let totalPages = 1
  let maxResNo   = 0
  let upserted   = 0

  do {
    process.stdout.write(`페이지 ${page} / ${totalPages || '?'}  `)
    const { items, totalCount } = await fetchPage(page)
    if (page === 1) totalPages = Math.ceil(totalCount / NUM_OF_ROWS)

    // 전체 순회 중에도 max res_no 추적 (미래 행사 아닌 것도 포함)
    for (const item of items) {
      const n = Number(item.res_no)
      if (n > maxResNo) maxResNo = n
    }

    const future = items.filter((item) => {
      const end = parseDate(item.op_ed_dt)
      return end !== null && end >= today && item.res_title
    })

    const rows = future.map((item) => toEventRow(item, catMap))
    await upsertBatch(rows)
    upserted += rows.length

    page++
  } while (page <= totalPages)

  if (maxResNo > 0) await saveLastResNo(maxResNo)
  console.log(`\n=== 완료: ${upserted}건 저장, last_res_no=${maxResNo} ===`)
}

// ── 이후 실행: 마지막 페이지부터 역순 ──────────────────────────
async function runIncrementalSync(lastResNo: number) {
  console.log(`=== [증분 수집] last_res_no=${lastResNo} 이후 수집 시작 ===\n`)
  const today  = todayKst()
  const catMap = await buildCategoryMap()

  // totalCount 파악용 1페이지 호출
  const { totalCount } = await fetchPage(1)
  const totalPages = Math.ceil(totalCount / NUM_OF_ROWS)
  console.log(`전체 ${totalCount}건 / ${totalPages}페이지\n`)

  let maxResNo = lastResNo
  let upserted = 0
  let stopped  = false

  for (let page = totalPages; page >= 1 && !stopped; page--) {
    process.stdout.write(`페이지 ${page} / ${totalPages}  `)

    const { items } = await fetchPage(page)

    // 페이지 내 내림차순 정렬 (최신 res_no부터 검사)
    items.sort((a, b) => Number(b.res_no) - Number(a.res_no))

    const newItems: ApiItem[] = []
    for (const item of items) {
      const resNo = Number(item.res_no)
      if (resNo <= lastResNo) {
        stopped = true   // 이미 수집한 지점 도달 → 중단
        break
      }
      if (resNo > maxResNo) maxResNo = resNo
      newItems.push(item)
    }

    const future = newItems.filter((item) => {
      const end = parseDate(item.op_ed_dt)
      return end !== null && end >= today && item.res_title
    })

    const rows = future.map((item) => toEventRow(item, catMap))
    await upsertBatch(rows)
    upserted += rows.length
  }

  if (maxResNo > lastResNo) await saveLastResNo(maxResNo)
  else console.log('새로운 데이터 없음')

  console.log(`\n=== 완료: ${upserted}건 저장, last_res_no=${maxResNo} ===`)
}

// ── 진입점 ──────────────────────────────────────────────────────
async function main() {
  const missing = (
    ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'BUSAN_API_SERVICE_KEY'] as const
  ).filter((k) => !process.env[k])

  if (missing.length) {
    console.error('❌ 환경변수 누락:', missing.join(', '))
    process.exit(1)
  }

  const lastResNo = await getLastResNo()
  if (lastResNo === null) {
    await runFirstSync()
  } else {
    await runIncrementalSync(lastResNo)
  }
}

main().catch((err) => {
  console.error('❌ 수집 실패:', err)
  process.exit(1)
})
