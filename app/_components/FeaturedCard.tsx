import type { Event } from '@/lib/supabase'

function getDday(endAt: string | null): string {
  if (!endAt) return ''
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const end = new Date(endAt); end.setHours(0, 0, 0, 0)
  const diff = Math.round((end.getTime() - today.getTime()) / 86_400_000)
  if (diff < 0) return '종료'
  if (diff === 0) return 'D-DAY'
  return `D-${diff}`
}

function formatEndDate(endAt: string | null): string {
  if (!endAt) return ''
  return new Date(endAt).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
}

export function FeaturedCard({ event }: { event: Event }) {
  const dday = getDday(event.end_at)

  return (
    <div className="mx-5 mb-3.5 rounded-xl overflow-hidden relative h-[170px] cursor-pointer"
      style={{ background: 'linear-gradient(135deg, #0F6E56, #1D9E75, #5DCAA5)' }}
    >
      {/* 이미지 (있을 경우 오버레이) */}
      {event.image_url && (
        <img
          src={event.image_url}
          alt={event.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* 장식 blob */}
      {!event.image_url && (
        <div className="absolute top-3.5 right-3.5 w-[58px] h-[58px] bg-white/10 flex items-center justify-center text-2xl"
          style={{ borderRadius: '50% 30% 60% 40%' }}
        >
          🎨
        </div>
      )}

      {/* 그라디언트 오버레이 */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 55%)' }}
      />

      {/* 콘텐츠 */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <div className="flex gap-1 mb-[5px]">
          {event.categories && (
            <span className="text-[10px] px-[7px] py-0.5 rounded-lg font-medium bg-white/20 text-white backdrop-blur-sm">
              {event.categories.name}
            </span>
          )}
          {event.is_free && (
            <span className="text-[10px] px-[7px] py-0.5 rounded-lg font-medium bg-white/20 text-white backdrop-blur-sm">
              무료
            </span>
          )}
          {dday && (
            <span className="text-[10px] px-[7px] py-0.5 rounded-lg font-medium bg-[#E24B4A] text-white">
              {dday}
            </span>
          )}
        </div>
        <h3 className="text-[15px] font-medium text-white leading-[1.3] mb-[3px] line-clamp-2">
          {event.title}
        </h3>
        <p className="text-[11px] text-white/70">
          {[event.venue, event.end_at ? `~${formatEndDate(event.end_at)}` : null]
            .filter(Boolean).join(' · ')}
        </p>
      </div>
    </div>
  )
}
