import React, { useState, useRef } from 'react'
import styles from '@/styles/ViewerTab.module.css'

interface ProxyIP {
  ip: string
  port: number
  protocol: string
  lastFetched: number
  score: number
}

interface ViewerTabProps {
  tabIndex: number
  url: string
  onUrlChange: (url: string) => void
  proxy?: ProxyIP
  loading?: boolean
}

export default function ViewerTab({
  tabIndex,
  url,
  onUrlChange,
  proxy,
  loading
}: ViewerTabProps) {
  const [inputValue, setInputValue] = useState(url)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }

  const handleNavigate = () => {
    let urlToNavigate = inputValue.trim()
    if (!urlToNavigate) return

    // Add protocol if missing
    if (!urlToNavigate.startsWith('http://') && !urlToNavigate.startsWith('https://')) {
      urlToNavigate = 'https://' + urlToNavigate
    }

    onUrlChange(urlToNavigate)
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleNavigate()
    }
  }

  const handleRefresh = () => {
    if (iframeRef.current) {
      iframeRef.current.src = url
    }
  }

  return (
    <div className={styles.tab}>
      <div className={styles.tabHeader}>
        <div className={styles.tabNumber}>Tab {tabIndex + 1}</div>
        <div className={styles.proxyInfo}>
          {proxy ? (
            <span className={styles.proxyBadge}>
              🌐 {proxy.ip}:{proxy.port}
            </span>
          ) : (
            <span className={styles.proxyBadge}>⏳ Loading IP...</span>
          )}
        </div>
      </div>

      <div className={styles.urlBar}>
        <input
          type="text"
          placeholder="Enter URL or search..."
          value={inputValue}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          className={styles.urlInput}
        />
        <button onClick={handleNavigate} className={styles.goBtn} title="Navigate">
          ➜
        </button>
        <button onClick={handleRefresh} className={styles.refreshBtn} title="Refresh">
          ↻
        </button>
      </div>

      <div className={styles.viewerContainer}>
        {url ? (
          <iframe
            ref={iframeRef}
            src={url}
            className={styles.iframe}
            title={`Viewer Tab ${tabIndex + 1}`}
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-pointer-lock"
          />
        ) : (
          <div className={styles.placeholder}>
            <p>Enter a URL to get started</p>
            <small>This tab will use IP: {proxy?.ip || 'Loading...'}</small>
          </div>
        )}
      </div>
    </div>
  )
}
