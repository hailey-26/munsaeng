import { supabase, type Category, type Event } from '@/lib/supabase'
import EventsClient from './_components/EventsClient'

export default async function EventsPage() {
  const [eventsRes, categoriesRes] = await Promise.all([
    supabase
      .from('events')
      .select('*, categories(id, name, slug)')
      .order('start_at', { ascending: true }),
    supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true }),
  ])

  if (eventsRes.error) {
    console.error('[events] Supabase 에러:', eventsRes.error)
    return (
      <main className="max-w-5xl mx-auto px-4 py-12">
        <p className="text-red-500">행사 목록을 불러오는 데 실패했습니다.</p>
        <pre className="mt-2 text-xs text-red-400 whitespace-pre-wrap">
          {JSON.stringify(eventsRes.error, null, 2)}
        </pre>
      </main>
    )
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">부산 문화행사</h1>
        <p className="mt-1 text-gray-500 text-sm">부산의 다양한 전시·공연·축제를 한눈에</p>
      </header>

      <EventsClient
        events={eventsRes.data as Event[]}
        categories={(categoriesRes.data ?? []) as Category[]}
      />
    </main>
  )
}
