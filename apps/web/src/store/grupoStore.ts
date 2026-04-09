import { create } from 'zustand';
import type { Group } from '@prode/shared';

interface GrupoState {
  groups: Group[];
  activeGroupId: string | null;
  setGroups: (groups: Group[]) => void;
  setActiveGroup: (groupId: string | null) => void;
}

export const useGrupoStore = create<GrupoState>((set) => ({
  groups: [],
  activeGroupId: null,
  setGroups: (groups) => set({ groups }),
  setActiveGroup: (activeGroupId) => set({ activeGroupId }),
}));
