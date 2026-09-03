import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { useUiStore } from '../stores/ui-store'
import { BottomModeBar } from './bottom-mode-bar'

afterEach(() => {
  cleanup()
  useUiStore.setState({ activeWorkspaceMode: 'mechanical' })
})

describe('workspace modes', () => {
  it('exposes only real Mechanical, Layers, and History views', () => {
    render(<BottomModeBar version={3} campaignName="Static Bloom" />)
    expect(screen.getAllByRole('button')).toHaveLength(3)
    expect(screen.getByRole('button', { name: 'Mechanical' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('button', { name: 'Notes' })).not.toBeInTheDocument()
  })

  it('opens Layers and History through presentation state', () => {
    render(<BottomModeBar version={3} campaignName="Static Bloom" />)
    fireEvent.click(screen.getByRole('button', { name: 'Layers' }))
    expect(useUiStore.getState().activeWorkspaceMode).toBe('layers')
    expect(screen.getByRole('button', { name: 'Layers' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'History' }))
    expect(useUiStore.getState().activeWorkspaceMode).toBe('history')
  })
})
