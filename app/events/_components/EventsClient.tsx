'use client'

import { useState } from 'react'
import type { Category, Event } from '@/lib/supabase'

const CATEGORY_COLOR: Record<string, string> = {
  exhibition:  'bg-blue-100 text-blue-700',
  performance: 'bg-purple-100 text-purple-700',
  festival:    'bg-amber-100 text-amber-700',
  lecture:     'bg-green-100 text-green-700',
  experience:  'bg-pink-100 text-pink-700',
  etc:         'bg-gray-100 text-gray-600',
}

function formatDateRange(startAt: string | null, endAt: string | null) {
  if (!startAt) return ''
  const fmt = (d: Date) =>
    d.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
  const start = fmt(new Date(startAt))
  return endAt ? `${start} ~ ${fmt(new Date(endAt))}` : start
}

function EventCard({ event }: { event: Event }) {
  const slug = event.categories?.slug ?? 'etc'
  const badgeColor = CATEGORY_COLOR[slug] ?? CATEGORY_COLOR.etc

  return (
    <li className="group flex flex-col rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-sm hover:shadow-lg transition-shadow duration-200 cursor-pointer">
      {/* 이미지 */}
      <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
        {event.image_url ? (
          <img
            src={event.image_url}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <span className="text-5xl opacity-30">🎭</span>
          </div>
        )}

        {event.categories && (
          <span className={`absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full ${badgeColor}`}>
            {event.categories.name}
          </span>
        )}

        {event.is_free && (
          <span className="absolute top-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500 text-white">
            무료
          </span>
        )}
      </div>

      {/* 텍스트 */}
      <div className="flex flex-col flex-1 p-4 gap-1">
        <p className="text-xs text-gray-400">
          {formatDateRange(event.start_at, event.end_at)}
        </p>

        <h2 className="font-semibold text-gray-900 text-[15px] leading-snug line-clamp-2 flex-1">
          {event.title}
        </h2>

        <div className="flex items-center justify-between mt-2">
          {event.venue ? (
            <p className="text-xs text-gray-500 truncate flex items-center gap-1">
              <span aria-hidden>📍</span>
              {event.venue}
            </p>
          ) : <span />}

          {!event.is_free && event.price != null && (
            <span className="text-xs font-semibold text-gray-700 shrink-0 ml-2">
              {event.price.toLocaleString()}원
            </span>
          )}
        </div>
      </div>
    </li>
  )
}

export default function EventsClient({
  events,
  categories,
}: {
  events: Event[]
  categories: Category[]
}) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null)

  const filtered = activeSlug
    ? events.filter((e) => e.categories?.slug === activeSlug)
    : events

  return (
    <div>
      {/* 카테고리 탭 */}
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          onClick={() => setActiveSlug(null)}
          className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            activeSlug === null
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          전체
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveSlug(activeSlug === cat.slug ? null : cat.slug)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeSlug === cat.slug
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* 결과 수 */}
      <p className="mt-5 mb-4 text-sm text-gray-400">
        {filtered.length}개의 행사
      </p>

      {/* 그리드 */}
      {filtered.length === 0 ? (
        <div className="py-24 text-center text-gray-400 text-sm">
          해당 카테고리의 행사가 없습니다.
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </ul>
      )}
    </div>
  )
}
