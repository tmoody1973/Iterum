import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import Home from '../app/page'

describe('Iterum workspace shell', () => {
  it('exposes the production desk landmarks and campaign context', () => {
    render(<Home />)

    expect(screen.getByRole('banner', { name: /iterum/i })).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: /campaign job ticket/i })).toBeInTheDocument()
    expect(screen.getByRole('main', { name: /working mechanical/i })).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: /review tray/i })).toBeInTheDocument()
    expect(screen.getAllByText(/static bloom/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/webmcp/i)).toBeInTheDocument()
  })
})
