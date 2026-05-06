export type Tag = {
  name: string
  value: string
}

export type Owner = {
  address: string
  names: Array<string>
  status?: boolean
}

type TransactionEdge = {
  cursor: string
  node: {
    owner?: {
      address?: string
    }
    tags: Array<Tag>
  }
}

export type AddressTransactionsResult = {
  data?: {
    transactions?: {
      edges?: Array<TransactionEdge>
      pageInfo?: {
        hasNextPage?: boolean
      }
    }
  }
  errors?: Array<{ message?: string }>
}
