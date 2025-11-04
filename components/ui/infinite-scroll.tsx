"use client"

import { useEffect, useRef, ReactNode } from "react"

interface InfiniteScrollProps<T> {
  items: T[]
  hasNextPage: boolean
  isLoading: boolean
  onLoadMore: () => void
  renderItem: (item: T, index: number) => ReactNode
  loadingComponent?: ReactNode
  className?: string
}

export function InfiniteScroll<T>({
  items,
  hasNextPage,
  isLoading,
  onLoadMore,
  renderItem,
  loadingComponent,
  className,
}: InfiniteScrollProps<T>) {
  const observerTarget = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isLoading) {
          onLoadMore()
        }
      },
      { threshold: 0.1, rootMargin: "200px" }
    )

    const currentTarget = observerTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [hasNextPage, isLoading, onLoadMore])

  return (
    <div className={className}>
      {items.map((item, index) => (
        <div key={index}>{renderItem(item, index)}</div>
      ))}
      {hasNextPage && (
        <div ref={observerTarget} className="flex justify-center py-4">
          {loadingComponent || (
            <div className="text-sm text-muted-foreground">Loading more...</div>
          )}
        </div>
      )}
      {!hasNextPage && items.length > 0 && (
        <div className="flex justify-center py-4">
          <div className="text-sm text-muted-foreground">No more items</div>
        </div>
      )}
    </div>
  )
}

