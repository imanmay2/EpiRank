export type Region = 'STG' | 'PFC';
export type RegionFilter = 'all' | 'stg' | 'pfc';
export type GeneStatus = 'known' | 'novel';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface ApiRequestOptions {
  method?: HttpMethod;
  body?: unknown;
}

const API_MODE = process.env.NEXT_PUBLIC_API_MODE ?? 'mock';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

export interface RankingsItem {
  rank: number;
  gene: string;
  score: number;
  region: Region;
  status: GeneStatus;
  chromosome: string;
  top_features: string[];
  network_degree: number;
}

export interface ExplainResponse {
  gene: string;
  rank: number;
  score: number;
  region: Region;
  status: GeneStatus;
  shap_values: Record<string, number>;
  explanation_text: string;
  top_positive_features: string[];
  top_negative_features: string[];
}

export interface GeneProfileResponse {
  gene: string;
  rank: number;
  score: number;
  region: Region;
  status: GeneStatus;
  chromosome: string;
  embedding_dim: number;
  regulatory_features: {
    mean_beta_AD: number;
    mean_beta_control: number;
    delta_beta: number;
    H3K4me3: number;
    H3K27ac: number;
    H3K27me3: number;
    H3K36me3: number;
  };
  network: {
    degree: number;
    neighbors: string[];
    top_edge_weights: Record<string, number>;
  };
  alz_gene_evidence: {
    in_database: boolean;
    evidence_level: 'Strong' | 'Moderate' | 'Emerging';
    references: number;
  };
}

export interface NetworkResponse {
  nodes: Array<{
    id: string;
    rank: number;
    score: number;
    status: GeneStatus;
    degree: number;
  }>;
  edges: Array<{
    source: string;
    target: string;
    weight: number;
  }>;
}

export interface MetricsResponse {
  model_version: string;
  region: Region;
  samples: {
    total: number;
    AD: number;
    control: number;
  };
  validation: {
    precision_at_10: number;
    precision_at_20: number;
    auc_roc: number;
    shap_coherence: number;
  };
  pipeline: {
    probes_before_filter: number;
    probes_after_filter: number;
    genes_with_features: number;
    autoencoder_embedding_dim: number;
    gat_layers: number;
    gat_attention_heads: number;
  };
  roc_curve: {
    fpr: number[];
    tpr: number[];
  };
}

export interface MethylationDistributionResponse {
  region: Region;
  bins: number[];
  AD_counts: number[];
  control_counts: number[];
  mean_delta_beta: number;
  hypermethylated_genes: number;
  hypomethylated_genes: number;
}

const sleep = (ms = 450) => new Promise((resolve) => setTimeout(resolve, ms));

