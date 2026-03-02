'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    MagnifyingGlassIcon,
    AdjustmentsHorizontalIcon,
    ArrowPathIcon,
    CubeIcon,
    ChartBarIcon,
} from '@heroicons/react/24/outline'
import { getNetwork, getRankings } from '../services/epirankApi'
import StatusBadge from '../components/rankings/StatusBadge'

interface Node {
    id: string
    name: string
    score: number
    status: 'known' | 'novel'
    chromosome: string
    degree: number
    x?: number
    y?: number
}

interface Link {
    source: string
    target: string
    weight: number
}

export default function NetworkPage() {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [nodes, setNodes] = useState<Node[]>([])
    const [links, setLinks] = useState<Link[]>([])
    const [hoveredNode, setHoveredNode] = useState<string | null>(null)
    const [selectedNode, setSelectedNode] = useState<Node | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [zoom, setZoom] = useState(1)
    const [showControls, setShowControls] = useState(false)
    const [filter, setFilter] = useState<'all' | 'known' | 'novel'>('all')
    const nodePositionsRef = useRef<Map<string, { x: number, y: number }>>(new Map())

    useEffect(() => {
        const loadNetwork = async () => {
            setIsLoading(true)
            try {
                const [networkResponse, rankings] = await Promise.all([
                    getNetwork({ top_n: 20, region: 'STG' }),
                    getRankings({ region: 'stg', limit: 50, status: 'all' }),
                ])
                const chromosomeLookup = new Map(
                    rankings.map((item) => [item.gene, item.chromosome])
                )

                setNodes(
                    networkResponse.nodes.map((node) => ({
                        id: node.id,
                        name: node.id,
                        score: node.score,
                        status: node.status,
                        degree: node.degree,
                        chromosome: chromosomeLookup.get(node.id) ?? '-',
                    }))
                )
                setLinks(networkResponse.edges)
            } finally {
                setIsLoading(false)
            }
        }

        loadNetwork()
    }, [])

    // Filter nodes based on search and status filter
    const filteredNodes = nodes.filter(node => {
        const matchesSearch = node.name.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesFilter = filter === 'all' || node.status === filter
        return matchesSearch && matchesFilter
    })

    const filteredNodeIds = new Set(filteredNodes.map(n => n.id))
    const filteredLinks = links.filter(link =>
        filteredNodeIds.has(link.source) && filteredNodeIds.has(link.target)
    )

    // Simple force-directed layout simulation
    useEffect(() => {
        if (!canvasRef.current || nodes.length === 0) return

        const ctx = canvasRef.current.getContext('2d')
        if (!ctx) return

        let animationFrame: number
        const width = canvasRef.current.width
        const height = canvasRef.current.height

        // Initialize node positions if not set
        const positionedNodes = nodes.map(node => ({
            ...node,
            x: node.x || Math.random() * width,
            y: node.y || Math.random() * height,
            vx: 0,
            vy: 0
        }))

        const simulation = () => {
            // Simple force simulation
            const k = 0.01 // spring constant
            const repulsion = 1000

            // Apply forces
            for (let i = 0; i < positionedNodes.length; i++) {
                const nodeA = positionedNodes[i]

                // Repulsion between nodes
                for (let j = i + 1; j < positionedNodes.length; j++) {
                    const nodeB = positionedNodes[j]
                    const dx = nodeA.x! - nodeB.x!
                    const dy = nodeA.y! - nodeB.y!
                    const distance = Math.sqrt(dx * dx + dy * dy) || 1
                    const force = repulsion / (distance * distance)

                    if (distance < 200) {
                        nodeA.vx = (nodeA.vx || 0) + (dx / distance) * force
                        nodeA.vy = (nodeA.vy || 0) + (dy / distance) * force
                        nodeB.vx = (nodeB.vx || 0) - (dx / distance) * force
                        nodeB.vy = (nodeB.vy || 0) - (dy / distance) * force
                    }
                }

                // Attraction along links
                links.forEach(link => {
                    if (link.source === nodeA.id || link.target === nodeA.id) {
                        const otherId = link.source === nodeA.id ? link.target : link.source
                        const nodeB = positionedNodes.find(n => n.id === otherId)
                        if (nodeB) {
                            const dx = nodeA.x! - nodeB.x!
                            const dy = nodeA.y! - nodeB.y!
                            const distance = Math.sqrt(dx * dx + dy * dy) || 1
                            const force = -k * distance * link.weight

                            nodeA.vx = (nodeA.vx || 0) + (dx / distance) * force
                            nodeA.vy = (nodeA.vy || 0) + (dy / distance) * force
                        }
                    }
                })

                // Update position
                nodeA.x = Math.max(20, Math.min(width - 20, nodeA.x! + (nodeA.vx || 0)))
                nodeA.y = Math.max(20, Math.min(height - 20, nodeA.y! + (nodeA.vy || 0)))

                // Damping
                nodeA.vx = (nodeA.vx || 0) * 0.95
                nodeA.vy = (nodeA.vy || 0) * 0.95
            }

            draw()
            animationFrame = requestAnimationFrame(simulation)
        }

        const draw = () => {
            ctx.clearRect(0, 0, width, height)

            // Draw links
            ctx.lineWidth = 1
            filteredLinks.forEach(link => {
                const source = positionedNodes.find(n => n.id === link.source)
                const target = positionedNodes.find(n => n.id === link.target)
                if (source && target) {
                    ctx.beginPath()
                    ctx.moveTo(source.x!, source.y!)
                    ctx.lineTo(target.x!, target.y!)
                    ctx.strokeStyle = `rgba(255,255,255,${link.weight * 0.3})`
                    ctx.lineWidth = link.weight * 2
                    ctx.stroke()
                }
            })

            // Draw nodes
            positionedNodes.forEach(node => {
                if (!filteredNodeIds.has(node.id)) return

                const isHovered = hoveredNode === node.id
                const isSelected = selectedNode?.id === node.id
                const radius = isSelected ? 12 : (isHovered ? 10 : 8 + node.score * 4)

                // Node glow
                ctx.shadowColor = node.status === 'known' ? '#10b981' : '#8b5cf6'
                ctx.shadowBlur = isHovered ? 20 : 10
                ctx.shadowOffsetX = 0
                ctx.shadowOffsetY = 0

                // Node circle
                ctx.beginPath()
                ctx.arc(node.x!, node.y!, radius, 0, 2 * Math.PI)

                // Gradient fill
                const gradient = ctx.createRadialGradient(
                    node.x! - 2, node.y! - 2, 2,
                    node.x!, node.y!, radius + 2
                )

                if (node.status === 'known') {
                    gradient.addColorStop(0, '#10b981')
                    gradient.addColorStop(1, '#059669')
                } else {
                    gradient.addColorStop(0, '#8b5cf6')
                    gradient.addColorStop(1, '#7c3aed')
                }

                ctx.fillStyle = gradient
                ctx.fill()

                // Node border
                ctx.shadowBlur = 0
                ctx.strokeStyle = 'rgba(255,255,255,0.5)'
                ctx.lineWidth = isSelected ? 2 : 1
                ctx.stroke()

                // Node label
                if (isHovered || isSelected || radius > 10) {
                    ctx.font = '12px Inter, sans-serif'
                    ctx.fillStyle = 'white'
                    ctx.shadowColor = 'black'
                    ctx.shadowBlur = 4
                    ctx.fillText(node.name, node.x! + 15, node.y! - 10)
                }

                nodePositionsRef.current.set(node.id, { x: node.x!, y: node.y! })
            })

            ctx.shadowBlur = 0
        }

        simulation()


        return () => {
            cancelAnimationFrame(animationFrame)
        }
    }, [nodes, links, filteredLinks, filteredNodeIds])

    // Handle canvas interactions
    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current
        if (!canvas) return

        const rect = canvas.getBoundingClientRect()

        // Calculate mouse position relative to canvas
        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top

        // Scale to canvas coordinates (canvas is 1200x800)
        const scaleX = canvas.width / rect.width
        const scaleY = canvas.height / rect.height

        const canvasX = mouseX * scaleX
        const canvasY = mouseY * scaleY

        // Check if clicked on a node (using current positions from positionedNodes)
        let clickedNode = null
        for (const node of nodes) {
            const pos = nodePositionsRef.current.get(node.id)
            if (pos) {
                const dx = pos.x - canvasX
                const dy = pos.y - canvasY
                const distance = Math.sqrt(dx * dx + dy * dy)
                if (distance < 20) {
                    clickedNode = node
                    break
                }
            }
        }

        setSelectedNode(clickedNode)
    }

    const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current
        if (!canvas) return

        const rect = canvas.getBoundingClientRect()

        // Calculate mouse position relative to canvas
        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top

        // Scale to canvas coordinates
        const scaleX = canvas.width / rect.width
        const scaleY = canvas.height / rect.height

        const canvasX = mouseX * scaleX
        const canvasY = mouseY * scaleY

        // Check if hovering over a node
        let hovered = null
        for (const node of nodes) {
            if (node.x && node.y) {
                const dx = node.x - canvasX
                const dy = node.y - canvasY
                const distance = Math.sqrt(dx * dx + dy * dy)
                if (distance < 20) {
                    hovered = node.id
                    break
                }
            }
        }

        setHoveredNode(hovered)
        canvas.style.cursor = hovered ? 'pointer' : 'default'
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
        <div className="p-6 h-[calc(100vh-80px)] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                        Network View
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Interactive gene interaction network
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowControls(!showControls)}
                        className="p-2 rounded-lg bg-white/10 border border-white/20 hover:bg-white/20 transition-colors"
                    >
                        <AdjustmentsHorizontalIcon className="w-5 h-5 text-slate-300" />
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => window.location.reload()}
                        className="p-2 rounded-lg bg-white/10 border border-white/20 hover:bg-white/20 transition-colors"
                    >
                        <ArrowPathIcon className="w-5 h-5 text-slate-300" />
                    </motion.button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex gap-4 min-h-0">
                {/* Network Canvas */}
                <div className="flex-1 bg-white/5 backdrop-blur-xl border border-white/20 rounded-xl overflow-hidden relative">
                    <canvas
                        ref={canvasRef}
                        width={1200}
                        height={800}
                        onClick={handleCanvasClick}
                        onMouseMove={handleCanvasMouseMove}
                        className="w-full h-full"
                    />

                    {/* Legend */}
                    <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-xl border border-white/20 rounded-lg p-3">
                        <h4 className="text-xs font-medium text-slate-300 mb-2">Legend</h4>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                <span className="text-xs text-slate-400">Known Gene</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-purple-500" />
                                <span className="text-xs text-slate-400">Novel Gene</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-0.5 bg-white/30" />
                                <span className="text-xs text-slate-400">Interaction</span>
                            </div>
                        </div>
                    </div>

                    {/* Stats Overlay */}
                    <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-xl border border-white/20 rounded-lg p-3">
                        <div className="text-xs text-slate-400">
                            <div>Nodes: {filteredNodes.length}</div>
                            <div>Edges: {filteredLinks.length}</div>
                        </div>
                    </div>
                </div>

                {/* Side Panel */}
                <div className="w-80 space-y-4">
                    {/* Search */}
                    <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4">
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

                        {/* Filter pills */}
                        <div className="flex gap-2 mt-3">
                            {['all', 'known', 'novel'].map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f as 'all' | 'known' | 'novel')}
                                    className={`px-3 py-1 rounded-full text-xs capitalize transition-colors ${filter === f
                                        ? f === 'known'
                                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                            : f === 'novel'
                                                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                        : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/20'
                                        }`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Selected Node Info */}
                    <AnimatePresence mode="wait">
                        {selectedNode ? (
                            <motion.div
                                key={selectedNode.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="text-lg font-bold text-white">{selectedNode.name}</h3>
                                        <p className="text-xs text-slate-400">ID: {selectedNode.id}</p>
                                    </div>
                                    <StatusBadge status={selectedNode.status} />
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">Score:</span>
                                        <span className="text-white font-mono">{selectedNode.score.toFixed(3)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">Chromosome:</span>
                                        <span className="text-white">{selectedNode.chromosome}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">Degree:</span>
                                        <span className="text-white">{selectedNode.degree}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 mt-4">
                                    <button
                                        onClick={() => window.location.href = `/gene/${selectedNode.name}`}
                                        className="px-3 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-400 text-xs hover:bg-blue-500/30 transition-colors"
                                    >
                                        View Profile
                                    </button>
                                    <button
                                        onClick={() => setSelectedNode(null)}
                                        className="px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-slate-400 text-xs hover:bg-white/20 transition-colors"
                                    >
                                        Close
                                    </button>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6 text-center"
                            >
                                <CubeIcon className="w-12 h-12 text-slate-500 mx-auto mb-2" />
                                <p className="text-sm text-slate-400">Click on a node to view details</p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Quick Stats */}
                    <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4">
                        <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                            <ChartBarIcon className="w-4 h-4 text-blue-400" />
                            Network Statistics
                        </h4>
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-400">Known Genes:</span>
                                <span className="text-emerald-400">{nodes.filter(n => n.status === 'known').length}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-400">Novel Genes:</span>
                                <span className="text-purple-400">{nodes.filter(n => n.status === 'novel').length}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-400">Total Interactions:</span>
                                <span className="text-white">{links.length}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-400">Avg. Degree:</span>
                                <span className="text-white">
                                    {(links.length / nodes.length * 2).toFixed(1)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Controls Panel */}
                    <AnimatePresence>
                        {showControls && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4 overflow-hidden"
                            >
                                <h4 className="text-sm font-medium text-white mb-3">Display Controls</h4>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs text-slate-400 block mb-1">Zoom</label>
                                        <input
                                            type="range"
                                            min="0.5"
                                            max="2"
                                            step="0.1"
                                            value={zoom}
                                            onChange={(e) => setZoom(parseFloat(e.target.value))}
                                            className="w-full"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400 block mb-1">Node Size</label>
                                        <select className="w-full bg-black/30 border border-white/20 rounded-lg p-2 text-xs text-white">
                                            <option>By Score</option>
                                            <option>By Degree</option>
                                            <option>Uniform</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400 block mb-1">Layout</label>
                                        <select className="w-full bg-black/30 border border-white/20 rounded-lg p-2 text-xs text-white">
                                            <option>Force-Directed</option>
                                            <option>Circular</option>
                                            <option>Grid</option>
                                        </select>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    )
}
