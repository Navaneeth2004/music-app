export type BlockType =
  | 'heading'
  | 'subheading'
  | 'paragraph'
  | 'bullets'
  | 'table'
  | 'divider'
  | 'image'
  | 'audio';

export interface TableRow {
  cells: string[];
}

export interface ContentBlock {
  id: string;
  type: BlockType;
  // text blocks
  text?: string;
  // bullets - array of strings
  bullets?: string[];
  // table
  headers?: string[];
  rows?: TableRow[];
  // image - imageFile stores just the PB filename (like flashcard's front_image)
  // imageUrl kept for backwards compat but imageFile is preferred
  imageFile?: string;
  imageUrl?: string;
  // audio - audioFile stores just the PB filename
  audioFile?: string;
  audioLabel?: string;
  // caption/hint shown below image, audio, or table blocks
  caption?: string;
  collapsed?: boolean;
}