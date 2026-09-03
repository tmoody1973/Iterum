import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createDemoWorkspaceState } from '../../lib/domain/demo-data'
import { createWorkspaceRuntime } from '../../lib/domain/workspace-runtime'
import { ReviewTray } from '../review/review-tray'
import { OrganizeStudio } from './organize-studio'

afterEach(cleanup)

describe('Organize direction', () => {
  it('creates a review-only preview with a protected-item summary and designer approval', () => {
    const runtime = createWorkspaceRuntime(createDemoWorkspaceState())
    const onProposed = vi.fn()
    const view = render(<OrganizeStudio snapshot={runtime.getSnapshot()} runtime={runtime} selectedItemId={null} onClose={vi.fn()} onProposed={onProposed} />)
    expect(screen.getByLabelText('Scope')).toHaveValue('route:route-synthetic')
    expect(screen.getByText('2 items')).toBeInTheDocument()
    expect(screen.getByText('1 untouched')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Generate preview' }))
    expect(runtime.getSnapshot().version).toBe(4)
    expect(runtime.getSnapshot().boardItems.every((item) => !item.hierarchyRole)).toBe(true)
    expect(runtime.getSnapshot().layoutProposals[0].organization).toMatchObject({ strategy: 'type', untouchedLockedItemIds: ['reference-type-study'] })
    expect(onProposed).toHaveBeenCalledWith('organization-route-route-synthetic-type-v3')

    view.rerender(<ReviewTray snapshot={runtime.getSnapshot()} runtime={runtime} />)
    expect(screen.getByRole('article', { name: /direction draft: organize synthetic warmth by type/i })).toHaveTextContent('Organization preview')
    expect(screen.getByText('hero')).toBeInTheDocument()
    expect(screen.getByText(/protected item remains untouched/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Apply organization' }))
    expect(runtime.getSnapshot().boardItems.find((item) => item.id === 'type-specimen-headline')).toMatchObject({ hierarchyRole: 'hero', groupLabel: 'Typography' })
    expect(runtime.getSnapshot().boardItems.find((item) => item.id === 'reference-type-study')?.groupId).toBeUndefined()
  })
})
