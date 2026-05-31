import { supabase, type Event, type EventWithHeartCount } from '@/lib/supabase'
import { HomeContent } from './_components/HomeContent'
import { BottomNav } from './_components/BottomNav'

function todayKst() {
  return new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10)
}

function getWeekLabel() {
  const now = new Date(Date.now() + 9 * 3_600_000)
  return `${now.getMonth() + 1}월 ${Math.ceil(now.getDate() / 7)}주차`
}

export default async function HomePage() {
  const today = todayKst()

  const [featuredRes, eventsRes, heartCountsRes] = await Promise.all([
    supabase
      .from('events')
      .select('*, categories(name, slug)')
      .eq('is_featured', true)
      .gte('end_at', today)
      .order('start_at', { ascending: true })
      .limit(1)
      .maybeSingle(),

    supabase
      .from('events')
      .select('*, categories(name, slug)')
      .gte('end_at', today)
      .order('start_at', { ascending: true })
      .limit(80),

    supabase
      .from('event_heart_counts')
      .select('event_id, heart_count')
      .order('heart_count', { ascending: false })
      .limit(10),
  ])

  // TOP 10: heart_count 뷰 기반으로 상세 조회 후 정렬 복원
  const topIds = (heartCountsRes.data ?? []).map((r) => r.event_id)
  const heartMap = new Map(
    (heartCountsRes.data ?? []).map((r) => [r.event_id, Number(r.heart_count)])
  )

  const top10Events: EventWithHeartCount[] = []

  if (topIds.length > 0) {
    const { data: topData } = await supabase
      .from('events')
      .select('*, categories(name, slug)')
      .in('id', topIds)
      .gte('end_at', today)

    top10Events.push(
      ...(topData ?? [])
        .map((e) => ({ ...(e as Event), heart_count: heartMap.get(e.id) ?? 0 }))
        .sort((a, b) => b.heart_count - a.heart_count)
    )
  }

  // hearts 없는 초기 상태 폴백: 최신 행사 10개
  if (top10Events.length === 0 && eventsRes.data) {
    top10Events.push(
      ...(eventsRes.data as Event[]).slice(0, 10).map((e) => ({ ...e, heart_count: 0 }))
    )
  }

  return (
    <div className="min-h-screen bg-[#F2F2F0]">
      <div className="max-w-sm mx-auto bg-white min-h-screen border-x border-gray-200/60 pb-20">

        {/* 상단 헤더 */}
        <header className="px-5 pt-10 pb-2 flex justify-between items-start">
          <div>
            <p className="text-[11px] text-gray-500 mb-[2px]">이번 주 부산</p>
            <div className="flex items-center gap-[5px] text-[17px] font-medium text-gray-900">
              <svg viewBox="0 0 16 16" fill="currentColor" className="w-[15px] h-[15px] text-gray-400 shrink-0">
                <path fillRule="evenodd" d="M8 1.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9zM2 6a6 6 0 1110.174 4.31c-.203.196-.43.402-.661.61A19.524 19.524 0 018 14.58a19.523 19.523 0 01-3.513-3.67 21.321 21.321 0 01-.66-.61A6 6 0 012 6zm6 0a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
              </svg>
              해운대 · 남구 · 수영
            </div>
          </div>
          <span className="text-[11px] font-medium text-white bg-[#1D9E75] px-[10px] py-1 rounded-full whitespace-nowrap">
            {getWeekLabel()}
          </span>
        </header>

        {/* 기분 필터 / HOT TOP 10 / 이번 주 픽 / 그리드 */}
        <HomeContent
          events={(eventsRes.data ?? []) as Event[]}
          top10Events={top10Events}
          featuredEvent={featuredRes.data as Event | null}
        />

        <BottomNav />
      </div>
    </div>
  )
}
