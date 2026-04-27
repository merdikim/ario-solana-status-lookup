import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { AlertCircle, ChevronLeft, ChevronRight, RefreshCw, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { fetchArNSNamesPage } from './lib/arns'
import type { ArNSRecord, FetchArNSNamesPageResult } from './types'

const arnsRecordsQueryKey = ['arns-records'] as const
const pageSize = 100

export function Home() {
  const [query, setQuery] = useState('')
  const [pageIndex, setPageIndex] = useState(0)
  const [pageCursors, setPageCursors] = useState<(string | undefined)[]>([undefined])
  const cursor = pageCursors[pageIndex]

  const arnsRecordsQuery = useQuery<FetchArNSNamesPageResult>({
    queryKey: [...arnsRecordsQueryKey, cursor],
    queryFn: () => fetchArNSNamesPage({ cursor, limit: pageSize }),
    enabled: typeof window !== 'undefined',
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  })

  const records = arnsRecordsQuery.data?.items ?? []
  const isLoading = arnsRecordsQuery.isPending || arnsRecordsQuery.isFetching
  const error = arnsRecordsQuery.error?.message ?? null
  const hasPreviousPage = pageIndex > 0
  const hasNextPage = arnsRecordsQuery.data?.hasMore === true && arnsRecordsQuery.data.nextCursor != null

  const filteredRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    if (normalizedQuery.length === 0) {
      return records
    }

    return records.filter((record) => {
      return (
        record.name.toLowerCase().includes(normalizedQuery) ||
        record.owner?.toLowerCase().includes(normalizedQuery) === true ||
        registrationStatus(record).toLowerCase().includes(normalizedQuery)
      )
    })
  }, [query, records])

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="display-title mt-2 text-4xl font-bold text-(--sea-ink) sm:text-5xl">
              ArNS Registration Status
            </h1>
          </div>

          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-(--sea-ink) px-4 text-sm font-bold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading}
            onClick={() => void arnsRecordsQuery.refetch()}
            type="button"
          >
            <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </header>

        <section className="island-shell overflow-hidden rounded-lg">
          <div className="flex flex-col gap-4 border-b border-(--line) p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3 text-sm text-(--sea-ink-soft)">
              <span>{statusText({ isLoading, visible: filteredRecords.length })}</span>
              <span>
                {pageSummary({
                  pageIndex,
                  itemsPerPage: pageSize,
                  visible: filteredRecords.length,
                  totalItems: arnsRecordsQuery.data?.totalItems,
                })}
              </span>
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
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search names, process IDs, types"
                type="search"
                value={query}
              />
            </label>
          </div>

          <div className="flex flex-col gap-3 border-b border-(--line) px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-(--sea-ink-soft)">
              Page {formatNumber(pageIndex + 1)}
            </p>

            <div className="flex items-center gap-2">
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-(--line) bg-(--surface-strong) px-3 text-sm font-bold transition hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!hasPreviousPage || isLoading}
                onClick={() => setPageIndex((current) => Math.max(0, current - 1))}
                type="button"
              >
                <ChevronLeft className="size-4" />
                Previous
              </button>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-(--line) bg-(--surface-strong) px-3 text-sm font-bold transition hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!hasNextPage || isLoading}
                onClick={() => {
                  const nextCursor = arnsRecordsQuery.data?.nextCursor

                  if (nextCursor == null) {
                    return
                  }

                  setPageCursors((current) => {
                    if (current[pageIndex + 1] === nextCursor) {
                      return current
                    }

                    return [...current.slice(0, pageIndex + 1), nextCursor]
                  })
                  setPageIndex((current) => current + 1)
                }}
                type="button"
              >
                Next
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>

          <div className="max-h-[68vh] overflow-auto">
            <table className="w-full min-w-180 border-collapse text-left text-sm">
              <thead className="sticky top-0 z-10 bg-(--surface-strong) text-xs font-bold tracking-[0.08em] text-(--sea-ink-soft) uppercase backdrop-blur">
                <tr>
                  <Th>Name</Th>
                  <Th>Owner</Th>
                  <Th>Registration Status</Th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr
                    className="border-t border-(--line) transition hover:bg-white/45"
                    key={`${record.name}-${record.processId}`}
                  >
                    <td className="px-4 py-3 align-top">
                      <span className="font-bold" title={record.name}>
                        {formatName(record.name)}
                      </span>
                    </td>
                    <td className="max-w-64 px-4 py-3 align-top font-mono text-xs break-all text-(--sea-ink-soft)">
                      {record.owner ?? 'Unknown'}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className="rounded-sm border border-(--chip-line) bg-(--chip-bg) px-2 py-1 text-xs font-bold">
                        {registrationStatus(record)}
                      </span>
                    </td>
                  </tr>
                ))}

                {!isLoading && filteredRecords.length === 0 ? (
                  <tr>
                    <td className="px-4 py-12 text-center text-(--sea-ink-soft)" colSpan={3}>
                      No ArNS records found.
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

function statusText({
  isLoading,
  visible,
}: {
  isLoading: boolean
  visible: number
}) {
  if (isLoading) {
    return 'Fetching names'
  }

  return `${formatNumber(visible)} visible`
}

function pageSummary({
  pageIndex,
  itemsPerPage,
  visible,
  totalItems,
}: {
  pageIndex: number
  itemsPerPage: number
  visible: number
  totalItems?: number
}) {
  if (visible === 0) {
    const totalText = totalItems == null ? '' : ` of ${formatNumber(totalItems)}`

    return `0${totalText}`
  }

  const first = pageIndex * itemsPerPage + 1
  const last = pageIndex * itemsPerPage + visible
  const totalText = totalItems == null ? '' : ` of ${formatNumber(totalItems)}`

  return `${formatNumber(first)}-${formatNumber(last)}${totalText}`
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en').format(value)
}

function formatName(name: string) {
  return name.length > 10 ? `${name.slice(0, 10)}...` : name
}

function registrationStatus(record: ArNSRecord) {
  return record.type === 'permabuy' ? 'Permanent' : 'Leased'
}
