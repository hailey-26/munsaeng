export default function Loading() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <div className="h-9 w-40 bg-gray-200 rounded animate-pulse mb-8" />
      <ul className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i} className="border rounded-lg p-5">
            <div className="h-6 w-2/3 bg-gray-200 rounded animate-pulse" />
            <div className="mt-2 h-4 w-full bg-gray-100 rounded animate-pulse" />
            <div className="mt-3 flex gap-4">
              <div className="h-4 w-28 bg-gray-100 rounded animate-pulse" />
              <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}
