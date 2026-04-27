import type {
  AoArNSNameDataWithName,
  ArNSNameResolutionData,
  PaginationResult,
} from '@ar.io/sdk/web'

export type ArNSRecord = AoArNSNameDataWithName & {
  endTimestamp?: number
  owner?: ArNSNameResolutionData['owner']
}

export type FetchArNSNamesPageOptions = {
  cursor?: string
  limit?: number
}

export type FetchArNSNamesPageResult = PaginationResult<ArNSRecord>

export type Tag = {
  name:string
  value:string
}
