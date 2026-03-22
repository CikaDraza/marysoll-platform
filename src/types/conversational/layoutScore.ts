export type LayoutScoreBreakdown = {
  structure: number;
  readability: number;
  conversion: number;
  semantic: number;
  visual: number;
};

export type LayoutScoreResult = {
  total: number;
  breakdown: LayoutScoreBreakdown;
};
