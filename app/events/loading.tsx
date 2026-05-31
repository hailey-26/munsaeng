export default function Loading() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-8">
        <div className="h-9 w-48 bg-gray-200 rounded-lg animate-pulse" />
        <div className="mt-2 h-4 w-64 bg-gray-100 rounded animate-pulse" />
      </div>

      {/* 탭 스켈레톤 */}
      <div className="flex gap-2 mb-5">
        {[60, 48, 48, 56, 48, 48].map((w, i) => (
          <div
            key={i}
            className="h-8 rounded-full bg-gray-100 animate-pulse shrink-0"
            style={{ width: w }}
          />
        ))}
      </div>

      <div className="h-4 w-20 bg-gray-100 rounded animate-pulse mb-4" />

      {/* 카드 스켈레톤 */}
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="rounded-2xl overflow-hidden border border-gray-100 bg-white">
            <div className="aspect-[4/3] bg-gray-100 animate-pulse" />
            <div className="p-4 space-y-2">
              <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
              <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 w-28 bg-gray-100 rounded animate-pulse mt-2" />
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}
