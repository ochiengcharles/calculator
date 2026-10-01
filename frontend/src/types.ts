export type AngleMode = 'DEG' | 'RAD' | 'GRAD';
export type ThemeMode = 'light' | 'dark';

export interface HistoryEntry {
  id: number | string;
  expression: string;
  result: number;
  angle_mode: AngleMode;
  created_at?: string;
}

export interface CalculationResponse {
  success: boolean;
  expression?: string;
  result?: number;
  angle_mode?: AngleMode;
  error?: string;
}
