import type { AddressTransactionsResult, Tag } from '#/types'

const addressTransactionsQuery = `
  query AddressTransactions($owners: [String!], $first: Int!, $after: String) {
    transactions(owners: $owners,tags: [{name:"App-Name", values:["AR-IO-Solana-Registration"]}, {name:"Action", values:["Register"]}] first: $first, after: $after, sort: HEIGHT_DESC) {
      edges {
        cursor
        node {
          id
          owner {
            address
          }
          tags {
            name
            value
          }
        }
      }
      pageInfo {
        hasNextPage
      }
    }
  }
`

const OWNER_BATCH_SIZE = 100
const TRANSACTION_PAGE_SIZE = 100

export async function fetchAddressStatuses(
  addresses: Array<string>,
  cachedStatuses: Record<string, boolean> = {},
): Promise<Record<string, boolean>> {
  const normalizedAddresses = Array.from(
    new Set(addresses.map((address) => address.trim()).filter(Boolean)),
  )

  if (normalizedAddresses.length === 0) {
    return {}
  }

  const statuses: Record<string, boolean> = Object.fromEntries(
    normalizedAddresses.map((address) => [
      address,
      cachedStatuses[address] ?? false,
    ]),
  )
  const addressesToFetch = normalizedAddresses.filter(
    (address) => statuses[address] === false,
  )

  for (
    let index = 0;
    index < addressesToFetch.length;
    index += OWNER_BATCH_SIZE
  ) {
    const owners = addressesToFetch.slice(index, index + OWNER_BATCH_SIZE)
    const batchStatuses = await fetchAddressStatusBatch(owners)

    Object.assign(statuses, batchStatuses)
  }

  return statuses
}

async function fetchAddressStatusBatch(
  owners: Array<string>,
): Promise<Record<string, boolean>> {
  const statuses: Record<string, boolean> = Object.fromEntries(
    owners.map((owner) => [owner, false]),
  )
  let after: string | undefined

  do {
    const result: AddressTransactionsResult = await fetchAddressTransactions(
      owners,
      after,
    )
    const edges = result.data?.transactions?.edges ?? []

    for (const edge of edges) {
      const owner = edge.node.owner?.address

      if (!owner || statuses[owner]) {
        continue
      }

      statuses[owner] = hasValidSolanaRegistration(edge.node.tags)
    }

    after = result.data?.transactions?.pageInfo?.hasNextPage
      ? edges.at(-1)?.cursor
      : undefined
  } while (after && owners.some((owner) => !statuses[owner]))

  return statuses
}

async function fetchAddressTransactions(
  owners: Array<string>,
  after?: string,
): Promise<AddressTransactionsResult> {
  const response = await fetch('https://ardrive.net/graphql', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      query: addressTransactionsQuery,
      variables: {
        owners,
        first: TRANSACTION_PAGE_SIZE,
        after,
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`Arweave GraphQL request failed with ${response.status}`)
  }

  const result: AddressTransactionsResult = await response.json()

  if (result.errors?.length) {
    const message = result.errors[0]?.message ?? 'Unknown GraphQL error'
    throw new Error(`Arweave GraphQL request failed: ${message}`)
  }

  return result
}

function hasValidSolanaRegistration(tags: Array<Tag>) {
  const solanaPubKey = tags.find((tag) => tag.name === 'Solana-Pubkey')
  const solanaSignature = tags.find((tag) => tag.name === 'Solana-Signature')

  return Boolean(solanaPubKey?.value.length && solanaSignature?.value.length)
}
