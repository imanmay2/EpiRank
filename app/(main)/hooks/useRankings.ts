import { useState, useEffect } from 'react'
import { Gene } from '../types/ranking'
import { getRankings } from '../services/epirankApi'

interface UseRankingsProps {
    region: string
    status: string
    limit: number
}

export const useRankings = ({ region, status, limit }: UseRankingsProps) => {
    const [data, setData] = useState<Gene[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [refreshKey, setRefreshKey] = useState(0)

    useEffect(() => {
        const fetchRankings = async () => {
            setIsLoading(true)
            try {
                const rankings = await getRankings({
                    region: region as 'all' | 'stg' | 'pfc',
                    status: status as 'all' | 'known' | 'novel',
                    limit,
                })
                setData(rankings)
                setError(null)
            } catch {
                setError('Failed to fetch rankings')
            } finally {
                setIsLoading(false)
            }
        }

        fetchRankings()
    }, [region, status, limit, refreshKey])

    const refetch = async () => {
        setRefreshKey((current) => current + 1)
    }

    return { data, isLoading, error, refetch }
}
