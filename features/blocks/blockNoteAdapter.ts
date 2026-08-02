import type { Block, PartialBlock } from "@blocknote/core";

import type { Id } from "@/convex/_generated/dataModel";
import type { NexfiyBlockNoteSchema } from "./blockNoteSchema";

export type NormalizedPageBlock = {
  id: Id<"pageBlocks">;
  editorId: string;
  pageId: Id<"documents">;
  parentBlockId?: Id<"pageBlocks">;
  type:
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
  order: number;
  text?: string;
  checked?: boolean;
  url?: string;
  color?: string;
  propsJson?: string;
  dataSourceId?: Id<"dataSources">;
  viewId?: Id<"databaseViews">;
  linkedPageId?: Id<"documents">;
  syncGroupId?: Id<"syncedBlockGroups">;
};

export type EditorBlockInput = Omit<
  NormalizedPageBlock,
  "id" | "pageId" | "parentBlockId"
> & {
  parentEditorId?: string;
};

export function editorBlockInputsSignature(blocks: EditorBlockInput[]) {
  return JSON.stringify(
    blocks
      .map((block) => ({
        editorId: block.editorId,
        parentEditorId: block.parentEditorId,
        type: block.type,
        order: block.order,
        text: block.text,
        checked: block.checked,
        url: block.url,
        color: block.color,
        propsJson: block.propsJson,
        dataSourceId: block.dataSourceId,
        viewId: block.viewId,
        linkedPageId: block.linkedPageId,
        syncGroupId: block.syncGroupId,
      }))
      .sort((left, right) => left.editorId.localeCompare(right.editorId)),
  );
}

type NexfiyPartialBlock = PartialBlock<
  NexfiyBlockNoteSchema["blockSchema"],
  NexfiyBlockNoteSchema["inlineContentSchema"],
  NexfiyBlockNoteSchema["styleSchema"]
>;

type NexfiyBlock = Block<
  NexfiyBlockNoteSchema["blockSchema"],
  NexfiyBlockNoteSchema["inlineContentSchema"],
  NexfiyBlockNoteSchema["styleSchema"]
>;

function parseStoredBlock(block: NormalizedPageBlock): NexfiyPartialBlock {
  if (block.type === "blocknote" && block.propsJson) {
    try {
      const stored = JSON.parse(block.propsJson) as NexfiyPartialBlock;
      return { ...stored, id: block.editorId };
    } catch {
      // Fall through to a readable paragraph for malformed legacy data.
    }
  }

  const text = block.text ?? "";
  switch (block.type) {
    case "heading_1":
    case "heading_2":
    case "heading_3":
      return {
        id: block.editorId,
        type: "heading",
        props: { level: Number(block.type.at(-1)) as 1 | 2 | 3 },
        content: text,
      };
    case "bulleted_list":
      return { id: block.editorId, type: "bulletListItem", content: text };
    case "numbered_list":
      return { id: block.editorId, type: "numberedListItem", content: text };
    case "checklist":
      return {
        id: block.editorId,
        type: "checkListItem",
        props: { checked: block.checked ?? false },
        content: text,
      };
    case "quote":
      return { id: block.editorId, type: "quote", content: text };
    case "callout":
      return {
        id: block.editorId,
        type: "callout",
        props: { color: block.color ?? "default" },
        content: text,
      };
    case "toggle":
      return { id: block.editorId, type: "toggleListItem", content: text };
    case "divider":
      return { id: block.editorId, type: "divider" };
    case "image":
      return {
        id: block.editorId,
        type: "image",
        props: { url: block.url ?? "" },
      };
    case "file":
      return {
        id: block.editorId,
        type: "file",
        props: { url: block.url ?? "" },
      };
    case "bookmark":
      return {
        id: block.editorId,
        type: "bookmarkCard",
        props: { url: block.url ?? "" },
      };
    case "database_view":
      return {
        id: block.editorId,
        type: "databaseView",
        props: {
          dataSourceId: block.dataSourceId ?? "",
          viewId: block.viewId ?? "",
        },
      };
    case "child_page":
      return {
        id: block.editorId,
        type: "childPage",
        props: { linkedPageId: block.linkedPageId ?? "" },
      };
    case "columns":
      return { id: block.editorId, type: "columnsLayout" };
    case "column":
      return { id: block.editorId, type: "columnLayout" };
    case "synced_reference":
      return {
        id: block.editorId,
        type: "syncedReference",
        props: {
          referenceBlockId: block.id,
          syncGroupId: block.syncGroupId ?? "",
        },
      };
    default:
      return { id: block.editorId, type: "paragraph", content: text };
  }
}

