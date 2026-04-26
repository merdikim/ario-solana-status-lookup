import type { AoArNSNameDataWithName, PaginationResult } from '@ar.io/sdk/web'

export type ArNSRecord = AoArNSNameDataWithName

export type FetchArNSProgress = {
  loaded: number
  page: number
  totalItems?: number
}

export type FetchAllArNSNamesOptions = {
  limit?: number
  onProgress?: (progress: FetchArNSProgress) => void
}

export type FetchAllArNSNamesResult = {
  records: ArNSRecord[]
  totalItems?: number
  pages: number
}

export async function fetchAllArNSNames({
  limit = 100,
  onProgress,
}: FetchAllArNSNamesOptions = {}): Promise<FetchAllArNSNamesResult> {
  const { ARIO } = await import('@ar.io/sdk/web')
  const ario = ARIO.mainnet()
  const records: ArNSRecord[] = []
  const seenCursors = new Set<string>()

  let cursor: string | undefined
  let totalItems: number | undefined
  let pages = 0
  let hasMore = true

  while (hasMore) {
    const page: PaginationResult<ArNSRecord> = await ario.getArNSRecords({
      cursor,
      limit,
      sortBy: 'name',
      sortOrder: 'asc',
    })

    pages += 1
    records.push(...page.items)
    totalItems = page.totalItems
    onProgress?.({ loaded: records.length, page: pages, totalItems })

    hasMore = page.hasMore && page.nextCursor != null

    if (!hasMore) {
      continue
    }

    if (seenCursors.has(page.nextCursor)) {
      throw new Error(`ArNS pagination repeated cursor "${page.nextCursor}"`)
    }

    seenCursors.add(page.nextCursor)
    cursor = page.nextCursor
  }

  return { records, totalItems, pages }
}
