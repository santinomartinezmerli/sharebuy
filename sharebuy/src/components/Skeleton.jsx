function SkeletonBlock({ className }) {
  return <div className={`bg-gray-200 dark:bg-gray-700 rounded animate-pulse ${className}`} />
}

export function SkeletonPostDetail() {
  return (
    <div className="flex flex-col h-full animate-pulse p-4 gap-4">
      <div className="flex items-center gap-3">
        <SkeletonBlock className="w-8 h-8 rounded-full" />
        <SkeletonBlock className="h-4 w-24" />
        <SkeletonBlock className="h-4 w-4 ml-auto rounded" />
      </div>
      <SkeletonBlock className="aspect-square w-full rounded-xl" />
      <div className="flex items-center gap-2">
        <SkeletonBlock className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-1">
          <SkeletonBlock className="h-3 w-20" />
          <SkeletonBlock className="h-3 w-32" />
        </div>
      </div>
      <div className="space-y-2">
        <SkeletonBlock className="h-4 w-3/4" />
        <SkeletonBlock className="h-3 w-1/2" />
      </div>
      <div className="space-y-3 mt-auto">
        {[1, 2].map(i => (
          <div key={i} className="flex items-start gap-2">
            <SkeletonBlock className="w-7 h-7 rounded-full shrink-0" />
            <div className="flex-1 space-y-1">
              <SkeletonBlock className="h-3 w-16" />
              <SkeletonBlock className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function SkeletonProfile() {
  return (
    <div className="flex flex-col items-center animate-pulse p-4 gap-4">
      <SkeletonBlock className="w-20 h-20 rounded-full" />
      <div className="flex gap-8">
        <div className="text-center space-y-1">
          <SkeletonBlock className="h-4 w-8 mx-auto" />
          <SkeletonBlock className="h-3 w-12 mx-auto" />
        </div>
        <div className="text-center space-y-1">
          <SkeletonBlock className="h-4 w-8 mx-auto" />
          <SkeletonBlock className="h-3 w-12 mx-auto" />
        </div>
        <div className="text-center space-y-1">
          <SkeletonBlock className="h-4 w-8 mx-auto" />
          <SkeletonBlock className="h-3 w-12 mx-auto" />
        </div>
      </div>
      <SkeletonBlock className="h-4 w-32" />
      <SkeletonBlock className="h-3 w-48" />
      <div className="grid grid-cols-3 gap-1 w-full">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonBlock key={i} className="aspect-square w-full rounded" />
        ))}
      </div>
    </div>
  )
}

export function SkeletonList({ count = 5 }) {
  return (
    <div className="animate-pulse p-4 space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <SkeletonBlock className="w-10 h-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <SkeletonBlock className="h-3.5 w-24" />
            <SkeletonBlock className="h-3 w-full" />
          </div>
          <SkeletonBlock className="h-7 w-16 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonChat() {
  return (
    <div className="flex flex-col h-full animate-pulse p-4">
      <div className="flex items-center gap-3 pb-3 border-b border-gray-200 dark:border-gray-700">
        <SkeletonBlock className="w-8 h-8 rounded-full" />
        <SkeletonBlock className="h-4 w-24" />
      </div>
      <div className="flex-1 flex flex-col justify-end gap-3 py-4">
        <div className="flex justify-start">
          <SkeletonBlock className="h-10 w-3/5 rounded-2xl rounded-bl-sm" />
        </div>
        <div className="flex justify-end">
          <SkeletonBlock className="h-8 w-2/5 rounded-2xl rounded-br-sm" />
        </div>
        <div className="flex justify-start">
          <SkeletonBlock className="h-12 w-1/2 rounded-2xl rounded-bl-sm" />
        </div>
        <div className="flex justify-end">
          <SkeletonBlock className="h-8 w-3/5 rounded-2xl rounded-br-sm" />
        </div>
      </div>
    </div>
  )
}

export function SkeletonForm({ fields = 4 }) {
  return (
    <div className="animate-pulse p-4 space-y-5">
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-5 w-24" />
        <SkeletonBlock className="h-8 w-16 rounded-lg" />
      </div>
      <div className="flex justify-center">
        <SkeletonBlock className="w-24 h-24 rounded-full" />
      </div>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <SkeletonBlock className="h-3 w-20" />
          <SkeletonBlock className="h-10 w-full rounded-lg" />
        </div>
      ))}
      <div className="flex gap-2">
        {['Ropa', 'Tecno', 'Hogar', 'Deporte'].map(c => (
          <SkeletonBlock key={c} className="h-8 w-16 rounded-full" />
        ))}
      </div>
    </div>
  )
}
