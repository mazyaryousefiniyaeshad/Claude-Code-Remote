const RTL = /[֐-׿؀-ۿ܀-ݏހ-޿ﭐ-﷿ﹰ-﻿]/g;
const LTR = /[A-Za-zÀ-ɏ]/g;

export type Direction = "rtl" | "ltr" | "auto";

export function directionOf(text: string | null | undefined): Direction {
  const value = String(text ?? "");
  const rtl = value.match(RTL)?.length ?? 0;
  const ltr = value.match(LTR)?.length ?? 0;
  if (!rtl && !ltr) return "auto";
  if (!ltr) return "rtl";
  if (!rtl) return "ltr";
  if (rtl !== ltr) return rtl > ltr ? "rtl" : "ltr";
  return value.search(RTL) < value.search(LTR) ? "rtl" : "ltr";
}
