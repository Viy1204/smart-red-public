export enum BlockType {
  Paragraph = 'paragraph',
  Heading = 'heading',
  CodeBlock = 'code_block',
  Image = 'image',
  Table = 'table',
  Blockquote = 'blockquote',
  List = 'list',
  HorizontalRule = 'horizontal_rule',
  Spacer = 'spacer',
}

export interface SemanticBlock {
  type: BlockType;
  content: string;
  metadata?: Record<string, unknown>;
  children?: SemanticBlock[];
}