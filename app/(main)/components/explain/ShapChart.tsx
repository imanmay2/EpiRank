'use client'

import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import {
    ChartBarIcon,
    BeakerIcon,
    ShareIcon,
    DocumentTextIcon,
    InformationCircleIcon,
} from '@heroicons/react/24/outline'
import { getExplain } from '../../services/epirankApi'

interface ShapChartProps {
    geneId: string
}

interface ShapFeature {
    name: string
    value: number
    shap_value: number
    category: 'methylation' | 'histone' | 'network' | 'chromatin'
}

const parseCategory = (featureName: string): ShapFeature['category'] => {
    const key = featureName.toLowerCase()
    if (key.includes('network')) return 'network'
    if (key.includes('methylation') || key.includes('beta')) return 'methylation'
    if (key.includes('h3k')) return 'histone'
    return 'chromatin'
}

const categoryConfig = {
    methylation: {
        label: 'Methylation',
        icon: BeakerIcon,
        color: 'blue',
        gradient: 'from-blue-500 to-cyan-500',
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/30',
        text: 'text-blue-400'
    },
    histone: {
        label: 'Histone',
        icon: DocumentTextIcon,
        color: 'purple',
        gradient: 'from-purple-500 to-pink-500',
        bg: 'bg-purple-500/10',
        border: 'border-purple-500/30',
        text: 'text-purple-400'
    },
    network: {
        label: 'Network',
        icon: ShareIcon,
        color: 'emerald',
        gradient: 'from-emerald-500 to-teal-500',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        text: 'text-emerald-400'
    },
    chromatin: {
        label: 'Chromatin',
        icon: ChartBarIcon,
        color: 'amber',
        gradient: 'from-amber-500 to-orange-500',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        text: 'text-amber-400'
    }
}

