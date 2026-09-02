import type { BoardItem, BoardLayoutProposal, BoardNoteDraft } from './types'

export function boardItemFromNote(note: BoardNoteDraft): BoardItem {
  return {
    id: note.id,
    title: note.title,
    kind: 'note',
    noteBody: note.body,
    noteTone: note.tone,
    territory: note.territory,
    position: { ...note.position },
    width: note.width,
    height: note.height,
    locked: false,
    attribution: 'Direction Draft note',
    rightsStatus: 'cleared',
    tags: ['direction note'],
    tagSuggestions: [],
  }
}

export function projectBoardLayout(items: BoardItem[], proposal: Pick<BoardLayoutProposal, 'changes' | 'notes'>): BoardItem[] {
  const changes = new Map(proposal.changes.map((change) => [change.itemId, change]))
  const projected = items.map((item) => {
    const change = changes.get(item.id)
    if (!change) return item
    return {
      ...item,
      ...(change.position ? { position: { ...change.position } } : {}),
      ...(change.width !== undefined ? { width: change.width } : {}),
      ...(change.height !== undefined ? { height: change.height } : {}),
      ...(change.locked !== undefined ? { locked: change.locked } : {}),
      ...(change.territory !== undefined ? { territory: change.territory } : {}),
      ...(change.groupId !== undefined ? { groupId: change.groupId, groupLabel: change.groupLabel } : {}),
    }
  })
  return [...projected, ...proposal.notes.map(boardItemFromNote)]
}

export function changedBoardItemIds(proposal: Pick<BoardLayoutProposal, 'changes' | 'notes'>) {
  return [...proposal.changes.map((change) => change.itemId), ...proposal.notes.map((note) => note.id)]
}
