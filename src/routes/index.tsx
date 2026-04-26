import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { AlertCircle, ExternalLink, RefreshCw, Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { fetchAllArNSNames } from '../lib/arns'
import type { FetchAllArNSNamesResult, FetchArNSProgress } from '../lib/arns'

export const Route = createFileRoute('/')({ component: Home })

const arnsRecordsQueryKey = ['arns-records'] as const

const dateFormatter = new Intl.DateTimeFormat('en', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function Home() {
  const [progress, setProgress] = useState<FetchArNSProgress | null>(null)
  const [query, setQuery] = useState('')

  const arnsRecordsQuery = useQuery<FetchAllArNSNamesResult>({
    queryKey: arnsRecordsQueryKey,
    queryFn: async () => {
      setProgress({ loaded: 0, page: 0 })

      const result = await fetchAllArNSNames({
        limit: 100,
        onProgress: setProgress,
      })

      setProgress({
        loaded: result.records.length,
        page: result.pages,
        totalItems: result.totalItems,
      })

      return result
    },
    enabled: typeof window !== 'undefined',
    staleTime: 60_000,
  })

  const records = arnsRecordsQuery.data?.records ?? []
  const isLoading = arnsRecordsQuery.isPending || arnsRecordsQuery.isFetching
  const error = arnsRecordsQuery.error?.message ?? null

  const filteredRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    if (normalizedQuery.length === 0) {
      return records
    }

    return records.filter((record) => {
      return (
        record.name.toLowerCase().includes(normalizedQuery) ||
        record.processId.toLowerCase().includes(normalizedQuery) ||
        record.type.includes(normalizedQuery)
      )
    })
  }, [query, records])

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="display-title mt-2 text-4xl font-bold text-(--sea-ink) sm:text-5xl">
              ArNS Registry
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
              <span>{statusText({ isLoading, progress, visible: filteredRecords.length })}</span>
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

          <div className="max-h-[68vh] overflow-auto">
            <table className="w-full min-w-245 border-collapse text-left text-sm">
              <thead className="sticky top-0 z-10 bg-(--surface-strong) text-xs font-bold tracking-[0.08em] text-(--sea-ink-soft) uppercase backdrop-blur">
                <tr>
                  <Th>Name</Th>
                  <Th>Type</Th>
                  <Th>Process ID</Th>
                  <Th>Started</Th>
                  <Th>Expires</Th>
                  <Th>Undernames</Th>
                  <Th>Purchase Price</Th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr
                    className="border-t border-(--line) transition hover:bg-white/45"
                    key={`${record.name}-${record.processId}`}
                  >
                    <td className="px-4 py-3 align-top">
                      <a
                        className="inline-flex max-w-52 items-center gap-2 truncate font-bold"
                        href={`https://${record.name}.ar.io`}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <span className="truncate">{record.name}</span>
                        <ExternalLink className="size-3.5 shrink-0" />
                      </a>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className="rounded-sm border border-(--chip-line) bg-(--chip-bg) px-2 py-1 text-xs font-bold">
                        {record.type}
                      </span>
                    </td>
                    <td className="max-w-80 px-4 py-3 align-top font-mono text-xs break-all text-(--sea-ink-soft)">
                      {record.processId}
                    </td>
                    <td className="px-4 py-3 align-top whitespace-nowrap">
                      {formatTimestamp(record.startTimestamp)}
                    </td>
                    <td className="px-4 py-3 align-top whitespace-nowrap">
                      {formatTimestamp(record.endTimestamp)}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {formatNumber(record.undernameLimit)}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {formatOptionalNumber(record.purchasePrice)}
                    </td>
                  </tr>
                ))}

                {!isLoading && filteredRecords.length === 0 ? (
                  <tr>
                    <td className="px-4 py-12 text-center text-(--sea-ink-soft)" colSpan={7}>
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="island-shell rounded-lg p-4">
      <p className="text-xs font-bold tracking-[0.12em] text-(--sea-ink-soft) uppercase">
        {label}
      </p>
      <p className="mt-2 text-3xl font-extrabold text-(--sea-ink)">{value}</p>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3">{children}</th>
}

function statusText({
  isLoading,
  progress,
  visible,
}: {
  isLoading: boolean
  progress: FetchArNSProgress | null
  visible: number
}) {
  if (isLoading) {
    const loaded = progress?.loaded ?? 0
    const total = progress?.totalItems
    const totalText = total == null ? '' : ` of ${formatNumber(total)}`

    return `Fetching ${formatNumber(loaded)}${totalText} names`
  }

  return `${formatNumber(visible)} visible`
}

function formatTimestamp(timestamp?: number) {
  if (timestamp == null) {
    return 'Permanent'
  }

  return dateFormatter.format(new Date(timestamp))
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en').format(value)
}

function formatOptionalNumber(value?: number) {
  return value == null ? 'Unknown' : formatNumber(value)
}
