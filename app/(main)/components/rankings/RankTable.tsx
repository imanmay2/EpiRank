'use client'

import { motion } from 'framer-motion'
import { Gene } from '../../types/ranking'
import StatusBadge from './StatusBadge'
import TopFeatures from './TopFeatures'
import {
    ArrowUpIcon,
    ArrowDownIcon,
    ArrowsUpDownIcon,
    InformationCircleIcon
} from '@heroicons/react/24/outline'
import { useState } from 'react'

interface RankTableProps {
    data: Gene[]
    isLoading: boolean
    onGeneClick: (gene: Gene) => void
}

type SortField = 'rank' | 'gene' | 'score' | 'chromosome' | 'degree' | 'status' | 'top_features'
type SortDirection = 'asc' | 'desc'

const RankTable: React.FC<RankTableProps> = ({ data, isLoading, onGeneClick }) => {
    const [sortField, setSortField] = useState<SortField>('rank')
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
        } else {
            setSortField(field)
            setSortDirection('asc')
        }
    }

    const sortedData = [...data].sort((a, b) => {
        const multiplier = sortDirection === 'asc' ? 1 : -1

        switch (sortField) {
            case 'rank':
                return (a.rank - b.rank) * multiplier
            case 'gene':
                return a.gene.localeCompare(b.gene) * multiplier
            case 'score':
                return (a.score - b.score) * multiplier
            case 'chromosome':
                return a.chromosome.localeCompare(b.chromosome) * multiplier
            case 'degree':
                return (a.network_degree - b.network_degree) * multiplier
            default:
                return 0
        }
    })

    const getRowId = (gene: Gene) => {
        const geneWithRegion = gene as Gene & { region?: string }
        const region = geneWithRegion.region ?? 'NA'
        return `${gene.gene}-${region}-${gene.chromosome}-${gene.rank}`
    }

    type Column =
        { field: SortField; label: string; width: string }

    const columns: Column[] = [
        { field: 'rank', label: 'Rank', width: 'w-20' },
        { field: 'gene', label: 'Gene', width: 'w-24' },
        { field: 'score', label: 'Score', width: 'w-24' },
        { field: 'status', label: 'Status', width: 'w-24' },
        { field: 'chromosome', label: 'Chr', width: 'w-20' },
        { field: 'degree', label: 'Degree', width: 'w-24' },
        { field: 'top_features', label: 'Top Features', width: 'flex-1' }, // This works now
    ]

    if (isLoading) {
        return (
            <div className="p-8 flex items-center justify-center">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-xl animate-pulse" />
                </div>
            </div>
        )
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead className="border-b border-white/20 bg-white/5">
                    <tr className="group relative cursor-pointer border-b border-white/10 hover:bg-white/10 transition-colors">
                        {columns.map((col) => (
                            <th
                                key={col.field || col.label}
                                className={`${col.width} py-3 px-4 text-left`}
                            >
                                {col.field ? (
                                    <button
                                        onClick={() => handleSort(col.field)}
                                        className="flex items-center space-x-1 text-xs font-medium text-slate-400 hover:text-white transition-colors group"
                                    >
                                        <span>{col.label}</span>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                            {sortField === col.field ? (
                                                sortDirection === 'asc' ? (
                                                    <ArrowUpIcon className="w-3 h-3" />
                                                ) : (
                                                    <ArrowDownIcon className="w-3 h-3" />
                                                )
                                            ) : (
                                                <ArrowsUpDownIcon className="w-3 h-3" />
                                            )}
                                        </div>
                                    </button>
                                ) : (
                                    <span className="text-xs font-medium text-slate-400">{col.label}</span>
                                )}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {sortedData.map((gene, index) => (
                        <motion.tr
                            key={getRowId(gene)}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                            onClick={() => onGeneClick(gene)}
                            className="group relative cursor-pointer border-b border-white/5 hover:border-white/20 transition-colors"
                        >
                            {/* Row glow effect
                            {hoveredRow === gene.gene && (
                                <motion.div
                                    layoutId="rowGlow"
                                    className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                />
                            )} */}

                            {/* Rank cell with medal for top 3 */}
                            <td className="py-3 px-4">
                                <div className="flex items-center">
                                    {gene.rank <= 3 ? (
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                      ${gene.rank === 1 ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-yellow-900' :
                                                gene.rank === 2 ? 'bg-gradient-to-r from-slate-300 to-slate-400 text-slate-700' :
                                                    'bg-gradient-to-r from-amber-600 to-amber-700 text-amber-100'}`}
                                        >
                                            {gene.rank}
                                        </div>
                                    ) : (
                                        <span className="text-sm text-slate-400 font-mono">#{gene.rank}</span>
                                    )}
                                </div>
                            </td>

                            {/* Gene name */}
                            <td className="py-3 px-4">
                                <div className="flex items-center space-x-2">
                                    <span className="text-sm font-medium text-white group-hover:text-blue-400">
                                        {gene.gene}
                                    </span>
                                    <InformationCircleIcon className="w-4 h-4 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </td>

                            {/* Score with progress bar */}
                            <td className="py-3 px-4">
                                <div className="flex items-center space-x-2">
                                    <span className="text-sm font-mono text-white">{gene.score.toFixed(3)}</span>
                                    <div className="w-12 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full bg-gradient-to-r from-blue-400 to-purple-400"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${gene.score * 100}%` }}
                                            transition={{ duration: 1, delay: index * 0.1 }}
                                        />
                                    </div>
                                </div>
                            </td>

                            {/* Status badge */}
                            <td className="py-3 px-4">
                                <StatusBadge status={gene.status} />
                            </td>

                            {/* Chromosome */}
                            <td className="py-3 px-4">
                                <span className="text-sm font-mono text-slate-400">{gene.chromosome}</span>
                            </td>

                            {/* Network degree */}
                            <td className="py-3 px-4">
                                <span className="text-sm text-slate-300">{gene.network_degree}</span>
                            </td>

                            {/* Top features */}
                            <td className="py-3 px-4">
                                <TopFeatures features={gene.top_features} />
                            </td>
                        </motion.tr>
                    ))}
                </tbody>
            </table>

            {data.length === 0 && (
                <div className="p-12 text-center">
                    <p className="text-slate-400">No genes found matching your criteria</p>
                </div>
            )}
        </div>
    )
}

export default RankTable
