import type { Tag } from '#/types'

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
