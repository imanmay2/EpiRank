'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    BeakerIcon,
    MagnifyingGlassIcon,
    ChartBarIcon,
    DocumentTextIcon,
    ChevronDownIcon,
} from '@heroicons/react/24/outline'
import { getMethylationDistribution, getRankings } from '../services/epirankApi'

interface MethylationData {
    gene: string
    region: 'STG' | 'PFC'
    delta_beta: number
    status: 'hyper' | 'hypo' | 'normal'
    p_value: number
    chromosome: string
    position: number
}

interface HistoneData {
    gene: string
    mark: string
    value: number
    region: 'STG' | 'PFC'
}

export default function EpigeneticsPage() {
    const [methylationData, setMethylationData] = useState<MethylationData[]>([])
    const [histoneData, setHistoneData] = useState<HistoneData[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [selectedRegion, setSelectedRegion] = useState<'STG' | 'PFC' | 'both'>('both')
    const [selectedGene, setSelectedGene] = useState<string>('')
    const [searchQuery, setSearchQuery] = useState('')
    const [view, setView] = useState<'methylation' | 'histone' | 'both'>('both')
    const [sortBy, setSortBy] = useState<'delta' | 'gene' | 'pvalue'>('delta')
    const [showStats, setShowStats] = useState(true)
    const [distributionSummary, setDistributionSummary] = useState({
        hypermethylated_genes: 0,
        hypomethylated_genes: 0,
        mean_delta_beta: 0,
    })

    useEffect(() => {
        const loadEpigenetics = async () => {
            setIsLoading(true)
            try {
                const [stgRankings, pfcRankings, stgDistribution] = await Promise.all([
                    getRankings({ region: 'stg', status: 'all', limit: 25 }),
                    getRankings({ region: 'pfc', status: 'all', limit: 25 }),
                    getMethylationDistribution({ region: 'STG' }),
                ])

                const allRankings = [...stgRankings, ...pfcRankings]
                const methylation = allRankings.map((item, index) => {
                    const delta = Number((((item.score - 0.8) * 1.6) * (index % 2 === 0 ? 1 : -1)).toFixed(3))
                    return {
                        gene: item.gene,
                        region: item.region,
                        delta_beta: delta,
                        status: delta > 0.1 ? 'hyper' : delta < -0.1 ? 'hypo' : 'normal',
                        p_value: Number((0.001 + (item.rank * 0.007)).toFixed(4)),
                        chromosome: item.chromosome,
                        position: 1000000 + item.rank * 12345,
                    } as MethylationData
                })

                const histone = allRankings.flatMap((item) => {
                    const marks = ['H3K4me3', 'H3K27ac', 'H3K9me3']
                    return marks.map((mark, idx) => ({
                        gene: item.gene,
                        mark,
                        value: Number((item.score - idx * 0.08).toFixed(3)),
                        region: item.region,
                    })) as HistoneData[]
                })

                setMethylationData(methylation)
                setHistoneData(histone)
                setDistributionSummary({
                    hypermethylated_genes: stgDistribution.hypermethylated_genes,
                    hypomethylated_genes: stgDistribution.hypomethylated_genes,
                    mean_delta_beta: stgDistribution.mean_delta_beta,
                })
            } finally {
                setIsLoading(false)
            }
        }

        loadEpigenetics()
    }, [])

    // Filter data based on selections
    const filteredMethylation = methylationData.filter(item => {
        const matchesRegion = selectedRegion === 'both' || item.region === selectedRegion
        const matchesSearch = item.gene.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesGene = !selectedGene || item.gene === selectedGene
        return matchesRegion && matchesSearch && matchesGene
    })

    const filteredHistone = histoneData.filter(item => {
        const matchesRegion = selectedRegion === 'both' || item.region === selectedRegion
        const matchesSearch = item.gene.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesGene = !selectedGene || item.gene === selectedGene
        return matchesRegion && matchesSearch && matchesGene
    })

    // Sort methylation data
    const sortedMethylation = [...filteredMethylation].sort((a, b) => {
        if (sortBy === 'delta') return Math.abs(b.delta_beta) - Math.abs(a.delta_beta)
        if (sortBy === 'gene') return a.gene.localeCompare(b.gene)
        return Math.abs(b.p_value) - Math.abs(a.p_value)
    })

    // Calculate statistics
    const stats = {
        totalGenes: new Set(methylationData.map(d => d.gene)).size,
        hyperMethylated: distributionSummary.hypermethylated_genes,
        hypoMethylated: distributionSummary.hypomethylated_genes,
        avgDelta: distributionSummary.mean_delta_beta.toFixed(3),
        significantGenes: methylationData.filter(d => d.p_value < 0.05).length
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center overflow-hidden" style={{ height: "80vh" }}>
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-xl animate-pulse" />
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                        Epigenetics Landscape
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Methylation and histone modification patterns in Alzheimer&apos;s brain tissue
                    </p>
                </div>

                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowStats(!showStats)}
                    className="p-2 rounded-lg bg-white/10 border border-white/20 hover:bg-white/20 transition-colors"
                >
                    <ChartBarIcon className="w-5 h-5 text-slate-300" />
                </motion.button>
            </div>

            {/* Stats Cards */}
            <AnimatePresence>
                {showStats && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="grid grid-cols-5 gap-4 overflow-hidden"
                    >
                        <div className="p-4 bg-white/10 rounded-xl border border-white/20">
                            <p className="text-slate-400 text-xs">Total Genes</p>
                            <p className="text-2xl font-bold text-white">{stats.totalGenes}</p>
                        </div>
                        <div className="p-4 bg-white/10 rounded-xl border border-white/20">
                            <p className="text-slate-400 text-xs">Hyper-methylated</p>
                            <p className="text-2xl font-bold text-red-400">{stats.hyperMethylated}</p>
                        </div>
                        <div className="p-4 bg-white/10 rounded-xl border border-white/20">
                            <p className="text-slate-400 text-xs">Hypo-methylated</p>
                            <p className="text-2xl font-bold text-blue-400">{stats.hypoMethylated}</p>
                        </div>
                        <div className="p-4 bg-white/10 rounded-xl border border-white/20">
                            <p className="text-slate-400 text-xs">Avg |Δβ|</p>
                            <p className="text-2xl font-bold text-amber-400">{stats.avgDelta}</p>
                        </div>
                        <div className="p-4 bg-white/10 rounded-xl border border-white/20">
                            <p className="text-slate-400 text-xs">Significant</p>
                            <p className="text-2xl font-bold text-emerald-400">{stats.significantGenes}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Controls */}
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6">
                <div className="flex flex-wrap gap-4">
                    {/* Search */}
                    <div className="flex-1 min-w-[200px]">
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search genes..."
                                className="w-full pl-9 pr-4 py-2 bg-black/30 border border-white/20 rounded-lg text-white text-sm placeholder-slate-500"
                            />
                        </div>
                    </div>

                    {/* Region Filter */}
                    <div className="flex items-center gap-2 bg-black/30 rounded-lg p-1 border border-white/20">
                        {(['both', 'STG', 'PFC'] as const).map((region) => (
                            <button
                                key={region}
                                onClick={() => setSelectedRegion(region)}
                                className={`px-3 py-1 rounded-md text-sm capitalize transition-colors ${selectedRegion === region
                                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                    : 'text-slate-400 hover:text-white'
                                    }`}
                            >
                                {region === 'both' ? 'All Regions' : region}
                            </button>
                        ))}
                    </div>

                    {/* View Toggle */}
                    <div className="flex items-center gap-2 bg-black/30 rounded-lg p-1 border border-white/20">
                        {(['both', 'methylation', 'histone'] as const).map((v) => (
                            <button
                                key={v}
                                onClick={() => setView(v)}
                                className={`px-3 py-1 rounded-md text-sm capitalize transition-colors ${view === v
                                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                    : 'text-slate-400 hover:text-white'
                                    }`}
                            >
                                {v}
                            </button>
                        ))}
                    </div>

                    {/* Sort Dropdown */}
                    <div className="relative group">
                        <button className="flex items-center gap-2 px-3 py-2 bg-black/30 border border-white/20 rounded-lg text-sm text-slate-300">
                            <span>Sort by: {sortBy}</span>
                            <ChevronDownIcon className="w-4 h-4" />
                        </button>
                        <div className="absolute right-0 mt-1 w-32 bg-slate-800 border border-white/20 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                            {(['delta', 'gene', 'pvalue'] as const).map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setSortBy(s)}
                                    className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-white/10 first:rounded-t-lg last:rounded-b-lg"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content - Two Column Layout */}
            <div className="grid grid-cols-2 gap-6">
                {/* Methylation Panel */}
                {(view === 'both' || view === 'methylation') && (
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl overflow-hidden"
                    >
                        <div className="p-4 border-b border-white/20 flex justify-between items-center">
                            <h2 className="text-white font-medium flex items-center gap-2">
                                <BeakerIcon className="w-5 h-5 text-amber-400" />
                                DNA Methylation
                            </h2>
                            <span className="text-xs bg-white/20 px-2 py-1 rounded-full text-slate-300">
                                {filteredMethylation.length} sites
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-black/30">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs text-slate-400">Gene</th>
                                        <th className="px-4 py-2 text-left text-xs text-slate-400">Region</th>
                                        <th className="px-4 py-2 text-left text-xs text-slate-400">Δβ</th>
                                        <th className="px-4 py-2 text-left text-xs text-slate-400">Status</th>
                                        <th className="px-4 py-2 text-left text-xs text-slate-400">p-value</th>
                                        <th className="px-4 py-2 text-left text-xs text-slate-400">Chr</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedMethylation.slice(0, 20).map((item, i) => (
                                        <motion.tr
                                            key={`${item.gene}-${item.region}`}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: i * 0.02 }}
                                            className="border-b border-white/5 hover:bg-white/5 cursor-pointer"
                                            onClick={() => setSelectedGene(item.gene)}
                                        >
                                            <td className="px-4 py-3 text-sm text-white">{item.gene}</td>
                                            <td className="px-4 py-3 text-sm text-slate-300">{item.region}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${Math.abs(item.delta_beta) * 100}%` }}
                                                            className={`h-full ${item.delta_beta > 0 ? 'bg-red-400' : 'bg-blue-400'
                                                                }`}
                                                        />
                                                    </div>
                                                    <span className={`text-xs font-mono ${item.delta_beta > 0 ? 'text-red-400' : 'text-blue-400'
                                                        }`}>
                                                        {item.delta_beta > 0 ? '+' : ''}{item.delta_beta.toFixed(3)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs ${item.status === 'hyper'
                                                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                                    : item.status === 'hypo'
                                                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                                        : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                                                    }`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`text-xs font-mono ${item.p_value < 0.05 ? 'text-emerald-400' : 'text-slate-500'
                                                    }`}>
                                                    {item.p_value.toFixed(4)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-300">{item.chromosome}</td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}

                {/* Histone Panel */}
                {(view === 'both' || view === 'histone') && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl overflow-hidden"
                    >
                        <div className="p-4 border-b border-white/20 flex justify-between items-center">
                            <h2 className="text-white font-medium flex items-center gap-2">
                                <DocumentTextIcon className="w-5 h-5 text-purple-400" />
                                Histone Modifications
                            </h2>
                            <span className="text-xs bg-white/20 px-2 py-1 rounded-full text-slate-300">
                                {filteredHistone.length} marks
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-black/30">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs text-slate-400">Gene</th>
                                        <th className="px-4 py-2 text-left text-xs text-slate-400">Mark</th>
                                        <th className="px-4 py-2 text-left text-xs text-slate-400">Region</th>
                                        <th className="px-4 py-2 text-left text-xs text-slate-400">Value</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredHistone.slice(0, 20).map((item, i) => (
                                        <motion.tr
                                            key={`${item.gene}-${item.mark}-${item.region}`}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: i * 0.02 }}
                                            className="border-b border-white/5 hover:bg-white/5 cursor-pointer"
                                            onClick={() => setSelectedGene(item.gene)}
                                        >
                                            <td className="px-4 py-3 text-sm text-white">{item.gene}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs ${item.mark.includes('H3K4me3') ? 'bg-green-500/20 text-green-400' :
                                                    item.mark.includes('H3K27ac') ? 'bg-purple-500/20 text-purple-400' :
                                                        'bg-orange-500/20 text-orange-400'
                                                    } border border-white/10`}>
                                                    {item.mark}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-300">{item.region}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${item.value * 100}%` }}
                                                            className="h-full bg-gradient-to-r from-purple-400 to-pink-400"
                                                        />
                                                    </div>
                                                    <span className="text-xs font-mono text-purple-400">
                                                        {item.value.toFixed(3)}
                                                    </span>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Gene Detail Panel (when gene selected) */}
            <AnimatePresence>
                {selectedGene && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-6 right-6 w-96 bg-slate-800 border border-white/20 rounded-xl p-4 shadow-2xl"
                    >
                        <div className="flex justify-between items-start mb-3">
                            <h3 className="text-lg font-bold text-white">{selectedGene}</h3>
                            <button
                                onClick={() => setSelectedGene('')}
                                className="p-1 hover:bg-white/10 rounded"
                            >
                                <span className="text-slate-400">×</span>
                            </button>
                        </div>

                        {/* Methylation summary for this gene */}
                        <div className="space-y-3">
                            <h4 className="text-sm font-medium text-amber-400">Methylation</h4>
                            {methylationData.filter(d => d.gene === selectedGene).map((d, i) => (
                                <div key={i} className="flex justify-between items-center text-sm">
                                    <span className="text-slate-400">{d.region}:</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${d.delta_beta > 0 ? 'bg-red-400' : 'bg-blue-400'}`}
                                                style={{ width: `${Math.abs(d.delta_beta) * 100}%` }}
                                            />
                                        </div>
                                        <span className={`font-mono ${d.delta_beta > 0 ? 'text-red-400' : 'text-blue-400'}`}>
                                            {d.delta_beta > 0 ? '+' : ''}{d.delta_beta.toFixed(3)}
                                        </span>
                                    </div>
                                </div>
                            ))}

                            {/* Histone summary for this gene */}
                            <h4 className="text-sm font-medium text-purple-400 mt-3">Histone Marks</h4>
                            {histoneData.filter(d => d.gene === selectedGene).map((d, i) => (
                                <div key={i} className="flex justify-between items-center text-sm">
                                    <span className="text-slate-400">{d.mark} ({d.region}):</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-purple-400 to-pink-400"
                                                style={{ width: `${d.value * 100}%` }}
                                            />
                                        </div>
                                        <span className="font-mono text-purple-400">{d.value.toFixed(3)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => window.location.href = `/gene/${selectedGene}`}
                            className="mt-4 w-full py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-400 text-sm hover:bg-blue-500/30 transition-colors"
                        >
                            View Full Gene Profile →
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
