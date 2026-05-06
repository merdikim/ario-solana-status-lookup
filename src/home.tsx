import {
  AlertCircle,
  CheckCircle,
  LoaderCircle,
  RefreshCw,
  Search,
  TriangleAlert,
  X,
} from 'lucide-react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import type { Owner } from './types'
import { fetchAddressStatuses } from './lib/arns'
import { cn } from './lib/utils'

const STATUS_BATCH_SIZE = 50

export function Home() {
  const [query, setQuery] = useState('')
  const {
    isFetching,
    isLoading,
    isError,
    error,
    data: nameOwners,
    refetch: refetchOwners,
  } = useQuery<Array<Owner>>({
    queryKey: ['arns-owners-status'],
    queryFn: async () => {
      const result = await fetch('/nameowners.json')
      const owners = await result.json()
      return owners
    },
  })
  const ownerAddresses = useMemo(
    () => nameOwners?.map((owner) => owner.address) ?? [],
    [nameOwners],
  )
  const cachedOwnerStatuses = useMemo(
    () =>
      Object.fromEntries(
        nameOwners
          ?.filter((owner) => typeof owner.status === 'boolean')
          .map((owner) => [owner.address, owner.status]) ?? [],
      ) as Record<string, boolean>,
    [nameOwners],
  )
  const addressesToFetch = useMemo(
    () =>
      nameOwners
        ?.filter((owner) => owner.status !== true)
        .map((owner) => owner.address) ?? [],
    [nameOwners],
  )
  const statusBatches = useMemo(
    () => chunkAddresses(addressesToFetch, STATUS_BATCH_SIZE),
    [addressesToFetch],
  )
  const statusQueries = useQueries({
    queries: statusBatches.map((addresses) => ({
      queryKey: ['arns-owner-statuses', addresses],
      queryFn: () => fetchAddressStatuses(addresses, cachedOwnerStatuses),
      enabled: addresses.length > 0,
      staleTime: 5 * 60 * 1000,
    })),
  })
  const addressesBeingFetched = useMemo(
    () =>
      new Set(
        statusQueries.flatMap((statusQuery, index) =>
          statusQuery.isFetching ? statusBatches[index] : [],
        ),
      ),
    [statusBatches, statusQueries],
  )
  const addressesWithStatusErrors = useMemo(
    () =>
      new Set(
        statusQueries.flatMap((statusQuery, index) =>
          statusQuery.isError ? statusBatches[index] : [],
        ),
      ),
    [statusBatches, statusQueries],
  )
  const isStatusFetching = statusQueries.some(
    (statusQuery) => statusQuery.isFetching,
  )
  const statusError = statusQueries.find(
    (statusQuery) => statusQuery.error,
  )?.error
  const ownerStatuses = useMemo(
    () =>
      Object.assign(
        {},
        cachedOwnerStatuses,
        ...statusQueries.map((statusQuery) => statusQuery.data ?? {}),
      ) as Record<string, boolean>,
    [cachedOwnerStatuses, statusQueries],
  )
  const registeredAddressCount = useMemo(() => {
    return ownerAddresses.filter((address) => ownerStatuses[address]).length
  }, [ownerAddresses, ownerStatuses])
  const registrationCompletion =
    ownerAddresses.length > 0
      ? Math.round((registeredAddressCount / ownerAddresses.length) * 100)
      : 0
  const normalizedQuery = query.trim().toLowerCase()
  const filteredNameOwners = useMemo(() => {
    if (!nameOwners || normalizedQuery.length === 0) {
      return nameOwners
    }

    return nameOwners.filter((owner) => {
      const addressMatches = owner.address
        .toLowerCase()
        .includes(normalizedQuery)
      const nameMatches = owner.names.some((name) =>
        name.toLowerCase().includes(normalizedQuery),
      )

      return addressMatches || nameMatches
    })
  }, [nameOwners, normalizedQuery])

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="display-title mt-2 text-xl font-bold text-(--sea-ink) sm:text-2xl">
              ArNS Registration Status
            </h1>
          </div>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-(--sea-ink) px-4 text-sm font-bold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading || isFetching || isStatusFetching}
            onClick={() => {
              void refetchOwners()
              void Promise.all(
                statusQueries.map((statusQuery) => statusQuery.refetch()),
              )
            }}
            type="button"
          >
            <RefreshCw className="size-4" />
            Refresh
          </button>
        </header>

        <section className="island-shell overflow-hidden rounded-lg">
          <div className="flex flex-col gap-4 border-b border-(--line) p-4 lg:flex-row lg:items-center lg:justify-between">
            {isError ? (
              <span className="inline-flex items-center gap-2 font-semibold text-red-700">
                <AlertCircle className="size-4" />
                {error.message}
              </span>
            ) : null}
            {statusError ? (
              <span className="inline-flex items-center gap-2 font-semibold text-red-700">
                <AlertCircle className="size-4" />
                {statusError.message}
              </span>
            ) : null}

            <div className="flex min-w-0 flex-1 flex-col gap-3 text-sm text-(--sea-ink-soft) lg:flex-row lg:items-center">
              <div className="flex w-full min-w-48 max-w-96 flex-col gap-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">
                    Registered:{' '}
                    <span className="font-bold text-(--sea-ink)">
                      {formatNumber(registeredAddressCount)}
                    </span>{' '}
                    of {formatNumber(ownerAddresses.length)}
                  </span>
                  <span className="font-bold text-(--sea-ink)">
                    {registrationCompletion}%
                  </span>
                </div>
                <progress
                  aria-label="Registration completion"
                  className="h-2 w-full overflow-hidden rounded-full [&::-moz-progress-bar]:bg-(--lagoon-deep) [&::-webkit-progress-bar]:bg-(--line) [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-value]:bg-(--lagoon-deep) [&::-webkit-progress-value]:rounded-full"
                  max={100}
                  value={registrationCompletion}
                />
              </div>
            </div>

            <label className="relative block w-full lg:w-80">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-(--sea-ink-soft)" />
              <input
                className="h-11 w-full rounded-md border border-(--line) bg-(--surface-strong) pr-3 pl-10 text-sm font-medium outline-none transition focus:border-(--lagoon-deep) focus:ring-2 focus:ring-[rgba(50,143,151,0.18)]"
                disabled={isFetching || isLoading}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search owners"
                type="search"
                value={query}
              />
            </label>
          </div>

          <div className="max-h-[68vh] overflow-auto">
            <table className="w-full min-w-160 border-collapse text-left text-xs">
              <thead className="sticky top-0 z-10 bg-(--surface-strong) font-bold tracking-[0.08em] text-(--sea-ink-soft) uppercase backdrop-blur">
                <tr>
                  <Th label="Owner" />
                  <Th label="Domains" />
                  <Th label="Status" textEnd />
                </tr>
              </thead>
              <tbody>
                {isLoading && <OwnerTableSkeleton />}
                {filteredNameOwners?.length === 0 ? (
                  <tr>
                    <td
                      className="w-full px-4 py-12 text-center text-(--sea-ink-soft)"
                      colSpan={3}
                    >
                      {normalizedQuery.length > 0
                        ? 'No owners match your search.'
                        : 'No owners found.'}
                    </td>
                  </tr>
                ) : (
                  <>
                    {filteredNameOwners?.map((owner) => (
                      <Tr
                        isStatusError={addressesWithStatusErrors.has(
                          owner.address,
                        )}
                        isStatusLoading={
                          isStatusFetching &&
                          addressesBeingFetched.has(owner.address) &&
                          ownerStatuses[owner.address] !== true
                        }
                        key={owner.address}
                        owner={owner}
                        status={getOwnerStatus(owner, ownerStatuses)}
                      />
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}

function Th({ label, textEnd = false }: { label: string; textEnd?: boolean }) {
  return <th className={cn(textEnd && 'text-end', 'px-4 py-3')}>{label}</th>
}

function Tr({
  isStatusError,
  isStatusLoading,
  owner,
  status,
}: {
  isStatusError: boolean
  isStatusLoading: boolean
  owner: Owner
  status?: boolean
}) {
  return (
    <tr
      className="border-t border-(--line) transition hover:bg-white/45"
      key={owner.address}
    >
      <td className="max-w-160 px-4 py-3 align-top font-mono break-all text-(--sea-ink-soft)">
        {owner.address}
      </td>
      <td className="px-4 py-3 align-top">
        <span className="rounded-sm border border-(--chip-line) bg-(--chip-bg) px-2 py-1 font-bold">
          {formatNumber(owner.names.length)}
        </span>
      </td>
      <td className="px-4 py-3 text-right align-top">
        <StatusBadge
          isError={isStatusError}
          isLoading={isStatusLoading}
          status={status}
        />
      </td>
    </tr>
  )
}

function StatusBadge({
  isError,
  isLoading,
  status,
}: {
  isError: boolean
  isLoading: boolean
  status?: boolean
}) {
  if (isLoading) {
    return (
      <span className="inline-flex min-w-28 items-center justify-center gap-1.5 rounded-md border border-(--line) bg-(--surface-strong) px-2.5 py-1 text-xs font-bold text-(--sea-ink-soft)">
        <LoaderCircle className="size-3.5 animate-spin" />
        Checking
      </span>
    )
  }

  if (isError) {
    return (
      <span className="inline-flex min-w-28 items-center justify-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">
        <TriangleAlert className="size-3.5" />
        Error
      </span>
    )
  }

  if (status === true) {
    return (
      <span className="inline-flex min-w-28 items-center justify-center gap-1.5 rounded-md border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-bold text-green-700">
        <CheckCircle className="size-3.5" />
        Registered
      </span>
    )
  }

  if (status === false) {
    return (
      <span className="inline-flex min-w-28 items-center justify-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">
        <X className="size-3.5" />
        Missing
      </span>
    )
  }

  return (
    <span className="inline-flex min-w-28 items-center justify-center rounded-md border border-(--line) bg-(--surface-strong) px-2.5 py-1 text-xs font-bold text-(--sea-ink-soft)">
      Unknown
    </span>
  )
}

function OwnerTableSkeleton() {
  return Array.from({ length: 8 }, (_, index) => (
    <tr className="border-t border-(--line)" key={index}>
      <td className="max-w-160 px-4 py-3 align-top">
        <div
          className="h-4 animate-pulse rounded-sm bg-(--line)"
          style={{ width: `${70 + (index % 3) * 8}%` }}
        />
      </td>
      <td className="px-4 py-3 align-top">
        <div className="h-7 w-16 animate-pulse rounded-sm border border-(--chip-line) bg-(--line)" />
      </td>
      <td className="px-4 py-3 text-right align-top">
        <div className="ml-auto size-5 animate-pulse rounded-full bg-(--line)" />
      </td>
    </tr>
  ))
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en').format(value)
}

function getOwnerStatus(
  owner: Owner,
  ownerStatuses: Partial<Record<string, boolean>>,
) {
  return ownerStatuses[owner.address] ?? owner.status ?? false
}

function chunkAddresses(addresses: Array<string>, chunkSize: number) {
  const chunks: Array<Array<string>> = []

  for (let index = 0; index < addresses.length; index += chunkSize) {
    chunks.push(addresses.slice(index, index + chunkSize))
  }

  return chunks
}