export function normalizedBlocksToBlockNote(
  blocks: NormalizedPageBlock[],
): NexfiyPartialBlock[] {
  const childrenByParent = new Map<string | undefined, NormalizedPageBlock[]>();
  for (const block of blocks) {
    const parentKey = block.parentBlockId as string | undefined;
    const children = childrenByParent.get(parentKey) ?? [];
    children.push(block);
    childrenByParent.set(parentKey, children);
  }
  for (const children of childrenByParent.values()) {
    children.sort((left, right) => left.order - right.order);
  }

  const build = (block: NormalizedPageBlock): NexfiyPartialBlock => ({
    ...parseStoredBlock(block),
    children: (childrenByParent.get(block.id) ?? []).map(build),
  });
  const root = (childrenByParent.get(undefined) ?? []).map(build);
  return root.length ? root : [{ type: "paragraph" }];
}

function inlineText(content: NexfiyBlock["content"]): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((item) => {
      if (item.type === "text") return item.text;
      if (item.type === "link") {
        return item.content.map((child) => child.text).join("");
      }
      return "";
    })
    .join("");
}

export function blockNoteToNormalizedBlocks(
  blocks: NexfiyBlock[],
): EditorBlockInput[] {
  const output: EditorBlockInput[] = [];
  const visit = (siblings: NexfiyBlock[], parentEditorId?: string) => {
    siblings.forEach((block, order) => {
      const common = { editorId: block.id, parentEditorId, order };
      const text = inlineText(block.content);
      switch (block.type) {
        case "paragraph":
          output.push({ ...common, type: "paragraph", text });
          break;
        case "heading":
          output.push({
            ...common,
            type: `heading_${Math.min(3, block.props.level)}` as
              "heading_1" | "heading_2" | "heading_3",
            text,
          });
          break;
        case "bulletListItem":
          output.push({ ...common, type: "bulleted_list", text });
          break;
        case "numberedListItem":
          output.push({ ...common, type: "numbered_list", text });
          break;
        case "checkListItem":
          output.push({
            ...common,
            type: "checklist",
            text,
            checked: block.props.checked,
          });
          break;
        case "quote":
          output.push({ ...common, type: "quote", text });
          break;
        case "callout":
          output.push({
            ...common,
            type: "callout",
            text,
            color: block.props.color,
          });
          break;
        case "toggleListItem":
          output.push({ ...common, type: "toggle", text });
          break;
        case "divider":
          output.push({ ...common, type: "divider" });
          break;
        case "image":
        case "file":
          output.push({ ...common, type: block.type, url: block.props.url });
          break;
        case "bookmarkCard":
          output.push({ ...common, type: "bookmark", url: block.props.url });
          break;
        case "databaseView":
          output.push({
            ...common,
            type: "database_view",
            dataSourceId: block.props.dataSourceId as Id<"dataSources">,
            viewId: block.props.viewId as Id<"databaseViews">,
          });
          break;
        case "childPage":
          output.push({
            ...common,
            type: "child_page",
            linkedPageId: block.props.linkedPageId as Id<"documents">,
          });
          break;
        case "columnsLayout":
          output.push({ ...common, type: "columns" });
          break;
        case "columnLayout":
          output.push({ ...common, type: "column" });
          break;
        case "syncedReference":
          output.push({
            ...common,
            type: "synced_reference",
            syncGroupId: block.props.syncGroupId as Id<"syncedBlockGroups">,
          });
          break;
        default:
          output.push({
            ...common,
            type: "blocknote",
            propsJson: JSON.stringify({
              type: block.type,
              props: block.props,
              content: block.content,
            }),
          });
      }
      if (block.children.length) visit(block.children, block.id);
    });
  };
  visit(blocks);
  return output;
}

export function normalizedBlocksToEditorInputs(
  blocks: NormalizedPageBlock[],
): EditorBlockInput[] {
  const editorIdByBlockId = new Map(
    blocks.map((block) => [block.id, block.editorId]),
  );
  return [...blocks]
    .sort((left, right) => left.order - right.order)
    .map((block) => ({
      editorId: block.editorId,
      parentEditorId: block.parentBlockId
        ? editorIdByBlockId.get(block.parentBlockId)
        : undefined,
      type: block.type,
      order: block.order,
      text: block.text,
      checked: block.checked,
      url: block.url,
      color: block.color,
      propsJson: block.propsJson,
      dataSourceId: block.dataSourceId,
      viewId: block.viewId,
      linkedPageId: block.linkedPageId,
      syncGroupId: block.syncGroupId,
    }));
}
