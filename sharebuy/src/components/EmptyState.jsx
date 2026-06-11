function EmptyState({ icon, title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 gap-3">
      {icon && (
        <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-gray-400 text-center">{title}</p>
      {subtitle && <p className="text-xs text-gray-400 text-center leading-relaxed max-w-[200px]">{subtitle}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}

export default EmptyState
