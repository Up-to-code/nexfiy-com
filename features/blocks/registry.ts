import {
  BetweenHorizontalStart,
  Bookmark,
  CheckSquare,
  Columns3,
  File,
  FilePlus2,
  Heading1,
  Heading2,
  Heading3,
  Image,
  List,
  ListOrdered,
  MessageSquareQuote,
  Minus,
  Pilcrow,
  Table2,
  RefreshCw,
  TextQuote,
  ToggleRight,
  type LucideIcon,
} from "lucide-react";

export type PageBlockType =
  | "paragraph"
  | "heading_1"
  | "heading_2"
  | "heading_3"
  | "bulleted_list"
  | "numbered_list"
  | "checklist"
  | "quote"
  | "callout"
  | "toggle"
  | "divider"
  | "image"
  | "file"
  | "bookmark"
  | "database_view"
  | "child_page"
  | "columns"
  | "column"
  | "synced_reference"
  | "blocknote";

export type BlockDefinition = {
  type: PageBlockType;
  label: string;
  description: string;
  icon: LucideIcon;
  acceptsChildren: boolean;
  insertable: boolean;
};

export const BLOCK_REGISTRY: Record<PageBlockType, BlockDefinition> = {
  paragraph: {
    type: "paragraph",
    label: "Text",
    description: "Write plain text",
    icon: Pilcrow,
    acceptsChildren: false,
    insertable: true,
  },
  heading_1: {
    type: "heading_1",
    label: "Heading 1",
    description: "Large section heading",
    icon: Heading1,
    acceptsChildren: false,
    insertable: true,
  },
  heading_2: {
    type: "heading_2",
    label: "Heading 2",
    description: "Medium section heading",
    icon: Heading2,
    acceptsChildren: false,
    insertable: true,
  },
  heading_3: {
    type: "heading_3",
    label: "Heading 3",
    description: "Small section heading",
    icon: Heading3,
    acceptsChildren: false,
    insertable: true,
  },
  bulleted_list: {
    type: "bulleted_list",
    label: "Bulleted list",
    description: "Create a bulleted item",
    icon: List,
    acceptsChildren: false,
    insertable: true,
  },
  numbered_list: {
    type: "numbered_list",
    label: "Numbered list",
    description: "Create a numbered item",
    icon: ListOrdered,
    acceptsChildren: false,
    insertable: true,
  },
  checklist: {
    type: "checklist",
    label: "To-do",
    description: "Track a checkable item",
    icon: CheckSquare,
    acceptsChildren: false,
    insertable: true,
  },
  quote: {
    type: "quote",
    label: "Quote",
    description: "Capture a quotation",
    icon: TextQuote,
    acceptsChildren: false,
    insertable: true,
  },
  callout: {
    type: "callout",
    label: "Callout",
    description: "Highlight blocks in a container",
    icon: MessageSquareQuote,
    acceptsChildren: true,
    insertable: true,
  },
  toggle: {
    type: "toggle",
    label: "Toggle",
    description: "Hide blocks beneath a summary",
    icon: ToggleRight,
    acceptsChildren: true,
    insertable: true,
  },
  divider: {
    type: "divider",
    label: "Divider",
    description: "Separate sections",
    icon: Minus,
    acceptsChildren: false,
    insertable: true,
  },
  image: {
    type: "image",
    label: "Image",
    description: "Upload or embed an image",
    icon: Image,
    acceptsChildren: false,
    insertable: true,
  },
  file: {
    type: "file",
    label: "File",
    description: "Attach a file",
    icon: File,
    acceptsChildren: false,
    insertable: true,
  },
  bookmark: {
    type: "bookmark",
    label: "Bookmark",
    description: "Preview an external link",
    icon: Bookmark,
    acceptsChildren: false,
    insertable: true,
  },
  database_view: {
    type: "database_view",
    label: "Database view",
    description: "Embed a saved table, pipeline, calendar, or timeline",
    icon: Table2,
    acceptsChildren: false,
    insertable: true,
  },
  child_page: {
    type: "child_page",
    label: "Sub-page",
    description: "Create a page nested inside this page",
    icon: FilePlus2,
    acceptsChildren: false,
    insertable: true,
  },
  columns: {
    type: "columns",
    label: "Columns",
    description: "Arrange blocks side by side",
    icon: Columns3,
    acceptsChildren: true,
    insertable: true,
  },
  column: {
    type: "column",
    label: "Column",
    description: "A column layout region",
    icon: BetweenHorizontalStart,
    acceptsChildren: true,
    insertable: false,
  },
  synced_reference: {
    type: "synced_reference",
    label: "Synced block",
    description: "Live reference to a canonical block subtree",
    icon: RefreshCw,
    acceptsChildren: false,
    insertable: false,
  },
  blocknote: {
    type: "blocknote",
    label: "Rich block",
    description: "A native BlockNote block",
    icon: Pilcrow,
    acceptsChildren: true,
    insertable: false,
  },
};

export const INSERTABLE_BLOCKS = Object.values(BLOCK_REGISTRY).filter(
  (definition) => definition.insertable,
);