const rankingsData: RankingsItem[] = [
  { rank: 1, gene: 'APOE', score: 0.943, region: 'STG', status: 'known', chromosome: '19', top_features: ['promoter_methylation', 'H3K27ac', 'H3K4me3'], network_degree: 47 },
  { rank: 2, gene: 'CLU', score: 0.921, region: 'STG', status: 'known', chromosome: '8', top_features: ['H3K27ac', 'promoter_methylation', 'H3K36me3'], network_degree: 31 },
  { rank: 3, gene: 'BIN1', score: 0.908, region: 'STG', status: 'known', chromosome: '2', top_features: ['network_degree', 'H3K27ac_signal', 'H3K4me3_signal'], network_degree: 28 },
  { rank: 4, gene: 'PICALM', score: 0.892, region: 'STG', status: 'known', chromosome: '11', top_features: ['H3K4me3', 'promoter_methylation', 'network_degree'], network_degree: 26 },
  { rank: 5, gene: 'TREM2', score: 0.874, region: 'STG', status: 'known', chromosome: '6', top_features: ['H3K27ac', 'network_degree', 'H3K4me3'], network_degree: 24 },
  { rank: 6, gene: 'CR1', score: 0.851, region: 'STG', status: 'known', chromosome: '1', top_features: ['promoter_methylation', 'H3K36me3', 'network_degree'], network_degree: 19 },
  { rank: 7, gene: 'ABCA7', score: 0.844, region: 'STG', status: 'novel', chromosome: '19', top_features: ['promoter_methylation', 'H3K27me3', 'H3K4me3'], network_degree: 15 },
  { rank: 8, gene: 'CD2AP', score: 0.838, region: 'STG', status: 'known', chromosome: '6', top_features: ['network_degree', 'H3K27ac', 'gene_body_methylation'], network_degree: 14 },
  { rank: 9, gene: 'HOXA3', score: 0.831, region: 'STG', status: 'novel', chromosome: '7', top_features: ['promoter_methylation', 'H3K27me3', 'H3K4me3'], network_degree: 12 },
  { rank: 10, gene: 'EPHA1', score: 0.817, region: 'STG', status: 'novel', chromosome: '7', top_features: ['H3K4me3', 'H3K27ac', 'network_degree'], network_degree: 10 },
  { rank: 1, gene: 'APOE', score: 0.931, region: 'PFC', status: 'known', chromosome: '19', top_features: ['promoter_methylation', 'H3K27ac', 'H3K4me3'], network_degree: 44 },
  { rank: 2, gene: 'BIN1', score: 0.914, region: 'PFC', status: 'known', chromosome: '2', top_features: ['network_degree', 'H3K27ac_signal', 'H3K4me3_signal'], network_degree: 30 },
  { rank: 3, gene: 'CLU', score: 0.903, region: 'PFC', status: 'known', chromosome: '8', top_features: ['H3K27ac', 'promoter_methylation', 'H3K36me3'], network_degree: 29 },
  { rank: 4, gene: 'PICALM', score: 0.889, region: 'PFC', status: 'known', chromosome: '11', top_features: ['H3K4me3', 'promoter_methylation', 'network_degree'], network_degree: 24 },
  { rank: 5, gene: 'HOXA3', score: 0.810, region: 'PFC', status: 'novel', chromosome: '7', top_features: ['promoter_methylation', 'H3K27me3', 'H3K4me3'], network_degree: 9 },
];

const explainData: Record<string, ExplainResponse> = {
  APOE: {
    gene: 'APOE',
    rank: 1,
    score: 0.943,
    region: 'STG',
    status: 'known',
    shap_values: {
      promoter_methylation_delta: 0.42,
      H3K27ac_signal: 0.31,
      H3K4me3_signal: 0.18,
      network_degree: 0.13,
      H3K36me3_signal: 0.09,
      H3K27me3_signal: -0.08,
      gene_body_methylation: -0.05,
    },
    explanation_text:
      "APOE ranked #1 due to strong promoter hypermethylation and elevated H3K27ac enhancer activity in STG tissue, consistent with known APOE dysregulation in Alzheimer's disease.",
    top_positive_features: ['promoter_methylation_delta', 'H3K27ac_signal', 'H3K4me3_signal'],
    top_negative_features: ['H3K27me3_signal', 'gene_body_methylation'],
  },
};

const geneProfiles: Record<string, GeneProfileResponse> = {
  APOE: {
    gene: 'APOE',
    rank: 1,
    score: 0.943,
    region: 'STG',
    status: 'known',
    chromosome: '19',
    embedding_dim: 64,
    regulatory_features: {
      mean_beta_AD: 0.74,
      mean_beta_control: 0.51,
      delta_beta: 0.23,
      H3K4me3: 8.2,
      H3K27ac: 6.1,
      H3K27me3: 0.3,
      H3K36me3: 5.9,
    },
    network: {
      degree: 47,
      neighbors: ['CLU', 'BIN1', 'TREM2', 'PICALM', 'CR1'],
      top_edge_weights: {
        CLU: 0.91,
        BIN1: 0.87,
        TREM2: 0.84,
      },
    },
    alz_gene_evidence: {
      in_database: true,
      evidence_level: 'Strong',
      references: 312,
    },
  },
};

