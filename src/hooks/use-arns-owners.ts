import { useQueries, useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchArNSNameOwners,
  fetchArNSNames,
  summarizeOwners,
} from '../lib/arns'
import type { ArNSRecord, FetchArNSNamesResult } from '../types'

const arnsNamesQueryKey = ['arns-names'] as const
const arnsNamesStorageKey = 'arns-names-cache-v1'
const arnsOwnerBatchQueryKey = ['arns-owner-batch'] as const
const ownerBatchSize = 100
const ownerBatchPauseMs = 60_000

export function useArNSOwners() {
  const [enabledBatchCount, setEnabledBatchCount] = useState(0)
  const [refreshNonce, setRefreshNonce] = useState(0)

  const namesQuery = useQuery<FetchArNSNamesResult>({
    queryKey: arnsNamesQueryKey,
    queryFn: () => fetchCachedArNSNames(),
    enabled: typeof window !== 'undefined',
    initialData: () => readCachedArNSNames(),
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
    gcTime: Infinity,
  })

  const recordBatches = useMemo(() => {
    return chunkRecords(namesQuery.data?.records ?? [], ownerBatchSize)
  }, [namesQuery.data?.records])

  useEffect(() => {
    if (recordBatches.length === 0) {
      setEnabledBatchCount(0)
      return undefined
    }

    setEnabledBatchCount(1)

    const interval = window.setInterval(() => {
      setEnabledBatchCount((current) => {
        if (current >= recordBatches.length) {
          window.clearInterval(interval)
          return current
        }

        return current + 1
      })
    }, ownerBatchPauseMs)

    return () => window.clearInterval(interval)
  }, [recordBatches.length, refreshNonce])

  const ownerBatchQueries = useQueries({
    queries: recordBatches.map((batch, index) => ({
      queryKey: [
        ...arnsOwnerBatchQueryKey,
        refreshNonce,
        batch.map((record) => record.name),
      ],
      queryFn: () => fetchArNSNameOwners(batch),
      enabled:
        typeof window !== 'undefined' &&
        batch.length > 0 &&
        index < enabledBatchCount,
      staleTime: Infinity,
      gcTime: Infinity,
    })),
  })

  const resolvedRecords = useMemo(() => {
    return ownerBatchQueries.flatMap((batchQuery) => batchQuery.data ?? [])
  }, [ownerBatchQueries])

  const owners = useMemo(
    () => summarizeOwners(resolvedRecords),
    [resolvedRecords],
  )
  const ownedNamesCount = useMemo(() => {
    return resolvedRecords.filter((record) => record.owner != null).length
  }, [resolvedRecords])
  const unresolvedCount = useMemo(() => {
    return resolvedRecords.filter((record) => record.owner == null).length
  }, [resolvedRecords])
  const currentBatchIndex = Math.min(
    Math.max(enabledBatchCount - 1, 0),
    Math.max(recordBatches.length - 1, 0),
  )
  const currentBatch =
    recordBatches.length === 0 ? [] : recordBatches[currentBatchIndex]
  const currentBatchStart =
    recordBatches.length === 0
      ? undefined
      : currentBatchIndex * ownerBatchSize + 1
  const currentBatchEnd =
    currentBatchStart == null || namesQuery.data?.records.length == null
      ? undefined
      : Math.min(
          currentBatchStart + currentBatch.length - 1,
          namesQuery.data.records.length,
        )
  const isWaitingForOwnerBatch =
    recordBatches.length > 0 && enabledBatchCount < recordBatches.length
  const isFetchComplete =
    namesQuery.data?.records.length != null &&
    resolvedRecords.length >= namesQuery.data.records.length &&
    !isWaitingForOwnerBatch
  const isLoading =
    namesQuery.isPending ||
    ownerBatchQueries.some((batchQuery) => batchQuery.isPending)
  const isFetchingNames = namesQuery.isPending || namesQuery.isFetching
  const isFetching =
    namesQuery.isFetching ||
    ownerBatchQueries.some((batchQuery) => batchQuery.isFetching) ||
    isWaitingForOwnerBatch
  const isFetchingOwners =
    ownerBatchQueries.some(
      (batchQuery) => batchQuery.isPending || batchQuery.isFetching,
    ) || isWaitingForOwnerBatch
  const error =
    namesQuery.error?.message ??
    ownerBatchQueries.find((batchQuery) => batchQuery.error != null)?.error
      .message ??
    null

  const refetchOwners = useCallback(() => {
    if (recordBatches.length === 0) {
      void namesQuery.refetch()
      return
    }

    setRefreshNonce((current) => current + 1)
  }, [namesQuery, recordBatches.length])

  return {
    owners,
    error,
    isFetchComplete,
    isFetching,
    isFetchingNames,
    isFetchingOwners,
    isLoading,
    ownedNamesCount,
    progress: {
      currentBatch: currentBatchIndex + 1,
      currentBatchEnd,
      currentBatchStart,
      currentName:
        recordBatches.length === 0 ? undefined : currentBatch[0].name,
      totalBatches: recordBatches.length,
    },
    refetchOwners,
    resolvedNames: resolvedRecords.length,
    totalNames: namesQuery.data?.records.length,
    unresolvedCount,
  }
}

function chunkRecords(records: ArNSRecord[], size: number) {
  const chunks: ArNSRecord[][] = []

  for (let index = 0; index < records.length; index += size) {
    chunks.push(records.slice(index, index + size))
  }

  return chunks
}

function readCachedArNSNames() {
  if (typeof window === 'undefined') {
    return undefined
  }

  const cached = window.localStorage.getItem(arnsNamesStorageKey)

  if (cached == null) {
    return undefined
  }

  try {
    return JSON.parse(cached) as FetchArNSNamesResult
  } catch {
    window.localStorage.removeItem(arnsNamesStorageKey)
    return undefined
  }
}

async function fetchCachedArNSNames() {
  const cachedNames = readCachedArNSNames()

  if (cachedNames != null) {
    return cachedNames
  }

  const result = await fetchArNSNames()

  return writeCachedArNSNames(result)
}

function writeCachedArNSNames(result: FetchArNSNamesResult) {
  if (typeof window === 'undefined') {
    return result
  }

  try {
    window.localStorage.setItem(arnsNamesStorageKey, JSON.stringify(result))
  } catch {
    window.localStorage.removeItem(arnsNamesStorageKey)
  }

  return result
}
