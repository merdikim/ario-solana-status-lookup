import { ARIO } from '@ar.io/sdk/web'

import type {
  ArNSRecord,
  FetchArNSNamesResult,
  OwnerDomainSummary,
  Tag,
} from '../types'

const namesPageLimit = 100
const ownerResolutionConcurrency = 25

export async function fetchArNSNames(): Promise<FetchArNSNamesResult> {
  const ario = ARIO.mainnet()
  const records: ArNSRecord[] = []
  let cursor: string | undefined
  let hasMore = true
  let totalItems = 0

  while (hasMore) {
    const page = await ario.getArNSRecords({
      cursor,
      limit: namesPageLimit,
      sortBy: 'name',
      sortOrder: 'asc',
    })

    records.push(...page.items)
    cursor = page.nextCursor
    hasMore = page.hasMore && cursor != null
    totalItems = page.totalItems
  }

  return {
    records,
    totalItems,
  }
}

export async function fetchArNSNameOwners(
  records: ArNSRecord[],
): Promise<ArNSRecord[]> {
  const ario = ARIO.mainnet()

  return await mapWithConcurrency(
    records,
    ownerResolutionConcurrency,
    async (record) => {
      const resolution = await ario
        .resolveArNSName({ name: record.name })
        .catch(() => undefined)

      return {
        ...record,
        owner: resolution?.owner,
      }
    },
  )
}

export function summarizeOwners(records: ArNSRecord[]): OwnerDomainSummary[] {
  const owners = new Map<NonNullable<ArNSRecord['owner']>, string[]>()

  for (const record of records) {
    if (record.owner == null) {
      continue
    }

    owners.set(record.owner, [...(owners.get(record.owner) ?? []), record.name])
  }

  return Array.from(owners, ([owner, names]) => ({
    owner,
    domainCount: names.length,
    names,
  })).sort((first, second) => {
    if (first.domainCount !== second.domainCount) {
      return second.domainCount - first.domainCount
    }

    return first.owner.localeCompare(second.owner)
  })
}

async function mapWithConcurrency<T, TResult>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<TResult>,
): Promise<TResult[]> {
  const results: TResult[] = []

  for (let index = 0; index < items.length; index += concurrency) {
    const chunk = items.slice(index, index + concurrency)
    const chunkResults = await Promise.all(chunk.map((item) => mapper(item)))

    results.push(...chunkResults)
  }

  return results
}

const addressTransactionsQuery = `
  query AddressTransactions($owners: [String!], $first: Int!, $after: String) {
    transactions(owners: $owners,tags: [{name:"App-Name", values:["AR-IO-Solana-Registration"]}, {name:"Action", values:["Register"]}] first: $first, after: $after, sort: HEIGHT_DESC) {
      edges {
        cursor
        node {
          id
          tags {
            name
            value
          }
        }
      }
    }
  }
`

export async function fetchAddressStatus(
  address: string,
): Promise<{ address: string; registrationStatus: boolean }> {
  const normalizedAddress = address.trim()

  if (normalizedAddress.length === 0) {
    throw new Error('Address is required')
  }

  const response = await fetch('https://turbo-gateway.com/graphql', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      query: addressTransactionsQuery,
      variables: {
        owners: [normalizedAddress],
        first: 100,
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`Arweave GraphQL request failed with ${response.status}`)
  }

  const result = await response.json()

  const edges = result.data?.transactions.edges ?? []
  const solanaPubKey = edges[0].node.tags.find(
    (tag: Tag) => tag.name == 'Solana-Pubkey',
  )
  const solanaSignature = edges[0].node.tags.find(
    (tag: Tag) => tag.name == 'Solana-Signature',
  )

  return {
    address,
    registrationStatus:
      solanaPubKey?.value.length > 0 && solanaSignature?.value.length > 0,
  }
}