const ShapChart: React.FC<ShapChartProps> = ({ geneId }) => {
    const [data, setData] = useState<ShapFeature[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [view, setView] = useState<'bars' | 'summary'>('bars')
    const [hoveredBar, setHoveredBar] = useState<string | null>(null)

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true)
            try {
                const explain = await getExplain(geneId)
                const mappedData = Object.entries(explain.shap_values).map(([name, shapValue]) => ({
                    name,
                    value: Math.abs(shapValue),
                    shap_value: shapValue,
                    category: parseCategory(name),
                }))
                setData(mappedData)
            } finally {
                setIsLoading(false)
            }
        }
        fetchData()
    }, [geneId])

    // Sort by absolute SHAP value for display
    const sortedData = [...data].sort((a, b) => Math.abs(b.shap_value) - Math.abs(a.shap_value))

    // Calculate statistics
    const totalPositive = sortedData.filter(d => d.shap_value > 0).reduce((sum, d) => sum + d.shap_value, 0)
    const totalNegative = sortedData.filter(d => d.shap_value < 0).reduce((sum, d) => sum + Math.abs(d.shap_value), 0)
    const topPositive = sortedData.filter(d => d.shap_value > 0).slice(0, 3)
    const topNegative = sortedData.filter(d => d.shap_value < 0).slice(0, 3)

    if (isLoading) {
        return (
            <div className="h-80 flex items-center justify-center">
                <div className="relative">
                    <div className="w-12 h-12 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-xl animate-pulse" />
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header with stats */}
            <div className="grid grid-cols-3 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20"
                >
                    <p className="text-xs text-slate-400 mb-1">Total Positive Impact</p>
                    <p className="text-2xl font-bold text-blue-400">+{totalPositive.toFixed(2)}</p>
                    <p className="text-xs text-slate-500 mt-1">from {data.filter(d => d.shap_value > 0).length} features</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="p-4 rounded-xl bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/20"
                >
                    <p className="text-xs text-slate-400 mb-1">Total Negative Impact</p>
                    <p className="text-2xl font-bold text-red-400">-{totalNegative.toFixed(2)}</p>
                    <p className="text-xs text-slate-500 mt-1">from {data.filter(d => d.shap_value < 0).length} features</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20"
                >
                    <p className="text-xs text-slate-400 mb-1">Net SHAP Score</p>
                    <p className="text-2xl font-bold text-white">{(totalPositive - totalNegative).toFixed(2)}</p>
                    <p className="text-xs text-slate-500 mt-1">Final contribution</p>
                </motion.div>
            </div>

            {/* View toggle */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-white flex items-center gap-2">
                    <ChartBarIcon className="w-4 h-4 text-blue-400" />
                    SHAP Feature Importance
                </h3>

                <div className="flex items-center bg-white/5 rounded-lg p-1 border border-white/10">
                    <button
                        onClick={() => setView('bars')}
                        className={`px-3 py-1 text-xs rounded-md transition-colors ${view === 'bars'
                            ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                            : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        Bar Chart
                    </button>
                    <button
                        onClick={() => setView('summary')}
                        className={`px-3 py-1 text-xs rounded-md transition-colors ${view === 'summary'
                            ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                            : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        Summary
                    </button>
                </div>
            </div>

            {/* Main chart area */}
            {view === 'bars' ? (
                <div className="space-y-3">
                    {sortedData.map((feature, index) => {
                        const config = categoryConfig[feature.category]
                        const isPositive = feature.shap_value > 0
                        const barWidth = Math.abs(feature.shap_value) * 100 // Scale to percentage

                        return (
                            <motion.div
                                key={feature.name}
                                initial={{ opacity: 0, x: isPositive ? 20 : -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                onHoverStart={() => setHoveredBar(feature.name)}
                                onHoverEnd={() => setHoveredBar(null)}
                                className="relative group"
                            >
                                <div className="flex items-center gap-3">
                                    {/* Feature name with icon */}
                                    <div className="w-48 flex items-center gap-2">
                                        <config.icon className={`w-4 h-4 ${config.text}`} />
                                        <span className="text-sm text-slate-300 truncate" title={feature.name}>
                                            {feature.name}
                                        </span>
                                    </div>

                                    {/* Value indicator */}
                                    <span className="w-16 text-xs font-mono text-slate-400">
                                        {feature.value.toFixed(3)}
                                    </span>

                                    {/* Bar container */}
                                    <div className="flex-1 h-8 flex items-center">
                                        {/* Negative bar (left side) */}
                                        {!isPositive && (
                                            <div className="relative flex items-center justify-end h-full" style={{ width: `${barWidth}%` }}>
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: '100%' }}
                                                    className={`absolute right-0 h-6 bg-gradient-to-l from-red-500 to-orange-500 rounded-l-full opacity-80 group-hover:opacity-100 transition-opacity`}
                                                />
                                                <span className="relative z-10 text-xs text-white px-2">
                                                    {feature.shap_value.toFixed(3)}
                                                </span>
                                            </div>
                                        )}

                                        {/* Positive bar (right side) */}
                                        {isPositive && (
                                            <div className="relative flex items-center h-full" style={{ width: `${barWidth}%` }}>
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: '100%' }}
                                                    className={`absolute left-0 h-6 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-r-full opacity-80 group-hover:opacity-100 transition-opacity`}
                                                />
                                                <span className="relative z-10 text-xs text-white px-2">
                                                    +{feature.shap_value.toFixed(3)}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Category badge */}
                                    <span className={`w-20 text-xs px-2 py-1 rounded-full ${config.bg} ${config.border} ${config.text} text-center`}>
                                        {config.label}
                                    </span>
                                </div>

                                {/* Tooltip on hover */}
                                {hoveredBar === feature.name && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="absolute left-1/2 -translate-x-1/2 -top-12 bg-slate-800 text-white text-xs rounded-lg py-2 px-3 border border-white/10 whitespace-nowrap z-50"
                                    >
                                        <p className="font-medium">{feature.name}</p>
                                        <p className="text-slate-400 mt-1">
                                            Value: {feature.value.toFixed(3)} • SHAP: {feature.shap_value.toFixed(3)}
                                        </p>
                                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 border-r border-b border-white/10 rotate-45" />
                                    </motion.div>
                                )}
                            </motion.div>
                        )
                    })}
                </div>
            ) : (
                // Summary view
                <div className="grid grid-cols-2 gap-4">
                    {/* Top positive features */}
                    <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/5 to-cyan-500/5 border border-blue-500/20">
                        <h4 className="text-sm font-medium text-blue-400 mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                            Top Positive Drivers
                        </h4>
                        <div className="space-y-2">
                            {topPositive.map((f, i) => {
                                const config = categoryConfig[f.category]
                                return (
                                    <motion.div
                                        key={f.name}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        className="flex items-center justify-between p-2 rounded-lg bg-white/5"
                                    >
                                        <div className="flex items-center gap-2">
                                            <config.icon className={`w-3 h-3 ${config.text}`} />
                                            <span className="text-xs text-slate-300">{f.name}</span>
                                        </div>
                                        <span className="text-xs font-mono text-blue-400">+{f.shap_value.toFixed(3)}</span>
                                    </motion.div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Top negative features */}
                    <div className="p-4 rounded-xl bg-gradient-to-br from-red-500/5 to-orange-500/5 border border-red-500/20">
                        <h4 className="text-sm font-medium text-red-400 mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                            Top Negative Drivers
                        </h4>
                        <div className="space-y-2">
                            {topNegative.map((f, i) => {
                                const config = categoryConfig[f.category]
                                return (
                                    <motion.div
                                        key={f.name}
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        className="flex items-center justify-between p-2 rounded-lg bg-white/5"
                                    >
                                        <div className="flex items-center gap-2">
                                            <config.icon className={`w-3 h-3 ${config.text}`} />
                                            <span className="text-xs text-slate-300">{f.name}</span>
                                        </div>
                                        <span className="text-xs font-mono text-red-400">{f.shap_value.toFixed(3)}</span>
                                    </motion.div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Explanation text */}
                    <div className="col-span-2 mt-2 p-4 rounded-xl bg-white/5 border border-white/10">
                        <div className="flex items-start gap-3">
                            <InformationCircleIcon className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-medium text-white mb-1">Why is {geneId} ranked this way?</h4>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    {geneId} shows strong {topPositive[0]?.category} signals ({topPositive[0]?.name})
                                    contributing positively to its score. The {topNegative[0]?.category} pattern
                                    ({topNegative[0]?.name}) slightly reduces the ranking. Overall, regulatory evidence
                                    strongly supports {geneId}&apos;s role in Alzheimer&apos;s pathology.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Legend */}
            <div className="flex items-center justify-end gap-4 pt-2 border-t border-white/10">
                {Object.entries(categoryConfig).map(([key, config]) => (
                    <div key={key} className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${config.gradient}`} />
                        <span className="text-xs text-slate-400">{config.label}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default ShapChart
