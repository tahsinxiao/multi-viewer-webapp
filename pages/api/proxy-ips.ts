import type { NextApiRequest, NextApiResponse } from 'next'

interface ProxyIP {
  ip: string
  port: number
  protocol: string
  lastFetched: number
  score: number
}

interface CachedProxies {
  proxies: ProxyIP[]
  lastUpdated: number
}

let proxyCache: CachedProxies = {
  proxies: [],
  lastUpdated: 0
}

const CACHE_DURATION = 15 * 60 * 1000
const MIN_PROXIES_REQUIRED = 8

const proxyProviders = [
  {
    name: 'proxy-list-api',
    url: 'https://www.proxy-list.download/api/v1/get?type=http'
  },
  {
    name: 'proxyscrape',
    url: 'https://api.proxyscrape.com/v2/?request=get&protocol=http&timeout=10000&ssl=all&anonymity=all&country=all&simplify=true&limit=5'
  }
]

async function fetchProxiesFromProvider(provider: typeof proxyProviders[0]): Promise<ProxyIP[]> {
  try {
    const response = await fetch(provider.url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
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
            protocol: item.protocol || 'http',
            lastFetched: Date.now(),
            score: Math.random() * 100
          })
        }
      })
    } else if (data.proxies && Array.isArray(data.proxies)) {
      data.proxies.slice(0, 2).forEach((proxy: string) => {
        const [ip, port] = proxy.split(':')
        if (ip && port) {
          proxies.push({
            ip,
            port: parseInt(port),
            protocol: 'http',
            lastFetched: Date.now(),
            score: Math.random() * 100
          })
        }
      })
    }

    return proxies
  } catch (error) {
    console.error(`Error fetching from ${provider.name}:`, error)
    return []
  }
}

async function fetchFreshProxies(): Promise<ProxyIP[]> {
  const allProxies: ProxyIP[] = []

  const promises = proxyProviders.map(provider => fetchProxiesFromProvider(provider))
  const results = await Promise.all(promises)

  results.forEach(proxies => {
    allProxies.push(...proxies)
  })

  const uniqueProxies = Array.from(
    new Map(allProxies.map(p => [`${p.ip}:${p.port}`, p])).values()
  )

  return uniqueProxies.sort((a, b) => b.score - a.score).slice(0, 12)
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ proxies: ProxyIP[], cached: boolean, nextRefresh: number }>
) {
  try {
    const now = Date.now()
    const shouldRefresh = now - proxyCache.lastUpdated > CACHE_DURATION

    if (shouldRefresh || proxyCache.proxies.length < MIN_PROXIES_REQUIRED) {
      const freshProxies = await fetchFreshProxies()
      proxyCache.proxies = freshProxies
      proxyCache.lastUpdated = now
    }

    const selectedProxies = proxyCache.proxies.slice(0, 8)

    res.status(200).json({
      proxies: selectedProxies,
      cached: !shouldRefresh,
      nextRefresh: proxyCache.lastUpdated + CACHE_DURATION
    })
  } catch (error) {
    console.error('Proxy fetch error:', error)
    res.status(500).json({
      proxies: proxyCache.proxies.slice(0, 8),
      cached: true,
      nextRefresh: proxyCache.lastUpdated + CACHE_DURATION
    })
  }
