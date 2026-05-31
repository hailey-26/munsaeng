'use client'

import { useState, useEffect, useRef } from 'react'
import type { EventWithHeartCount } from '@/lib/supabase'

const RANK_NUM_COLOR = ['text-[#E24B4A]', 'text-[#BA7517]', 'text-[#888780]']

export function HotTop10({ events }: { events: EventWithHeartCount[] }) {
  const [expanded, setExpanded] = useState(false)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [visible, setVisible] = useState(true)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (expanded || events.length === 0) {
      timerRef.current && clearInterval(timerRef.current)
      return
    }
    timerRef.current = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setCurrentIdx((i) => (i + 1) % events.length)
        setVisible(true)
      }, 200)
    }, 2500)
    return () => { timerRef.current && clearInterval(timerRef.current) }
  }, [expanded, events.length])

  if (events.length === 0) return null

  const current = events[currentIdx]

  return (
    <div className="mx-5 mb-3.5 border border-gray-200/80 rounded-xl overflow-hidden">
      {/* 헤더 */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-4 py-[0.6rem] flex items-center justify-between bg-gray-50 cursor-pointer"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <span className="bg-[#E24B4A] text-white text-[10px] font-medium px-[7px] py-0.5 rounded-full">
            HOT
          </span>
          <span className="text-[13px] font-medium text-gray-900">현재 인기 상승 TOP 10</span>
        </div>
        <svg
          viewBox="0 0 20 20" fill="currentColor"
          className={`w-4 h-4 text-gray-400 transition-transform duration-250 ${expanded ? 'rotate-180' : ''}`}
        >
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {/* 마퀴 (접힌 상태) */}
      <div
        className="px-4 py-[0.55rem] border-t border-gray-200/80 flex items-center gap-2 transition-opacity duration-200"
        style={{ opacity: visible ? 1 : 0 }}
      >
        <span className="text-[12px] font-medium text-[#E24B4A] shrink-0 min-w-[22px]">
          {currentIdx + 1}위
        </span>
        <p className="text-[12px] text-gray-900 flex-1 min-w-0 truncate">
          {current.title}
          {' · '}
          <span className="text-gray-500">
            {current.venue ?? '장소 미정'} · {current.is_free ? '무료' : '유료'}
          </span>
        </p>
      </div>

      {/* 펼친 목록 */}
      <div
        className="border-t border-gray-200/80 overflow-hidden transition-all duration-300"
        style={{ maxHeight: expanded ? '500px' : '0px' }}
      >
        <ul>
          {events.map((event, idx) => (
            <li
              key={event.id}
              className="flex items-center gap-2.5 px-4 py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer"
            >
              <span className={`w-5 text-[12px] font-medium text-center shrink-0 ${RANK_NUM_COLOR[idx] ?? 'text-gray-400 text-[11px]'}`}>
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-medium text-gray-900 truncate">{event.title}</div>
                <div className="text-[11px] text-gray-500">{event.venue ?? '장소 미정'}</div>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                event.is_free ? 'bg-[#E1F5EE] text-[#085041]' : 'bg-[#F1EFE8] text-[#444441]'
              }`}>
                {event.is_free ? '무료' : '유료'}
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
