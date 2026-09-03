import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ProjectController, ProjectSaveStatus, ProjectSummary } from '../../lib/persistence/project-controller'
import { ProjectSwitcher } from './project-switcher'

const projects: ProjectSummary[] = [
  { id: 'one', projectKey: 'cloud-proof-one', name: 'Cloud Proof', campaignId: 'campaign-one', boardId: 'board-one', workspaceVersion: 4, headRevision: 8, createdAt: 1, updatedAt: 2 },
  { id: 'two', projectKey: 'pivot-campaign-two', name: 'Pivot Campaign', campaignId: 'campaign-two', boardId: 'board-two', workspaceVersion: 2, headRevision: 3, createdAt: 1, updatedAt: 2 },
]

const status: ProjectSaveStatus = { phase: 'saved', projectKey: 'cloud-proof-one', headRevision: 8, savedWorkspaceVersion: 4, lastSavedAt: 2, message: 'Saved to Convex' }

function controller(): ProjectController {
  return {
    getStatus: vi.fn(() => status),
    listProjects: vi.fn(async () => projects),
    createProject: vi.fn(),
    openProject: vi.fn(),
    flush: vi.fn(async () => status),
    createVersion: vi.fn(),
    listVersions: vi.fn(async () => []),
    restoreVersion: vi.fn(),
  }
}

afterEach(cleanup)

describe('ProjectSwitcher', () => {
  it('shows cloud state and opens another recent project', async () => {
    const projectController = controller()
    render(<ProjectSwitcher currentProjectName="Cloud Proof" controller={projectController} status={status} />)

    const trigger = screen.getByRole('button', { name: /Cloud Proof/i })
    expect(trigger).toHaveTextContent('Cloud saved')
    fireEvent.click(trigger)

    expect(await screen.findByRole('dialog', { name: 'Switch cloud project' })).toBeInTheDocument()
    expect(projectController.listProjects).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: /Pivot Campaign/i }))
    expect(projectController.openProject).toHaveBeenCalledWith('pivot-campaign-two')
  })

  it('links to the complete project library and closes with Escape', async () => {
    const projectController = controller()
    render(<ProjectSwitcher currentProjectName="Cloud Proof" controller={projectController} status={status} />)

    const trigger = screen.getByRole('button', { name: /Cloud Proof/i })
    fireEvent.click(trigger)
    expect(await screen.findByRole('link', { name: /All projects/i })).toHaveAttribute('href', '/projects')

    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Switch cloud project' })).not.toBeInTheDocument())
    expect(trigger).toHaveFocus()
  })
})
