interface ErrorBannerProps {
  message: string
  onRetry?: () => void
}

export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div className="bg-red/10 border border-red/30 rounded-xl p-4 mb-4">
      <p className="text-red text-sm">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 text-cherry text-sm hover:underline cursor-pointer"
        >
          Try again
        </button>
      )}
    </div>
  )
}
