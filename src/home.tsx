import { AlertCircle, RefreshCw, Search } from 'lucide-react'
import { useState } from 'react'
import { useArNSOwners } from './hooks/use-arns-owners'
import { useFilteredOwners } from './hooks/use-filtered-owners'

export function Home() {
  const [query, setQuery] = useState('')
  const {
    owners,
    error,
    isFetchComplete,
    isFetching,
    isFetchingNames,
    isFetchingOwners,
    isLoading,
    ownedNamesCount,
    progress,
    refetchOwners,
    resolvedNames,
    totalNames,
    unresolvedCount,
  } = useArNSOwners()
  const filteredOwners = useFilteredOwners(owners, query)
  const visibleOwners = isFetchComplete ? filteredOwners : []

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="display-title mt-2 text-4xl font-bold text-(--sea-ink) sm:text-5xl">
              ArNS Registration Status
            </h1>
          </div>

          {isFetchingNames ? (
            <div className="inline-flex h-11 items-center justify-center rounded-md border border-(--line) bg-(--surface-strong) px-4 text-sm font-bold text-(--sea-ink-soft)">
              Fetching names...
            </div>
          ) : (
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-(--sea-ink) px-4 text-sm font-bold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isFetchingOwners || isFetching}
              onClick={refetchOwners}
              type="button"
            >
              <RefreshCw className="size-4" />
              Refresh
            </button>
          )}
        </header>

        <section className="island-shell overflow-hidden rounded-lg">
          <div className="flex flex-col gap-4 border-b border-(--line) p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3 text-sm text-(--sea-ink-soft)">
              <span>
                {statusText({
                  isFetchComplete,
                  isLoading,
                  visible: visibleOwners.length,
                })}
              </span>
              {isFetchingOwners ? <span>Fetching owner batches</span> : null}
              {!isFetchComplete ? (
                <span>
                  {fetchProgressSummary({
                    progress,
                    resolvedNames,
                    totalNames,
                  })}
                </span>
              ) : null}
              {isFetchComplete ? (
                <span>
                  {ownersSummary({
                    visible: visibleOwners.length,
                    totalOwners: owners.length,
                    totalNames,
                    ownedNamesCount,
                    resolvedNames,
                    unresolvedCount,
                  })}
                </span>
              ) : null}
              {error ? (
                <span className="inline-flex items-center gap-2 font-semibold text-red-700">
                  <AlertCircle className="size-4" />
                  {error}
                </span>
              ) : null}
            </div>

            <label className="relative block w-full lg:w-80">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-(--sea-ink-soft)" />
              <input
                className="h-11 w-full rounded-md border border-(--line) bg-(--surface-strong) pr-3 pl-10 text-sm font-medium outline-none transition focus:border-(--lagoon-deep) focus:ring-2 focus:ring-[rgba(50,143,151,0.18)]"
                disabled={!isFetchComplete}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search owners"
                type="search"
                value={query}
              />
            </label>
          </div>

          <div className="max-h-[68vh] overflow-auto">
            <table className="w-full min-w-160 border-collapse text-left text-sm">
              <thead className="sticky top-0 z-10 bg-(--surface-strong) text-xs font-bold tracking-[0.08em] text-(--sea-ink-soft) uppercase backdrop-blur">
                <tr>
                  <Th>Owner</Th>
                  <Th>Domains Owned</Th>
                </tr>
              </thead>
              <tbody>
                {!isFetchComplete ? <OwnerTableSkeleton /> : null}

                {visibleOwners.map((owner) => (
                  <tr
                    className="border-t border-(--line) transition hover:bg-white/45"
                    key={owner.owner}
                  >
                    <td className="max-w-160 px-4 py-3 align-top font-mono text-xs break-all text-(--sea-ink-soft)">
                      {owner.owner}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className="rounded-sm border border-(--chip-line) bg-(--chip-bg) px-2 py-1 text-xs font-bold">
                        {formatNumber(owner.domainCount)}
                      </span>
                    </td>
                  </tr>
                ))}

                {!isLoading && isFetchComplete && visibleOwners.length === 0 ? (
                  <tr>
                    <td
                      className="px-4 py-12 text-center text-(--sea-ink-soft)"
                      colSpan={2}
                    >
                      No owners found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3">{children}</th>
}

function OwnerTableSkeleton() {
  return Array.from({ length: 8 }, (_, index) => (
    <tr className="border-t border-(--line)" key={index}>
      <td className="px-4 py-3">
        <div
          className="h-4 animate-pulse rounded-sm bg-(--line)"
          style={{ width: `${70 + (index % 3) * 8}%` }}
        />
      </td>
      <td className="px-4 py-3">
        <div className="h-6 w-14 animate-pulse rounded-sm bg-(--chip-bg)" />
      </td>
    </tr>
  ))
}

function statusText({
  isFetchComplete,
  isLoading,
  visible,
}: {
  isFetchComplete: boolean
  isLoading: boolean
  visible: number
}) {
  if (!isFetchComplete) {
    return 'Fetching all names and owners'
  }

  if (isLoading) {
    return 'Fetching all names and owners'
  }

  return `${formatNumber(visible)} owners visible`
}

function ownersSummary({
  visible,
  totalOwners,
  totalNames,
  ownedNamesCount,
  resolvedNames,
  unresolvedCount,
}: {
  visible: number
  totalOwners: number
  totalNames?: number
  ownedNamesCount: number
  resolvedNames: number
  unresolvedCount?: number
}) {
  const totalNamesText =
    totalNames == null ? 'names loading' : `${formatNumber(totalNames)} names`
  const resolvedText =
    totalNames == null || resolvedNames >= totalNames
      ? ''
      : `, ${formatNumber(resolvedNames)} owners resolved`
  const unresolvedText =
    unresolvedCount == null || unresolvedCount === 0
      ? ''
      : `, ${formatNumber(unresolvedCount)} unresolved`

  return `${formatNumber(visible)} of ${formatNumber(totalOwners)} unique owners, ${formatNumber(ownedNamesCount)} names with owners, ${totalNamesText}${resolvedText}${unresolvedText}`
}

function fetchProgressSummary({
  progress,
  resolvedNames,
  totalNames,
}: {
  progress: {
    currentBatch: number
    currentBatchEnd?: number
    currentBatchStart?: number
    currentName?: string
    totalBatches: number
  }
  resolvedNames: number
  totalNames?: number
}) {
  const totalNamesText =
    totalNames == null ? 'names loading' : `${formatNumber(totalNames)} names`
  const resolvedText = `${formatNumber(resolvedNames)} owner lookups complete`

  if (progress.currentName == null || progress.currentBatchStart == null) {
    return `${totalNamesText}, ${resolvedText}`
  }

  const batchRange =
    progress.currentBatchEnd == null
      ? formatNumber(progress.currentBatchStart)
      : `${formatNumber(progress.currentBatchStart)}-${formatNumber(progress.currentBatchEnd)}`

  return `${totalNamesText}, ${resolvedText}, batch ${formatNumber(progress.currentBatch)} of ${formatNumber(progress.totalBatches)} (${batchRange}), current name ${progress.currentName}`
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en').format(value)
}
