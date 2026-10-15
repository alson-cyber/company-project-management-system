export interface DraftState {
  key: string;
  value: string;
  dirty: boolean;
}

/**
 * Keeps in-progress text when server props change for the same field.
 * A new key (another issue) replaces the draft. A clean field follows the server.
 */
export function reconcileDraft(state: DraftState, serverValue: string, key: string): DraftState {
  if (state.key !== key) return { key, value: serverValue, dirty: false };
  if (!state.dirty && state.value !== serverValue) return { key, value: serverValue, dirty: false };
  return state;
}
