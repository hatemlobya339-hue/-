
export interface Task {
  id: string;
  title: string;
  description: string;
  time: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  category: string;
  notified?: boolean;
}

export type ViewMode = 'today' | 'tomorrow' | 'all' | 'tools';

export interface InfographicItem {
  title: string;
  content: string;
  icon: string;
}

export interface InfographicData {
  mainTitle: string;
  summary: string;
  steps: InfographicItem[];
}
