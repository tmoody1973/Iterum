import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Browser proof uses the loopback host named by the dev-server warning.
  allowedDevOrigins: ['127.0.0.1'],
}

export default nextConfig
