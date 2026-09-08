import React, { useState, useEffect } from 'react'
import Head from 'next/head'
import ViewerTab from '@/components/ViewerTab'
import styles from '@/styles/Home.module.css'

interface ProxyIP {
  ip: string
  port: number
  protocol: string
  lastFetched: number
  score: number
}

export default function Home() {
  const [proxies, setProxies] = useState<ProxyIP[]>([])
  const [urls, setUrls] = useState<string[]>(Array(8).fill(''))
  const [loading, setLoading] = useState(true)
  const [cacheInfo, setCacheInfo] = useState<{ cached: boolean; nextRefresh: number }>({
    cached: false,
    nextRefresh: 0
  })

  // Fetch proxies on component mount and setup auto-refresh
  useEffect(() => {
    fetchProxies()
    const interval = setInterval(fetchProxies, 15 * 60 * 1000) // Refresh every 15 minutes
    return () => clearInterval(interval)
  }, [])

  const fetchProxies = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/proxy-ips')
      const data = await response.json()
      setProxies(data.proxies)
      setCacheInfo({
        cached: data.cached,
        nextRefresh: data.nextRefresh
      })
    } catch (error) {
      console.error('Failed to fetch proxies:', error)
    } finally {
      setLoading(false)
    }
  }

  const clearCache = async () => {
    try {
      await fetch('/api/cache-clear', { method: 'POST' })
      // Also clear localStorage
      localStorage.clear()
      // Clear session storage
      sessionStorage.clear()
      alert('Cache cleared successfully!')
      window.location.reload()
    } catch (error) {
      console.error('Failed to clear cache:', error)
      alert('Failed to clear cache')
    }
  }

  const handleUrlChange = (index: number, url: string) => {
    const updatedUrls = [...urls]
    updatedUrls[index] = url
    setUrls(updatedUrls)
  }

  const refreshAllProxies = () => {
    fetchProxies()
  }

  const formatTimeUntilRefresh = () => {
    const now = Date.now()
    const timeLeft = Math.max(0, cacheInfo.nextRefresh - now)
    const minutes = Math.floor(timeLeft / 60000)
    const seconds = Math.floor((timeLeft % 60000) / 1000)
    return `${minutes}m ${seconds}s`
  }

  return (
    <>
      <Head>
        <title>WellViewer - Multi-Viewer Web App</title>
        <meta name="description" content="Advanced multi-viewer with 8 tabs and dynamic proxy rotation" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <h1>WellViewer</h1>
            <p className={styles.subtitle}>8-Tab Multi-Viewer with Dynamic Proxy Rotation</p>
          </div>
          
          <div className={styles.controls}>
            <div className={styles.statusInfo}>
              <span className={styles.statusLabel}>
                {loading ? '⏳ Loading Proxies...' : '✓ Proxies Ready'}
              </span>
              <span className={styles.cacheStatus}>
                {cacheInfo.cached ? '📦 Cached' : '🔄 Fresh'} | Next refresh: {formatTimeUntilRefresh()}
              </span>
            </div>
            
            <div className={styles.buttonGroup}>
              <button 
                onClick={refreshAllProxies} 
                className={`${styles.btn} ${styles.btnPrimary}`}
                disabled={loading}
              >
                🔄 Refresh IPs
              </button>
              <button 
                onClick={clearCache} 
                className={`${styles.btn} ${styles.btnDanger}`}
              >
                🗑️ Clear Cache
              </button>
            </div>
          </div>
        </header>

        <div className={styles.gridContainer}>
          {Array(8).fill(0).map((_, index) => (
            <ViewerTab
              key={index}
              tabIndex={index}
              url={urls[index]}
              onUrlChange={(url) => handleUrlChange(index, url)}
              proxy={proxies[index]}
              loading={loading}
            />
          ))}
        </div>

        <footer className={styles.footer}>
          <p>💡 Tip: Each tab uses a different IP for privacy. Cache is automatically cleared.</p>
        </footer>
      </main>
    </>
  )
}