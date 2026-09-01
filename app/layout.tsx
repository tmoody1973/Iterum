'use client'

import { useEffect, useRef } from 'react'
import './globals.css'

const DIRECTION_CONTRACT = `THESIS: Iterum turns sourced agent proposals into designer-approved, reversible paste-up; it refuses the generic infinite whiteboard with a chatbot beside it.
OWN-WORLD: Wheat layout board, carbon-black chrome, non-photo-blue construction marks, muted ruby review notation, approval green, amber tape, crop targets, condensed grotesk type, and monospaced production labels.
STORY: Read the campaign ticket, judge a sourced proposal, preview its destination, approve it onto the mechanical, and retain an undoable action receipt.
FIRST VIEWPORT: A slim job ticket occupies the left, the working mechanical dominates the center, and the proposal galley occupies the right; Approve sits on the active proposal and placement resolves visibly into the board.
FORM: Paste-up Proofing Desk, grounded candidate 1; seed a6558f37.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance`

function DirectionContractMarker() {
  const markerRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const marker = markerRef.current

    if (
      !marker ||
      (marker.previousSibling?.nodeType === Node.COMMENT_NODE &&
        marker.previousSibling.textContent === DIRECTION_CONTRACT)
    ) {
      return
    }

    marker.parentNode?.insertBefore(document.createComment(DIRECTION_CONTRACT), marker)
  }, [])

  return <span ref={markerRef} data-direction-contract-marker hidden />
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <DirectionContractMarker />
        {children}
      </body>
    </html>
  )
}
