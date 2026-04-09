import { create } from 'zustand';
import type { Prediction, Result } from '@prode/shared';

interface PredictionDraft {
  matchId: string;
  result: Result;
  homeScoreGuess?: number;
  awayScoreGuess?: number;
  isCaptain: boolean;
}

interface PronosticoState {
  predictions: Prediction[];
  drafts: PredictionDraft[];
  setPredictions: (predictions: Prediction[]) => void;
  setDraft: (draft: PredictionDraft) => void;
  removeDraft: (matchId: string) => void;
  clearDrafts: () => void;
}

export const usePronosticoStore = create<PronosticoState>((set) => ({
  predictions: [],
  drafts: [],
  setPredictions: (predictions) => set({ predictions }),
  setDraft: (draft) =>
    set((state) => ({
      drafts: [
        ...state.drafts.filter((d) => d.matchId !== draft.matchId),
        draft,
      ],
    })),
  removeDraft: (matchId) =>
    set((state) => ({
      drafts: state.drafts.filter((d) => d.matchId !== matchId),
    })),
  clearDrafts: () => set({ drafts: [] }),
}));
