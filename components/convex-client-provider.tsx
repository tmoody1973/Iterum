'use client'

import { ConvexProvider, ConvexReactClient } from 'convex/react'
import type { ReactNode } from 'react'

export const convexDeploymentUrl = process.env.NEXT_PUBLIC_CONVEX_URL

const convexClient = convexDeploymentUrl ? new ConvexReactClient(convexDeploymentUrl) : null

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!convexClient) return children
  return <ConvexProvider client={convexClient}>{children}</ConvexProvider>
}
