'use client'

import dynamic from 'next/dynamic'

const MechanicalCanvas = dynamic(() => import('./mechanical-canvas').then((module) => module.MechanicalCanvas), {
  ssr: false,
  loading: () => <div className="mechanical-canvas-loading" aria-label="Loading mechanical canvas" />,
})

export { MechanicalCanvas }
