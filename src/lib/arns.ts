import { ARIO } from '@ar.io/sdk/web'

import type {
  FetchArNSNamesPageOptions,
  FetchArNSNamesPageResult,
  Tag,
} from '../types'

export async function fetchArNSNamesPage({
  cursor,
  limit = 100,
}: FetchArNSNamesPageOptions = {}): Promise<FetchArNSNamesPageResult> {
  const ario = ARIO.mainnet()

  const page = await ario.getArNSRecords({
    cursor,
    limit,
    sortBy: 'name',
    sortOrder: 'asc',
  })

  const items = await Promise.all(
    page.items.map(async (record) => {
      const resolution = await ario
        .resolveArNSName({ name: record.name })
        .catch(() => undefined)

      return {
        ...record,
        owner: resolution?.owner,
      }
    }),
  )

  return {
    ...page,
    items,
  }
}

const addressTransactionsQuery = `
  query AddressTransactions($owners: [String!], $first: Int!, $after: String) {
    transactions(owners: $owners,tags: [{name:"App-Name", values:["AR-IO-Solana-Registration"]}] first: $first, after: $after, sort: HEIGHT_DESC) {
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
): Promise<{address:string, registrationStatus:boolean}> {
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
  const solanaPubKey = edges[0].node.tags.find((tag:Tag) => tag.name == "Solana-Pubkey")
  const solanaSignature = edges[0].node.tags.find((tag:Tag) => tag.name == "Solana-Signature")

  return {
    address,
    registrationStatus: (solanaPubKey?.value.length > 0 && solanaSignature?.value.length > 0)
  }
}
