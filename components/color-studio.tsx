'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, FlaskConical, ScanLine, X } from 'lucide-react'

import { extractPaletteFromImage } from '../lib/color/browser-extraction'
import type { ColorRole, ColorSource, ColorSwatch, WorkspaceState } from '../lib/domain/types'
import type { WorkspaceRuntime } from '../lib/domain/workspace-runtime'

type ProviderSwatch = { hex: string; name?: string }
type SystematicResult = { colors: ProviderSwatch[]; mode: string } | null
type ExperimentalResult = { colors: string[]; note: string } | null

const modes = ['analogic', 'monochrome', 'complement', 'triad', 'quad'] as const

function Swatch({ color, label, selected, onClick }: { color: string; label: string; selected?: boolean; onClick?: () => void }) {
  const content = <><span className="color-swatch-fill" style={{ backgroundColor: color }} aria-hidden="true" /><span>{label}</span></>
  return onClick ? <button type="button" className={`color-swatch${selected ? ' is-selected' : ''}`} onClick={onClick} aria-pressed={selected}>{content}</button> : <span className="color-swatch">{content}</span>
}

export function ColorStudio({ snapshot, runtime, onClose }: { snapshot: WorkspaceState; runtime: WorkspaceRuntime; onClose: () => void }) {
  const references = useMemo(() => snapshot.boardItems.filter((item) => item.imageUrl?.startsWith('/')), [snapshot.boardItems])
  const [referenceId, setReferenceId] = useState(() => references[1]?.id ?? references[0]?.id ?? '')
  const [crop, setCrop] = useState<'full' | 'center'>('center')
  const [localColors, setLocalColors] = useState<string[]>([])
  const [seed, setSeed] = useState('')
  const [lockedColors, setLockedColors] = useState<string[]>([])
  const [systematic, setSystematic] = useState<SystematicResult>(null)
  const [experimental, setExperimental] = useState<ExperimentalResult>(null)
  const [notice, setNotice] = useState('Select a reference or crop. Extraction happens locally in this browser.')
  const [isExtracting, setIsExtracting] = useState(false)
  const [isLoadingSystematic, setIsLoadingSystematic] = useState(false)
  const [isLoadingExperimental, setIsLoadingExperimental] = useState(false)
  const [mode, setMode] = useState<(typeof modes)[number]>('analogic')
  const reference = references.find((item) => item.id === referenceId)

  useEffect(() => {
    if (!reference?.imageUrl) return
    let active = true
    setIsExtracting(true)
    extractPaletteFromImage(reference.imageUrl, crop).then((colors) => {
      if (!active) return
      setLocalColors(colors)
      setSeed(colors[0] ?? '')
      setLockedColors(colors[0] ? [colors[0]] : [])
      setNotice('Local preview ready. Save it to make this extraction canonical and reproducible.')
    }).catch(() => active && setNotice('This reference could not be sampled locally. Try another reference or crop.')).finally(() => active && setIsExtracting(false))
    return () => { active = false }
  }, [reference?.imageUrl, crop])

  const savePalette = (next: WorkspaceState['colorPalette'], summary: string) => {
    const result = runtime.dispatch({
      type: 'set-color-palette', campaignId: snapshot.campaign.id, boardId: snapshot.campaign.boardId,
      expectedVersion: snapshot.version, idempotencyKey: crypto.randomUUID(), actor: 'designer', colorPalette: next,
    })
    setNotice(result.ok ? summary : result.error.message)
  }

  const saveExtraction = () => {
    if (!reference?.imageUrl || localColors.length === 0) return
    savePalette({
      extraction: { referenceId: reference.id, referenceLabel: reference.title, imageUrl: reference.imageUrl, crop, algorithm: 'iterum-pixel-quantize-v1', colors: localColors.map((hex) => ({ hex, source: 'local-extraction', role: 'extracted' })) },
      pinned: snapshot.colorPalette.pinned,
    }, `Saved ${localColors.length} locally extracted campaign colors.`)
  }

  const pin = (swatch: ProviderSwatch, source: ColorSource, role: ColorRole) => {
    if (snapshot.colorPalette.pinned.some((item) => item.hex === swatch.hex && item.source === source)) {
      setNotice(`${swatch.hex} is already pinned from this source.`)
      return
    }
    savePalette({ ...snapshot.colorPalette, pinned: [...snapshot.colorPalette.pinned, { hex: swatch.hex, ...(swatch.name ? { name: swatch.name } : {}), source, role }] }, `Pinned ${swatch.name ?? swatch.hex} to the campaign palette.`)
  }

  const toggleLock = (hex: string) => {
    setLockedColors((current) => current.includes(hex) ? current.filter((item) => item !== hex) : current.length < 2 ? [...current, hex] : [current[1], hex])
  }

  const requestSystematic = async () => {
    if (!seed) return
    setIsLoadingSystematic(true)
    try {
      const response = await fetch(`/api/color/scheme?hex=${encodeURIComponent(seed)}&mode=${mode}`)
      const payload = await response.json() as { colors?: ProviderSwatch[]; error?: string }
      if (!response.ok || !payload.colors) throw new Error(payload.error ?? 'The Color API is unavailable.')
      setSystematic({ colors: payload.colors, mode })
      setNotice(`The Color API returned a ${mode} scheme from ${seed}. Pin only what earns a role.`)
    } catch (error) { setNotice(error instanceof Error ? error.message : 'The Color API is unavailable.') } finally { setIsLoadingSystematic(false) }
  }

  const requestExperimental = async () => {
    if (lockedColors.length === 0) return
    setIsLoadingExperimental(true)
    try {
      const response = await fetch('/api/color/experimental', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ locked: lockedColors }) })
      const payload = await response.json() as { colors?: string[]; note?: string; error?: string }
      if (!response.ok || !payload.colors) throw new Error(payload.error ?? 'Colormind is unavailable.')
      setExperimental({ colors: payload.colors, note: payload.note ?? 'Experimental direction.' })
      setNotice('Experimental direction generated. It remains a proposal until you pin a swatch.')
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Colormind is unavailable.') } finally { setIsLoadingExperimental(false) }
  }

  return <aside className="color-studio" aria-label="Color studio">
    <header className="color-studio-heading"><span><ScanLine aria-hidden="true" />Color studio</span><button type="button" onClick={onClose} aria-label="Close Color studio"><X aria-hidden="true" /></button></header>
    <p className="color-studio-intro">Extract locally. Systematize with The Color API. Explore with Colormind. Only designer-pinned swatches change the campaign palette.</p>
    <div className="color-controls">
      <label>Reference<select value={referenceId} onChange={(event) => setReferenceId(event.target.value)}>{references.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
      <fieldset><legend>Sample</legend><label><input type="radio" checked={crop === 'center'} onChange={() => setCrop('center')} />Center crop</label><label><input type="radio" checked={crop === 'full'} onChange={() => setCrop('full')} />Full image</label></fieldset>
    </div>
    <section className="color-section" aria-labelledby="canonical-colors"><div className="color-section-heading"><h2 id="canonical-colors">Canonical extraction</h2><span>LOCAL</span></div>
      <div className="color-swatches">{localColors.map((hex) => <Swatch key={hex} color={hex} label={hex} selected={seed === hex} onClick={() => setSeed(hex)} />)}</div>
      <button type="button" className="color-primary" disabled={isExtracting || localColors.length === 0} onClick={saveExtraction}>{isExtracting ? 'Sampling locally…' : 'Save canonical extraction'}</button>
    </section>
    <section className="color-section" aria-labelledby="systematic-colors"><div className="color-section-heading"><h2 id="systematic-colors">Systematic variations</h2><span>THE COLOR API</span></div>
      <div className="color-control-row"><label>Harmony<select value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}>{modes.map((option) => <option key={option} value={option}>{option}</option>)}</select></label><button type="button" className="color-secondary" disabled={!seed || isLoadingSystematic} onClick={requestSystematic}>{isLoadingSystematic ? 'Generating…' : `Explore ${seed || 'seed'}`}</button></div>
      {systematic && <div className="color-swatches">{systematic.colors.map((color) => <Swatch key={`${systematic.mode}-${color.hex}`} color={color.hex} label={color.name ?? color.hex} onClick={() => pin(color, 'the-color-api', 'systematic')} />)}</div>}
    </section>
    <section className="color-section color-experimental" aria-labelledby="experimental-colors"><div className="color-section-heading"><h2 id="experimental-colors"><FlaskConical aria-hidden="true" />Unexpected harmonies</h2><span>EXPERIMENTAL</span></div>
      <p>Lock one or two local colors. Colormind may adjust them; it never writes to the palette automatically.</p>
      <div className="color-swatches">{localColors.map((hex) => <Swatch key={`lock-${hex}`} color={hex} label={lockedColors.includes(hex) ? 'Locked' : 'Lock'} selected={lockedColors.includes(hex)} onClick={() => toggleLock(hex)} />)}</div>
      <button type="button" className="color-secondary" disabled={lockedColors.length === 0 || isLoadingExperimental} onClick={requestExperimental}>{isLoadingExperimental ? 'Generating…' : `Generate from ${lockedColors.length} lock${lockedColors.length === 1 ? '' : 's'}`}</button>
      {experimental && <><div className="color-swatches">{experimental.colors.map((hex) => <Swatch key={`experiment-${hex}`} color={hex} label="Pin" onClick={() => pin({ hex }, 'colormind', 'experimental')} />)}</div><p className="color-provider-note">{experimental.note}</p></>}
    </section>
    <footer className="color-studio-status" aria-live="polite"><Check aria-hidden="true" />{notice}</footer>
  </aside>
}
