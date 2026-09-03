'use client'

import { Cloud, History, RotateCcw, Save, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import type { ActionReceipt, WorkspaceState } from '../../lib/domain/types'
import type { WorkspaceRuntime } from '../../lib/domain/workspace-runtime'
import type { ProjectController, ProjectVersionSummary } from '../../lib/persistence/project-controller'

function actionLabel(receipt: ActionReceipt) {
  return receipt.action.replaceAll('-', ' ')
}

export function ActionHistory({ snapshot, runtime, onClose, projectController }: { snapshot: WorkspaceState; runtime: WorkspaceRuntime; onClose: () => void; projectController?: ProjectController }) {
  const [versions, setVersions] = useState<ProjectVersionSummary[]>([])
  const [cloudMessage, setCloudMessage] = useState('')
  const [cloudBusy, setCloudBusy] = useState(false)
  const undo = (receipt: ActionReceipt) => runtime.dispatch({
    type: 'undo-receipt', campaignId: snapshot.campaign.id, boardId: snapshot.campaign.boardId,
    expectedVersion: snapshot.version, idempotencyKey: crypto.randomUUID(), actor: 'designer', receiptId: receipt.id,
  })

  const loadVersions = useCallback(async () => {
    if (!projectController) return
    try { setVersions(await projectController.listVersions()) }
    catch (error) { setCloudMessage(error instanceof Error ? error.message : 'Cloud versions are unavailable.') }
  }, [projectController])

  useEffect(() => { void loadVersions() }, [loadVersions])

  const createVersion = async () => {
    if (!projectController || cloudBusy) return
    setCloudBusy(true); setCloudMessage('Creating recovery point…')
    try {
      await projectController.createVersion(`Checkpoint V${String(snapshot.version).padStart(2, '0')}`, 'designer', crypto.randomUUID())
      setCloudMessage('Recovery point created.'); await loadVersions()
    } catch (error) { setCloudMessage(error instanceof Error ? error.message : 'The recovery point could not be created.') }
    finally { setCloudBusy(false) }
  }

  const restoreVersion = async (version: ProjectVersionSummary) => {
    if (!projectController || cloudBusy) return
    setCloudBusy(true); setCloudMessage(`Restoring ${version.label}…`)
    try {
      await projectController.restoreVersion(version.id, 'designer', crypto.randomUUID())
      setCloudMessage(`${version.label} restored as a new head.`); await loadVersions()
    } catch (error) { setCloudMessage(error instanceof Error ? error.message : 'The version could not be restored.') }
    finally { setCloudBusy(false) }
  }

  return <aside className="mechanical-side-panel history-panel" id="mechanical-side-panel" aria-labelledby="history-panel-title">
    <header className="mechanical-panel-heading">
      <span><History aria-hidden="true" /><strong id="history-panel-title">History</strong></span>
      <button type="button" aria-label="Close History" onClick={onClose}><X aria-hidden="true" /></button>
    </header>
    <p className="mechanical-panel-intro">Versioned actions remain here after the temporary notification disappears.</p>
    {projectController && <section className="cloud-version-history" aria-labelledby="cloud-version-title">
      <header><span><Cloud aria-hidden="true" /><strong id="cloud-version-title">Cloud recovery</strong></span><button type="button" onClick={createVersion} disabled={cloudBusy}><Save aria-hidden="true" />Create checkpoint</button></header>
      {cloudMessage && <p role="status">{cloudMessage}</p>}
      {versions.length ? <ol>{versions.map((version) => <li key={version.id}><span><strong>{version.label}</strong><small>{version.kind} · Board V{String(version.workspaceVersion).padStart(2, '0')} · {new Date(version.createdAt).toLocaleString()}</small></span><button type="button" disabled={cloudBusy} onClick={() => restoreVersion(version)}>Restore</button></li>)}</ol> : <p>No cloud recovery points yet.</p>}
    </section>}
    {snapshot.receipts.length ? <ol className="history-list">
      {snapshot.receipts.map((receipt) => <li key={receipt.id}>
        <div className="history-item-heading"><strong>V{String(receipt.version).padStart(2, '0')}</strong><span>{actionLabel(receipt)}</span><time dateTime={receipt.timestamp}>{new Date(receipt.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time></div>
        <p>{receipt.summary}</p>
        <footer><span>Actor: {receipt.actor}</span>{receipt.undoable ? <button type="button" onClick={() => undo(receipt)} aria-label={`Undo ${receipt.summary}`}><RotateCcw aria-hidden="true" />Undo</button> : <span>Recorded</span>}</footer>
      </li>)}
    </ol> : <p className="history-empty">No completed actions yet. Approved, rejected, moved, resized, and undone actions will be recorded here.</p>}
  </aside>
}
