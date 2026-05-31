'use client'

import { useState, useEffect, useRef } from 'react'
import type { Event, EventWithHeartCount } from '@/lib/supabase'

// ── 기분 필터 ──────────────────────────────────────────────────
type Mood = '혼자 조용히' | '친구랑 신나게' | '무료만' | '데이트'
const MOODS: Mood[] = ['혼자 조용히', '친구랑 신나게', '무료만', '데이트']
const MOOD_SLUGS: Record<Mood, string[] | null> = {
  '혼자 조용히':   ['exhibition', 'lecture'],
  '친구랑 신나게': ['festival', 'performance', 'experience'],
  '무료만':        null,
  '데이트':        ['exhibition', 'experience', 'performance'],
}
function applyMood(events: Event[], mood: Mood | null) {
  if (!mood) return events
  if (mood === '무료만') return events.filter((e) => e.is_free)
  const slugs = MOOD_SLUGS[mood]!
  return events.filter((e) => slugs.includes(e.categories?.slug ?? ''))
}

// ── HOT TOP 10 ─────────────────────────────────────────────────
const RANK_COLOR = ['text-[#E24B4A]', 'text-[#BA7517]', 'text-[#888780]']

function HotTop10({ events }: { events: EventWithHeartCount[] }) {
  const [expanded, setExpanded] = useState(false)
  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(true)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (expanded || events.length === 0) { timer.current && clearInterval(timer.current); return }
    timer.current = setInterval(() => {
      setVisible(false)
      setTimeout(() => { setIdx((i) => (i + 1) % events.length); setVisible(true) }, 200)
    }, 2500)
    return () => { timer.current && clearInterval(timer.current) }
  }, [expanded, events.length])

  if (events.length === 0) return null
  const current = events[idx]

  return (
    <div className="mx-5 mb-3.5 border border-gray-200/80 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-4 py-[0.6rem] flex items-center justify-between bg-gray-50 cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span className="bg-[#E24B4A] text-white text-[10px] font-medium px-[7px] py-0.5 rounded-full">HOT</span>
          <span className="text-[13px] font-medium text-gray-900">현재 인기 상승 TOP 10</span>
        </div>
        <svg viewBox="0 0 20 20" fill="currentColor"
          className={`w-4 h-4 text-gray-400 transition-transform duration-250 ${expanded ? 'rotate-180' : ''}`}>
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {/* 마퀴 */}
      <div className="px-4 py-[0.55rem] border-t border-gray-200/80 flex items-center gap-2 transition-opacity duration-200"
        style={{ opacity: visible ? 1 : 0 }}>
        <span className="text-[12px] font-medium text-[#E24B4A] shrink-0 min-w-[22px]">{idx + 1}위</span>
        <p className="text-[12px] text-gray-900 flex-1 min-w-0 truncate">
          {current.title} · <span className="text-gray-500">{current.venue ?? '장소 미정'} · {current.is_free ? '무료' : '유료'}</span>
        </p>
      </div>

      {/* 펼친 목록 */}
      <div className="border-t border-gray-200/80 overflow-hidden transition-all duration-300"
        style={{ maxHeight: expanded ? '500px' : '0px' }}>
        <ul>
          {events.map((ev, i) => (
            <li key={ev.id} className="flex items-center gap-2.5 px-4 py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer">
              <span className={`w-5 text-[12px] font-medium text-center shrink-0 ${RANK_COLOR[i] ?? 'text-gray-400 text-[11px]'}`}>{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-medium text-gray-900 truncate">{ev.title}</div>
                <div className="text-[11px] text-gray-500">{ev.venue ?? '장소 미정'}</div>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${ev.is_free ? 'bg-[#E1F5EE] text-[#085041]' : 'bg-[#F1EFE8] text-[#444441]'}`}>
                {ev.is_free ? '무료' : '유료'}
              </span>
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-gray-300 shrink-0">
                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
              </svg>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// ── 이번 주 픽 ─────────────────────────────────────────────────
function getDday(endAt: string | null) {
  if (!endAt) return ''
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const end = new Date(endAt); end.setHours(0, 0, 0, 0)
  const diff = Math.round((end.getTime() - today.getTime()) / 86_400_000)
  if (diff < 0) return '종료'
  if (diff === 0) return 'D-DAY'
  return `D-${diff}`
}

function FeaturedCard({ event }: { event: Event }) {
  const dday = getDday(event.end_at)
  const endStr = event.end_at
    ? new Date(event.end_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
    : null

  return (
    <div className="mx-5 mb-3.5 rounded-xl overflow-hidden relative h-[170px] cursor-pointer"
      style={{ background: 'linear-gradient(135deg, #0F6E56, #1D9E75, #5DCAA5)' }}>
      {event.image_url && (
        <img src={event.image_url} alt={event.title} className="absolute inset-0 w-full h-full object-cover" />
      )}
      {!event.image_url && (
        <div className="absolute top-3.5 right-3.5 w-[58px] h-[58px] bg-white/10 flex items-center justify-center text-2xl"
          style={{ borderRadius: '50% 30% 60% 40%' }}>🎨</div>
      )}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 55%)' }} />
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <div className="flex gap-1 mb-[5px]">
          {event.categories && (
            <span className="text-[10px] px-[7px] py-0.5 rounded-lg font-medium bg-white/20 text-white backdrop-blur-sm">
              {event.categories.name}
            </span>
          )}
          {event.is_free && (
            <span className="text-[10px] px-[7px] py-0.5 rounded-lg font-medium bg-white/20 text-white backdrop-blur-sm">무료</span>
          )}
          {dday && (
            <span className="text-[10px] px-[7px] py-0.5 rounded-lg font-medium bg-[#E24B4A] text-white">{dday}</span>
          )}
        </div>
        <h3 className="text-[15px] font-medium text-white leading-[1.3] mb-[3px] line-clamp-2">{event.title}</h3>
        <p className="text-[11px] text-white/70">
          {[event.venue, endStr ? `~${endStr}` : null].filter(Boolean).join(' · ')}
        </p>
      </div>
    </div>
  )
}

// ── 그리드 카드 ────────────────────────────────────────────────
const CARD_BG = ['#EEEDFE','#FAEEDA','#FAECE7','#E1F5EE','#E6F1FB','#EAF3DE','#FBEAF0','#FCEBEB']
const CAT_EMOJI: Record<string, string> = {
  exhibition:'🖼️', performance:'🎭', festival:'🎉', lecture:'🎤', experience:'✨', etc:'🎪',
}

function GridCard({ event, index }: { event: Event; index: number }) {
  const dday = getDday(event.end_at)
  const slug = event.categories?.slug ?? 'etc'

  return (
    <li className="rounded-[10px] overflow-hidden border border-gray-200/80 cursor-pointer bg-white hover:opacity-90 transition-opacity">
      <div className="w-full relative overflow-hidden" style={{ aspectRatio: '3/2' }}>
        {event.image_url ? (
          <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[30px]"
            style={{ backgroundColor: CARD_BG[index % CARD_BG.length] }}>
            {CAT_EMOJI[slug] ?? '🎪'}
          </div>
        )}
        <span className={`absolute top-[7px] left-[7px] text-[9px] font-medium px-1.5 py-0.5 rounded ${event.is_free ? 'bg-[#E1F5EE] text-[#085041]' : 'bg-[#F1EFE8] text-[#444441]'}`}>
          {event.is_free ? '무료' : '유료'}
        </span>
        {dday && (
          <span className="absolute top-[7px] right-[7px] text-[9px] font-medium bg-black/60 text-white px-1.5 py-0.5 rounded">
            {dday}
          </span>
        )}
      </div>
      <div className="px-[9px] pt-[7px] pb-[9px]">
        {event.categories && <p className="text-[10px] text-gray-500 mb-0.5">{event.categories.name}</p>}
        <h3 className="text-[12px] font-medium text-gray-900 leading-[1.35] line-clamp-2">{event.title}</h3>
        {event.venue && (
          <p className="mt-0.5 text-[11px] text-gray-500 flex items-center gap-[3px] truncate">
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-2.5 h-2.5 shrink-0 text-gray-400">
              <path fillRule="evenodd" d="M8 1.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9zM2 6a6 6 0 1110.174 4.31c-.203.196-.43.402-.661.61A19.524 19.524 0 018 14.58a19.523 19.523 0 01-3.513-3.67 21.321 21.321 0 01-.66-.61A6 6 0 012 6zm6 0a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
            </svg>
            {event.venue}
          </p>
        )}
      </div>
    </li>
  )
}

// ── 메인 export ─────────────────────────────────────────────────
export function HomeContent({
  events,
  top10Events,
  featuredEvent,
}: {
  events: Event[]
  top10Events: EventWithHeartCount[]
  featuredEvent: Event | null
}) {
  const [activeMood, setActiveMood] = useState<Mood | null>(null)
  const filtered = applyMood(events, activeMood)

  return (
    <>
      {/* 기분 필터 */}
      <div className="px-5 pt-2 pb-3">
        <p className="text-[11px] text-gray-500 mb-[7px]">어떤 기분으로 나가고 싶어?</p>
        <div className="flex gap-1.5 flex-wrap">
          {MOODS.map((mood) => (
            <button
              key={mood}
              onClick={() => setActiveMood(activeMood === mood ? null : mood)}
              className={`px-[11px] py-[5px] rounded-full text-[12px] border transition-all duration-150 ${
                activeMood === mood
                  ? 'bg-[#1D1D1D] text-white border-[#1D1D1D]'
                  : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-400'
              }`}
            >
              {mood}
            </button>
          ))}
        </div>
      </div>

      {/* HOT TOP 10 */}
      <HotTop10 events={top10Events} />

      {/* 이번 주 픽 */}
      <div className="px-5 pt-3.5 pb-2 flex items-center">
        <span className="text-[14px] font-medium text-gray-900">이번 주 픽 ✦</span>
      </div>
      {featuredEvent
        ? <FeaturedCard event={featuredEvent} />
        : <p className="px-5 pb-3 text-[13px] text-gray-400">이번 주 픽이 준비 중이에요</p>
      }

      {/* 지금 열려 있어요 */}
      <div className="px-5 pt-3.5 pb-2 flex justify-between items-center">
        <span className="text-[14px] font-medium text-gray-900">지금 열려 있어요</span>
        <span className="text-[12px] text-gray-500">전체 보기</span>
      </div>
      {filtered.length === 0 ? (
        <p className="px-5 py-12 text-center text-[13px] text-gray-400">해당하는 행사가 없어요</p>
      ) : (
        <ul className="px-5 pb-6 grid grid-cols-2 gap-[10px]">
          {filtered.map((ev, i) => <GridCard key={ev.id} event={ev} index={i} />)}
        </ul>
      )}
    </>
  )
}
