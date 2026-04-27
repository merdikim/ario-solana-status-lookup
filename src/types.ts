import type {
  AoArNSNameDataWithName,
  ArNSNameResolutionData,
} from '@ar.io/sdk/web'

export type ArNSRecord = AoArNSNameDataWithName & {
  endTimestamp?: number
  owner?: ArNSNameResolutionData['owner']
}

export type OwnerDomainSummary = {
  owner: NonNullable<ArNSRecord['owner']>
  domainCount: number
  names: string[]
}

export type FetchArNSNamesResult = {
  records: ArNSRecord[]
  totalItems: number
}

// export type FetchArNSOwnersResult = {
//   owners: OwnerDomainSummary[]
//   records: ArNSRecord[]
//   totalItems: number
//   unresolvedCount: number
// }

export type Tag = {
  name: string
  value: string
}
