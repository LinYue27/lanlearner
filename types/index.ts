export type BlockType = 'text' | 'image' | 'table';

export interface TableData {
  rows: string[][];
}

export interface ContentBlock {
  id: string;
  type: BlockType;
  content: string; // Text content or Image Base64
  tableData?: TableData;
}

export interface ReviewLog {
  date: number; // Timestamp
  action: 'remembered' | 'forgot' | 'reset';
  stageBefore: number;
  stageAfter: number;
}

export interface Card {
  id: string;
  title: string;
  blocks: ContentBlock[];
  tags: string[]; // References TagData.name
  remark: string;
  createdAt: number;
  updatedAt: number;
  
  // Ebbinghaus Data
  stage: number; // 0 to 5
  nextReviewDate: number; // Timestamp
  reviewCount: number;
  history: ReviewLog[];
  
  // Linked Cards
  linkedCardIds: string[];
}

export interface TagData {
    name: string;
    isPinned: boolean;
}

export interface AppState {
  cards: Card[];
  tags: TagData[];
}

export type ViewMode = 'main' | 'review' | 'daily' | 'edit' | 'tag_detail';
export type MainTab = 'learn' | 'all';