const metricsData: MetricsResponse = {
  model_version: '0.1.0',
  region: 'STG',
  samples: { total: 143, AD: 74, control: 69 },
  validation: { precision_at_10: 0.9, precision_at_20: 0.85, auc_roc: 0.91, shap_coherence: 0.78 },
  pipeline: {
    probes_before_filter: 450000,
    probes_after_filter: 387423,
    genes_with_features: 18423,
    autoencoder_embedding_dim: 64,
    gat_layers: 3,
    gat_attention_heads: 4,
  },
  roc_curve: {
    fpr: [0.0, 0.05, 0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 1.0],
    tpr: [0.0, 0.42, 0.63, 0.74, 0.81, 0.87, 0.91, 0.94, 1.0],
  },
};

const methylationData: Record<Region, MethylationDistributionResponse> = {
  STG: {
    region: 'STG',
    bins: [-1.0, -0.8, -0.6, -0.4, -0.2, 0.0, 0.2, 0.4, 0.6, 0.8, 1.0],
    AD_counts: [2, 3, 5, 10, 20, 35, 28, 15, 8, 4, 2],
    control_counts: [1, 2, 4, 8, 18, 30, 22, 12, 6, 3, 1],
    mean_delta_beta: 0.087,
    hypermethylated_genes: 1243,
    hypomethylated_genes: 876,
  },
  PFC: {
    region: 'PFC',
    bins: [-1.0, -0.8, -0.6, -0.4, -0.2, 0.0, 0.2, 0.4, 0.6, 0.8, 1.0],
    AD_counts: [1, 2, 4, 8, 17, 29, 24, 14, 7, 3, 1],
    control_counts: [1, 2, 3, 7, 16, 27, 21, 10, 5, 2, 1],
    mean_delta_beta: 0.074,
    hypermethylated_genes: 1107,
    hypomethylated_genes: 812,
  },
};

