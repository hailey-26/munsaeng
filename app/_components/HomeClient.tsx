'use client'

import { useState } from 'react'
import type { Event } from '@/lib/supabase'

// ── 기분 필터 ──────────────────────────────────────────────────
type Mood = '혼자 조용히' | '친구랑 신나게' | '무료만' | '데이트'

const MOODS: Mood[] = ['혼자 조용히', '친구랑 신나게', '무료만', '데이트']

const MOOD_SLUGS: Record<Mood, string[] | null> = {
  '혼자 조용히':   ['exhibition', 'lecture'],
  '친구랑 신나게': ['festival', 'performance', 'experience'],
  '무료만':        null,
  '데이트':        ['exhibition', 'experience', 'performance'],
}

function applyMood(events: Event[], mood: Mood | null): Event[] {
  if (!mood) return events
  if (mood === '무료만') return events.filter((e) => e.is_free)
  const slugs = MOOD_SLUGS[mood]!
  return events.filter((e) => slugs.includes(e.categories?.slug ?? ''))
}

// ── 이미지 없을 때 placeholder 색상 ───────────────────────────
const CARD_BG = [
  '#EEEDFE', '#FAEEDA', '#FAECE7', '#E1F5EE',
  '#E6F1FB', '#EAF3DE', '#FBEAF0', '#FCEBEB',
]
const CATEGORY_EMOJI: Record<string, string> = {
  exhibition: '🖼️', performance: '🎭', festival: '🎉',
  lecture: '🎤', experience: '✨', etc: '🎪',
}

// ── D-day 계산 ─────────────────────────────────────────────────
function getDday(endAt: string | null): string {
  if (!endAt) return ''
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const end = new Date(endAt); end.setHours(0, 0, 0, 0)
  const diff = Math.round((end.getTime() - today.getTime()) / 86_400_000)
  if (diff < 0) return '종료'
  if (diff === 0) return 'D-DAY'
  return `D-${diff}`
}

// ── 그리드 카드 ────────────────────────────────────────────────
function GridCard({ event, index }: { event: Event; index: number }) {
  const dday = getDday(event.end_at)
  const slug = event.categories?.slug ?? 'etc'
  const bg = CARD_BG[index % CARD_BG.length]
  const emoji = CATEGORY_EMOJI[slug] ?? '🎪'

  return (
    <li className="rounded-[10px] overflow-hidden border border-gray-200/80 cursor-pointer bg-white hover:opacity-90 transition-opacity">
      {/* 이미지 영역 */}
      <div className="w-full relative overflow-hidden" style={{ aspectRatio: '3/2' }}>
        {event.image_url ? (
          <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[30px]" style={{ backgroundColor: bg }}>
            {emoji}
          </div>
        )}

        {/* 좌상단: 무료/유료 */}
        <span className={`absolute top-[7px] left-[7px] text-[9px] font-medium px-1.5 py-0.5 rounded ${
          event.is_free ? 'bg-[#E1F5EE] text-[#085041]' : 'bg-[#F1EFE8] text-[#444441]'
        }`}>
          {event.is_free ? '무료' : '유료'}
        </span>

        {/* 우상단: D-day */}
        {dday && (
          <span className="absolute top-[7px] right-[7px] text-[9px] font-medium bg-black/60 text-white px-1.5 py-0.5 rounded">
            {dday}
          </span>
        )}
      </div>

      {/* 텍스트 */}
      <div className="px-[9px] pt-[7px] pb-[9px]">
        {event.categories && (
          <p className="text-[10px] text-gray-500 mb-0.5">{event.categories.name}</p>
        )}
        <h3 className="text-[12px] font-medium text-gray-900 leading-[1.35] line-clamp-2">
          {event.title}
        </h3>
        {event.venue && (
          <p className="mt-0.5 text-[11px] text-gray-500 flex items-center gap-[3px] truncate">
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-2.5 h-2.5 shrink-0">
              <path fillRule="evenodd" d="M8 1.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9zM2 6a6 6 0 1110.174 4.31c-.203.196-.43.402-.661.61A19.524 19.524 0 018 14.58a19.523 19.523 0 01-3.513-3.67 21.321 21.321 0 01-.66-.61A6 6 0 012 6zm6 0a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
            </svg>
            {event.venue}
          </p>
        )}
      </div>
    </li>
  )
}

// ── 메인 Client 컴포넌트 ───────────────────────────────────────
export function HomeClient({ events }: { events: Event[] }) {
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

      {/* 지금 열려 있어요 */}
      <div className="px-5 pt-3.5 pb-2 flex justify-between items-center">
        <span className="text-[14px] font-medium text-gray-900">지금 열려 있어요</span>
        <span className="text-[12px] text-gray-500">전체 보기</span>
      </div>

      {filtered.length === 0 ? (
        <div className="px-5 py-12 text-center text-[13px] text-gray-400">
          해당하는 행사가 없어요
        </div>
      ) : (
        <ul className="px-5 pb-4 grid grid-cols-2 gap-[10px]">
          {filtered.map((event, i) => (
            <GridCard key={event.id} event={event} index={i} />
          ))}
        </ul>
      )}
    </>
  )
}
