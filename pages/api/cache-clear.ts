import type { NextApiRequest, NextApiResponse } from 'next'

interface CacheResponse {
  success: boolean
  message: string
  clearedAt: number
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<CacheResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
      clearedAt: 0
    })
  }

  try {
    res.setHeader('Clear-Site-Data', '"cache", "cookies", "storage"')
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')

    res.status(200).json({
      success: true,
      message: 'Cache cleared successfully',
      clearedAt: Date.now()
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to clear cache',
      clearedAt: 0
    })
  }