const parseNumber = (value: string | null, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const mockApiRequest = async <T>(path: string, options: ApiRequestOptions = {}): Promise<T> => {
  await sleep();

  const method = options.method ?? 'GET';
  const url = new URL(path, 'https://mock.local');
  const pathname = url.pathname;

  if (method === 'GET' && pathname === '/api/rankings') {
    const region = (url.searchParams.get('region') ?? 'STG').toUpperCase();
    const limit = parseNumber(url.searchParams.get('limit'), 50);
    const status = (url.searchParams.get('status') ?? 'all').toLowerCase();

    const result = rankingsData
      .filter((item) => region === 'ALL' || item.region === region)
      .filter((item) => status === 'all' || item.status === status)
      .sort((a, b) => a.rank - b.rank)
      .slice(0, limit);

    return result as T;
  }

  if (method === 'GET' && pathname.startsWith('/api/explain/')) {
    const gene = pathname.split('/').pop()?.toUpperCase() ?? 'APOE';
    return (explainData[gene] ?? explainData.APOE) as T;
  }

  if (method === 'GET' && pathname.startsWith('/api/gene/')) {
    const gene = pathname.split('/').pop()?.toUpperCase() ?? 'APOE';

    if (geneProfiles[gene]) {
      return geneProfiles[gene] as T;
    }

    const fallback = rankingsData.find((item) => item.gene === gene) ?? rankingsData[0];
    const synthetic: GeneProfileResponse = {
      gene: fallback.gene,
      rank: fallback.rank,
      score: fallback.score,
      region: fallback.region,
      status: fallback.status,
      chromosome: fallback.chromosome,
      embedding_dim: 64,
      regulatory_features: {
        mean_beta_AD: 0.68,
        mean_beta_control: 0.54,
        delta_beta: 0.14,
        H3K4me3: 7.1,
        H3K27ac: 5.4,
        H3K27me3: 0.7,
        H3K36me3: 4.8,
      },
      network: {
        degree: fallback.network_degree,
        neighbors: ['APOE', 'CLU', 'BIN1'],
        top_edge_weights: { APOE: 0.78, CLU: 0.69, BIN1: 0.63 },
      },
      alz_gene_evidence: {
        in_database: fallback.status === 'known',
        evidence_level: fallback.status === 'known' ? 'Moderate' : 'Emerging',
        references: fallback.status === 'known' ? 120 : 18,
      },
    };

    return synthetic as T;
  }

  if (method === 'GET' && pathname === '/api/network') {
    const topN = parseNumber(url.searchParams.get('top_n'), 20);
    const region = (url.searchParams.get('region') ?? 'STG').toUpperCase() as Region;

    const nodes = rankingsData
      .filter((item) => item.region === region)
      .slice(0, topN)
      .map((item) => ({ id: item.gene, rank: item.rank, score: item.score, status: item.status, degree: item.network_degree }));

    const edges: NetworkResponse['edges'] = [
      { source: 'APOE', target: 'CLU', weight: 0.91 },
      { source: 'APOE', target: 'BIN1', weight: 0.87 },
      { source: 'CLU', target: 'BIN1', weight: 0.76 },
      { source: 'BIN1', target: 'PICALM', weight: 0.72 },
      { source: 'APOE', target: 'TREM2', weight: 0.84 },
    ].filter((edge) => nodes.some((n) => n.id === edge.source) && nodes.some((n) => n.id === edge.target));

    return { nodes, edges } as T;
  }

  if (method === 'GET' && pathname === '/api/metrics') {
    return metricsData as T;
  }

  if (method === 'GET' && pathname === '/api/methylation/distribution') {
    const region = (url.searchParams.get('region') ?? 'STG').toUpperCase() as Region;
    const gene = url.searchParams.get('gene');

    if (!gene) {
      return methylationData[region] as T;
    }

    const seeded = gene.toUpperCase().charCodeAt(0);
    const base = methylationData[region];
    return {
      ...base,
      mean_delta_beta: Number((base.mean_delta_beta + (seeded % 7) * 0.003).toFixed(3)),
    } as T;
  }

  if (method !== 'GET') {
    return {
      success: true,
      mock: true,
      path: pathname,
      method,
      payload: options.body ?? null,
    } as T;
  }

  throw new Error(`Mock route not implemented: ${method} ${pathname}`);
};

export const apiRequest = async <T>(path: string, options: ApiRequestOptions = {}): Promise<T> => {
  if (API_MODE === 'mock') {
    return mockApiRequest<T>(path, options);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    let message = `API request failed: ${response.status}`;
    try {
      const data = (await response.json()) as { error?: string; message?: string };
      message = data.error ?? data.message ?? message;
    } catch {
      // Non-JSON error response.
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
};

export const getRankings = async (params?: {
  region?: RegionFilter;
  limit?: number;
  status?: 'all' | GeneStatus;
}): Promise<RankingsItem[]> => {
  const query = new URLSearchParams();
  query.set('region', (params?.region ?? 'stg').toUpperCase());
  query.set('limit', String(params?.limit ?? 50));
  query.set('status', params?.status ?? 'all');

  return apiRequest<RankingsItem[]>(`/api/rankings?${query.toString()}`, { method: 'GET' });
};

export const getExplain = async (gene: string): Promise<ExplainResponse> => {
  return apiRequest<ExplainResponse>(`/api/explain/${encodeURIComponent(gene)}`, { method: 'GET' });
};

export const getGene = async (gene: string): Promise<GeneProfileResponse> => {
  return apiRequest<GeneProfileResponse>(`/api/gene/${encodeURIComponent(gene)}`, { method: 'GET' });
};

export const getNetwork = async (params?: {
  top_n?: number;
  region?: Region;
}): Promise<NetworkResponse> => {
  const query = new URLSearchParams();
  query.set('top_n', String(params?.top_n ?? 20));
  query.set('region', params?.region ?? 'STG');

  return apiRequest<NetworkResponse>(`/api/network?${query.toString()}`, { method: 'GET' });
};

export const getMetrics = async (): Promise<MetricsResponse> => {
  return apiRequest<MetricsResponse>('/api/metrics', { method: 'GET' });
};

export const getMethylationDistribution = async (params?: {
  region?: Region;
  gene?: string;
}): Promise<MethylationDistributionResponse> => {
  const query = new URLSearchParams();
  query.set('region', params?.region ?? 'STG');
  if (params?.gene) {
    query.set('gene', params.gene);
  }

  return apiRequest<MethylationDistributionResponse>(
    `/api/methylation/distribution?${query.toString()}`,
    { method: 'GET' }
  );
};
