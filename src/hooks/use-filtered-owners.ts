import { useMemo } from 'react'
import type { OwnerDomainSummary } from '../types'

export function useFilteredOwners(owners: OwnerDomainSummary[], query: string) {
  return useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    if (normalizedQuery.length === 0) {
      return owners
    }

    return owners.filter((owner) => {
      return owner.owner.toLowerCase().includes(normalizedQuery)
    })
  }, [owners, query])
}
