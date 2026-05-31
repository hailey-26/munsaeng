import { supabase, type Event } from '@/lib/supabase'

export default async function EventsPage() {
  const { data: events, error } = await supabase
    .from('events')
    .select('*, categories(name, slug)')
    .order('start_at', { ascending: true })

  if (error) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-12">
        <p className="text-red-500">행사 목록을 불러오는 데 실패했습니다.</p>
      </main>
    )
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">행사 목록</h1>

      {events.length === 0 ? (
        <p className="text-gray-500">등록된 행사가 없습니다.</p>
      ) : (
        <ul className="space-y-4">
          {events.map((event: Event) => (
            <li
              key={event.id}
              className="border rounded-lg p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-xl font-semibold">{event.title}</h2>
                <span className="shrink-0 text-sm text-blue-600 font-medium">
                  {event.is_free ? '무료' : event.price != null ? `${event.price.toLocaleString()}원` : '가격 미정'}
                </span>
              </div>

              {event.categories && (
                <span className="inline-block mt-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                  {event.categories.name}
                </span>
              )}

              <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-500">
                <span>
                  {new Date(event.start_at).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                  {event.end_at && (
                    <>
                      {' ~ '}
                      {new Date(event.end_at).toLocaleDateString('ko-KR', {
                        month: 'long',
                        day: 'numeric',
                      })}
                    </>
                  )}
                </span>
                {event.venue && <span>📍 {event.venue}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
