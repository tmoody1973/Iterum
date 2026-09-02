'use client'

import { Group, Rect, Text } from 'react-konva'

import { projectBoardLayout } from '../../lib/domain/board-layout'
import type { BoardLayoutProposal, WorkspaceState } from '../../lib/domain/types'

export function BoardGroupOutlines({ snapshot }: { snapshot: WorkspaceState }) {
  const groupIds = [...new Set(snapshot.boardItems.map((item) => item.groupId).filter(Boolean) as string[])]
  return <Group listening={false}>{groupIds.map((groupId) => {
    const members = snapshot.boardItems.filter((item) => item.groupId === groupId)
    const left = Math.min(...members.map((item) => item.position.x)) - 10
    const top = Math.min(...members.map((item) => item.position.y)) - 20
    const right = Math.max(...members.map((item) => item.position.x + item.width)) + 10
    const bottom = Math.max(...members.map((item) => item.position.y + item.height)) + 10
    return <Group key={groupId}><Rect x={left} y={top} width={right - left} height={bottom - top} stroke="#6d6356" strokeWidth={1} dash={[3, 5]} /><Text x={left + 5} y={top + 5} text={`GROUP / ${members[0]?.groupLabel ?? groupId}`} fontFamily="IBM Plex Mono" fontSize={7} fill="#554a3d" /></Group>
  })}</Group>
}

export function LayoutGhostPreview({ snapshot, proposal }: { snapshot: WorkspaceState; proposal: BoardLayoutProposal }) {
  const currentIds = new Set(snapshot.boardItems.map((item) => item.id))
  const projected = projectBoardLayout(snapshot.boardItems, proposal)
  const changedIds = new Set([...proposal.changes.map((change) => change.itemId), ...proposal.notes.map((note) => note.id)])
  const changed = projected.filter((item) => changedIds.has(item.id))
  const groupIds = [...new Set(changed.map((item) => item.groupId).filter(Boolean) as string[])]

  return <Group listening={false}>
    {changed.map((item) => <Group key={`ghost-${item.id}`} x={item.position.x} y={item.position.y} opacity={currentIds.has(item.id) ? .48 : .72}>
      <Rect width={item.width} height={item.height} fill={item.kind === 'note' ? 'rgba(71,121,184,.16)' : 'rgba(71,121,184,.08)'} stroke="#4779b8" strokeWidth={3} dash={[10, 7]} />
      <Text x={10} y={10} width={Math.max(40, item.width - 20)} text={`${item.kind === 'note' ? 'NEW NOTE' : 'PROPOSED'}\n${item.title.toUpperCase()}`} fontFamily="IBM Plex Mono" fontSize={8} lineHeight={1.35} fill="#315f98" />
      {item.kind === 'note' && <Text x={10} y={46} width={Math.max(40, item.width - 20)} height={Math.max(30, item.height - 58)} text={item.noteBody ?? ''} fontFamily="IBM Plex Mono" fontSize={9} lineHeight={1.3} fill="#315f98" />}
    </Group>)}
    {groupIds.map((groupId) => {
      const members = projected.filter((item) => item.groupId === groupId)
      const left = Math.min(...members.map((item) => item.position.x)) - 14
      const top = Math.min(...members.map((item) => item.position.y)) - 24
      const right = Math.max(...members.map((item) => item.position.x + item.width)) + 14
      const bottom = Math.max(...members.map((item) => item.position.y + item.height)) + 14
      return <Group key={`group-${groupId}`}><Rect x={left} y={top} width={right - left} height={bottom - top} stroke="#a05040" strokeWidth={2} dash={[4, 5]} /><Text x={left + 6} y={top + 6} text={`GROUP / ${members[0]?.groupLabel ?? groupId}`} fontFamily="IBM Plex Mono" fontSize={8} fill="#a05040" /></Group>
    })}
  </Group>
}
