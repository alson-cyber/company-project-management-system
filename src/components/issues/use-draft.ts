"use client";

import { useState } from "react";
import { reconcileDraft, type DraftState } from "@/lib/draft-text";

/** Local text that survives a server refresh until the field is clean or the record changes. */
export function useDraft(key: string, serverValue: string) {
  const [state, setState] = useState<DraftState>({ key, value: serverValue, dirty: false });
  const next = reconcileDraft(state, serverValue, key);
  if (next !== state) setState(next);

  return {
    value: next.value,
    dirty: next.dirty,
    setValue(value: string) {
      setState({ key, value, dirty: true });
    },
    markClean(value: string) {
      setState({ key, value, dirty: false });
    },
  };
}
