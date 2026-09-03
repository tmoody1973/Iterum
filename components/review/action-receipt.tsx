'use client'

import { useEffect, useState } from 'react'
import { Check, RotateCcw, X } from 'lucide-react'

import type { WorkspaceRuntime } from '../../lib/domain/workspace-runtime'
import type { ActionReceipt as Receipt } from '../../lib/domain/types'

export function ActionReceipt({ receipt, runtime }: { receipt?: Receipt; runtime: WorkspaceRuntime }) {
  const [visibleReceiptId, setVisibleReceiptId] = useState<string | null>(null)

  useEffect(() => {
    if (!receipt) {
      setVisibleReceiptId(null)
      return
    }
    setVisibleReceiptId(receipt.id)
    const timeout = window.setTimeout(() => setVisibleReceiptId(null), 7000)
    return () => window.clearTimeout(timeout)
  }, [receipt])

  if (!receipt || visibleReceiptId !== receipt.id) return null
  const snapshot = runtime.getSnapshot()
  const placedItemId = receipt.undo?.type === 'approval' || receipt.undo?.type === 'proposal' ? receipt.undo.placedItemId : undefined
  const placedItem = placedItemId ? snapshot.boardItems.find((item) => item.id === placedItemId) : undefined
  const undo = () => runtime.dispatch({ type: 'undo-receipt', campaignId: snapshot.campaign.id, boardId: snapshot.campaign.boardId, expectedVersion: snapshot.version, idempotencyKey: crypto.randomUUID(), actor: 'designer', receiptId: receipt.id })
  return <section className="action-toast" aria-label="Latest action receipt">
    <span className="visually-hidden" aria-live="polite">{receipt.summary}</span>
    <span className="receipt-check" aria-hidden="true"><Check /></span>
    <p><strong>{receipt.action.replaceAll('-', ' ')}</strong> · {receipt.summary}<small>Actor: {receipt.actor} · Board V{String(receipt.version).padStart(2, '0')} · {placedItem ? `Placed at X ${placedItem.position.x} · Y ${placedItem.position.y} · ` : ''}{new Date(receipt.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</small></p>
    {receipt.undoable ? <button type="button" onClick={undo}><RotateCcw aria-hidden="true" />Undo</button> : <span className="receipt-locked">Recorded</span>}
    <button type="button" className="action-toast-dismiss" aria-label="Dismiss action receipt" onClick={() => setVisibleReceiptId(null)}><X aria-hidden="true" /></button>
  </section>
}
