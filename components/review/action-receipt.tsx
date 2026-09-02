'use client'

import { Check, RotateCcw } from 'lucide-react'

import type { WorkspaceRuntime } from '../../lib/domain/workspace-runtime'
import type { ActionReceipt as Receipt } from '../../lib/domain/types'

export function ActionReceipt({ receipt, runtime }: { receipt?: Receipt; runtime: WorkspaceRuntime }) {
  if (!receipt) return <section className="approval-receipt is-empty" aria-label="Latest action receipt"><p><strong>No action receipt yet.</strong><small>Approve, reject, or change the placement policy to record a versioned decision.</small></p></section>
  const snapshot = runtime.getSnapshot()
  const placedItemId = receipt.undo?.type === 'approval' || receipt.undo?.type === 'proposal' ? receipt.undo.placedItemId : undefined
  const placedItem = placedItemId ? snapshot.boardItems.find((item) => item.id === placedItemId) : undefined
  const undo = () => runtime.dispatch({ type: 'undo-receipt', campaignId: snapshot.campaign.id, boardId: snapshot.campaign.boardId, expectedVersion: snapshot.version, idempotencyKey: crypto.randomUUID(), actor: 'designer', receiptId: receipt.id })
  return <section className="approval-receipt" aria-label="Latest action receipt">
    <span className="receipt-check" aria-hidden="true"><Check /></span>
    <p><strong>{receipt.action.replaceAll('-', ' ')}</strong> · {receipt.summary}<small>Actor: {receipt.actor} · Board V{String(receipt.version).padStart(2, '0')} · {placedItem ? `Placed at X ${placedItem.position.x} · Y ${placedItem.position.y} · ` : ''}{new Date(receipt.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</small></p>
    {receipt.undoable ? <button type="button" onClick={undo}><RotateCcw aria-hidden="true" />Undo</button> : <span className="receipt-locked">Recorded</span>}
  </section>
}
