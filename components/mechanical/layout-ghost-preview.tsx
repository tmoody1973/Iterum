'use client'

import { Group, Rect, Text } from 'react-konva'

import { projectBoardLayout } from '../../lib/domain/board-layout'
import type { BoardLayoutProposal, WorkspaceState } from '../../lib/domain/types'

export function BoardGroupOutlines({ snapshot }: { snapshot: WorkspaceState }) {
  const groupIds = [...new Set(snapshot.boardItems.map((item) => item.groupId).filter(Boolean) as string[])]
  return <Group listening={false}>{groupIds.map((groupId) => {
    const members = snapshot.boardItems.filter((item) => item.groupId === groupId)
    const heroCount = members.filter((item) => item.hierarchyRole === 'hero').length
    const primaryCount = members.filter((item) => item.hierarchyRole === 'primary').length
    const supportingCount = members.filter((item) => item.hierarchyRole === 'supporting').length
    const hierarchySummary = [heroCount && `${heroCount} HERO`, primaryCount && `${primaryCount} PRIMARY`, supportingCount && `${supportingCount} SUPPORTING`].filter(Boolean).join(' · ')
    const left = Math.min(...members.map((item) => item.position.x)) - 10
    const top = Math.min(...members.map((item) => item.position.y)) - 24
    const right = Math.max(...members.map((item) => item.position.x + item.width)) + 10
    const bottom = Math.max(...members.map((item) => item.position.y + item.height)) + 10
    return <Group key={groupId}><Rect x={left} y={top} width={right - left} height={bottom - top} stroke="#315f98" strokeWidth={2} dash={[6, 4]} /><Rect x={left} y={top} width={Math.min(right - left, 250)} height={18} fill="#315f98" /><Text x={left + 6} y={top + 5} width={Math.max(40, Math.min(right - left - 12, 238))} text={`ORGANIZED / ${members[0]?.groupLabel ?? groupId}${hierarchySummary ? ` · ${hierarchySummary}` : ''}`} fontFamily="IBM Plex Mono" fontStyle="bold" fontSize={8} fill="#f2eee5" /></Group>
  })}</Group>
}

export function BoardHierarchyLabels({ snapshot }: { snapshot: WorkspaceState }) {
  return <Group listening={false}>{snapshot.boardItems.filter((item) => item.hierarchyRole).map((item) => {
    const label = `${item.hierarchyRole!.toUpperCase()} / ${(item.groupLabel ?? 'ORGANIZED').toUpperCase()}`
    const labelWidth = Math.min(item.width, Math.max(72, label.length * 5.2 + 12))
    return <Group key={`hierarchy-${item.id}`} x={item.position.x} y={item.position.y}><Rect width={labelWidth} height={18} fill="#315f98" /><Text x={6} y={5} width={labelWidth - 12} text={label} fontFamily="IBM Plex Mono" fontStyle="bold" fontSize={8} fill="#f2eee5" /></Group>
  })}</Group>
}

export function LayoutGhostPreview({ snapshot, proposal }: { snapshot: WorkspaceState; proposal: BoardLayoutProposal }) {
  const currentIds = new Set(snapshot.boardItems.map((item) => item.id))
  const projected = projectBoardLayout(snapshot.boardItems, proposal)
  const changedIds = new Set([...proposal.changes.map((change) => change.itemId), ...proposal.notes.map((note) => note.id)])
  const changed = projected.filter((item) => changedIds.has(item.id))
  const groupIds = [...new Set(changed.map((item) => item.groupId).filter(Boolean) as string[])]
  const assignments = new Map(proposal.organization?.assignments.map((assignment) => [assignment.itemId, assignment]))
  const untouchedLocked = proposal.organization?.untouchedLockedItemIds.map((id) => snapshot.boardItems.find((item) => item.id === id)).filter(Boolean) ?? []
  const unresolved = proposal.organization?.unresolvedItems.map((entry) => ({ entry, item: snapshot.boardItems.find((item) => item.id === entry.itemId) })).filter(({ item }) => Boolean(item)) ?? []

  return <Group listening={false}>
    {changed.map((item) => <Group key={`ghost-${item.id}`} x={item.position.x} y={item.position.y} opacity={currentIds.has(item.id) ? .48 : .72}>
      <Rect width={item.width} height={item.height} fill={item.kind === 'note' ? 'rgba(71,121,184,.16)' : 'rgba(71,121,184,.08)'} stroke="#4779b8" strokeWidth={3} dash={[10, 7]} />
      <Text x={10} y={10} width={Math.max(40, item.width - 20)} text={`${assignments.get(item.id)?.role?.toUpperCase() ?? (item.kind === 'note' ? 'NEW NOTE' : 'PROPOSED')}\n${item.title.toUpperCase()}`} fontFamily="IBM Plex Mono" fontSize={8} fontStyle={assignments.get(item.id)?.role === 'hero' ? 'bold' : 'normal'} lineHeight={1.35} fill="#315f98" />
      {item.kind === 'note' && <Text x={10} y={46} width={Math.max(40, item.width - 20)} height={Math.max(30, item.height - 58)} text={item.noteBody ?? ''} fontFamily="IBM Plex Mono" fontSize={9} lineHeight={1.3} fill="#315f98" />}
    </Group>)}
    {groupIds.map((groupId) => {
      const members = projected.filter((item) => item.groupId === groupId)
      const left = Math.min(...members.map((item) => item.position.x)) - 14
      const top = Math.min(...members.map((item) => item.position.y)) - 24
      const right = Math.max(...members.map((item) => item.position.x + item.width)) + 14
      const bottom = Math.max(...members.map((item) => item.position.y + item.height)) + 14
      return <Group key={`group-${groupId}`}><Rect x={left} y={top} width={right - left} height={bottom - top} stroke={proposal.organization ? '#4779b8' : '#a05040'} strokeWidth={2} dash={[4, 5]} /><Text x={left + 6} y={top + 6} text={`${proposal.organization ? 'CLUSTER' : 'GROUP'} / ${members[0]?.groupLabel ?? groupId}`} fontFamily="IBM Plex Mono" fontSize={8} fill={proposal.organization ? '#315f98' : '#a05040'} /></Group>
    })}
    {untouchedLocked.map((item) => item && <Group key={`locked-${item.id}`}><Rect x={item.position.x} y={item.position.y} width={item.width} height={item.height} stroke="#554a3d" strokeWidth={2} dash={[2, 6]} /><Text x={item.position.x + 8} y={item.position.y + item.height - 18} text="LOCKED / UNTOUCHED" fontFamily="IBM Plex Mono" fontSize={8} fill="#554a3d" /></Group>)}
    {unresolved.map(({ entry, item }) => item && <Group key={`unresolved-${item.id}`}><Rect x={item.position.x} y={item.position.y} width={item.width} height={item.height} stroke="#a86f2c" strokeWidth={2} dash={[8, 5]} /><Text x={item.position.x + 8} y={item.position.y + 8} width={Math.max(40, item.width - 16)} text={`UNRESOLVED\n${entry.reason}`} fontFamily="IBM Plex Mono" fontSize={8} lineHeight={1.3} fill="#7e4d16" /></Group>)}
  </Group>
}
