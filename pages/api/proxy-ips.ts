import type { NextApiRequest, NextApiResponse } from 'next'

interface ProxyIP {
  ip: string
  port: number
  protocol: string
  lastFetched: number
  score: number
}

let proxyCache: { proxies: ProxyIP[]; lastUpdated: number } = {
  proxies: [],
  lastUpdated: 0
}

const CACHE_DURATION = 15 * 60 * 1000
const MIN_PROXIES_REQUIRED = 8

const proxyProviders = [
  'https://www.proxy-list.download/api/v1/get?type=http',
  'https://api.proxyscrape.com/v2/?request=get&protocol=http&timeout=10000&ssl=all&anonymity=all&country=all&simplify=true&limit=5'
]

async function fetchProxiesFromUrl(url: string): Promise<ProxyIP[]> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    if (!response.ok) return []
    const data = await response.json()
    const proxies: ProxyIP[] = []

    if (Array.isArray(data)) {
      data.slice(0, 2).forEach((item: any) => {
        if (item.ip && item.port) {
          proxies.push({
            ip: item.ip,
            port: parseInt(item.port),
            protocol: 'http',
            lastFetched: Date.now(),
            score: Math.random() * 100
          })
        }
      })
    }
    return proxies
  } catch {
    return []
  }
}

async function fetchFreshProxies(): Promise<ProxyIP[]> {
  const allProxies: ProxyIP[] = []
  const results = await Promise.all(proxyProviders.map(url => fetchProxiesFromUrl(url)))
  results.forEach(p => allProxies.push(...p))
  const unique = Array.from(new Map(allProxies.map(p => [`${p.ip}:${p.port}`, p])).values())
  return unique.sort((a, b) => b.score - a.score).slice(0, 12)
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ proxies: ProxyIP[]; cached: boolean; nextRefresh: number }>
) {
  try {
    const now = Date.now()
    const shouldRefresh = now - proxyCache.lastUpdated > CACHE_DURATION

    if (shouldRefresh || proxyCache.proxies.length < MIN_PROXIES_REQUIRED) {
      proxyCache.proxies = await fetchFreshProxies()
      proxyCache.lastUpdated = now
    }

    res.status(200).json({
      proxies: proxyCache.proxies.slice(0, 8),
      cached: !shouldRefresh,
      nextRefresh: proxyCache.lastUpdated + CACHE_DURATION
    })
  } catch (error) {
    res.status(500).json({
      proxies: proxyCache.proxies.slice(0, 8),
      cached: true,
      nextRefresh: proxyCache.lastUpdated + CACHE_DURATION
    })
  }
}
