import {
  AlertCircle,
  CheckCircle,
  LoaderCircle,
  RefreshCw,
  Search,
  TriangleAlert,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import type { Owner } from './types'
import { fetchAddressStatus } from './lib/arns'
import { cn } from './lib/utils'

export function Home() {
  const [query, setQuery] = useState('')
  const {
    isFetching,
    isLoading,
    isError,
    error,
    data: nameOwners,
    refetch,
  } = useQuery<Array<Owner>>({
    queryKey: ['arns-owners-status'],
    queryFn: async () => {
      const result = await fetch('/nameowners.json')
      const { owners } = await result.json()
      return owners
    },
  })

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
            disabled={isLoading || isFetching}
            onClick={() => refetch()}
            type="button"
          >
            <RefreshCw className="size-4" />
            Refresh
          </button>
        </header>

        <section className="island-shell overflow-hidden rounded-lg">
          <div className="flex flex-col gap-4 border-b border-(--line) p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3 text-sm text-(--sea-ink-soft)">
              {isError ? (
                <span className="inline-flex items-center gap-2 font-semibold text-red-700">
                  <AlertCircle className="size-4" />
                  {error.message}
                </span>
              ) : null}
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
            <table className="w-full min-w-160 border-collapse text-left text-sm">
              <thead className="sticky top-0 z-10 bg-(--surface-strong) text-xs font-bold tracking-[0.08em] text-(--sea-ink-soft) uppercase backdrop-blur">
                <tr>
                  <Th label="Owner" />
                  <Th label="Domains Owned" />
                  <Th label="Status" textEnd />
                </tr>
              </thead>
              <tbody>
                {isLoading && <OwnerTableSkeleton />}
                {nameOwners?.length === 0 ? (
                  <tr>
                    <td
                      className="px-4 py-12 text-center w-full text-(--sea-ink-soft)"
                      colSpan={2}
                    >
                      No owners found.
                    </td>
                  </tr>
                ) : (
                  <>
                    {nameOwners?.map((owner) => (
                      <Tr owner={owner} />
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

function Tr({ owner }: { owner: Owner }) {
  const {
    isLoading,
    isError,
    data: status,
  } = useQuery<boolean>({
    queryKey: ['arns-owner-status', owner.address],
    queryFn: async () => {
      const result = await fetchAddressStatus(owner.address)
      return result.registrationStatus
    },
  })

  return (
    <tr
      className="border-t border-(--line) transition hover:bg-white/45"
      key={owner.address}
    >
      <td className="max-w-160 px-4 py-3 align-top font-mono text-xs break-all text-(--sea-ink-soft)">
        {owner.address}
      </td>
      <td className="px-4 py-3 align-top">
        <span className="rounded-sm border border-(--chip-line) bg-(--chip-bg) px-2 py-1 text-xs font-bold">
          {formatNumber(owner.names.length)}
        </span>
      </td>
      <td className="px-4 py-3 flex items-center justify-end">
        {isLoading && <LoaderCircle />}
        {isError && <TriangleAlert color="red" />}
        {status && <CheckCircle color="green" />}
      </td>
    </tr>
  )
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

function formatNumber(value: number) {
  return new Intl.NumberFormat('en').format(value)
}
