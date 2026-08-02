---
title: Blocks and properties
description: Render database values and every normalized page block, including link, YouTube, and GitHub cards.
---

An item returned by the Content API combines database properties with an ordered block tree. Render properties as structured fields and blocks as page content.

## Database properties

Nexfiy databases can expose these property types:

| Type               | Typical value             |
| ------------------ | ------------------------- |
| `title`, `text`    | Text content              |
| `number`           | Numeric value             |
| `select`, `status` | One selected option       |
| `multi_select`     | Multiple selected options |
| `date`             | Date or date range        |
| `checkbox`         | Boolean                   |
| `url`              | URL string                |
| `relation`         | References to other rows  |
| `rollup`           | Aggregated relation value |
| `formula`          | Computed value            |

Use the property type, not only the displayed value, to choose a component. Keep a fallback for newly introduced types.

## Page block model

Normalized blocks preserve their order, type, content, properties, and nested children. The available structural types are:

| Block type                            | Rendering suggestion                           |
| ------------------------------------- | ---------------------------------------------- |
| `paragraph`                           | Paragraph with rich text                       |
| `heading_1`, `heading_2`, `heading_3` | Semantic heading                               |
| `bulleted_list`, `numbered_list`      | List item or grouped list                      |
| `checklist`                           | Checkbox plus label                            |
| `quote`                               | Blockquote                                     |
| `callout`                             | Emphasized panel with optional icon            |
| `toggle`                              | Expandable disclosure                          |
| `divider`                             | Horizontal rule                                |
| `image`                               | Responsive image with alt text/caption         |
| `file`                                | Downloadable file link                         |
| `bookmark`                            | Link preview or labeled link                   |
| `database_view`                       | Embedded database reference                    |
| `child_page`                          | Link to a nested page                          |
| `columns`, `column`                   | Responsive column layout                       |
| `synced_reference`                    | Referenced synchronized content                |
| `blocknote`                           | Rich BlockNote content or a custom embed block |

Render `children` recursively. For narrow screens, columns should collapse into a readable vertical flow.

## Links and embeds

Custom rich blocks are stored as `blocknote` blocks. `propsJson` is a JSON-encoded string containing the original BlockNote `{ type, props, content }` object. Parse it once, then inspect `type` to distinguish link cards, YouTube embeds, and GitHub repositories.

### Link card

```json
{
  "type": "blocknote",
  "propsJson": "{\"type\":\"linkCard\",\"props\":{\"label\":\"Readable link label\",\"url\":\"https://example.com/article\"},\"content\":[]}"
}
```

Use `props.label` as the visible label. If it is absent, fall back to the hostname, then the URL. External links should use safe `rel` attributes when opened in a new tab.

### YouTube

```json
{
  "type": "blocknote",
  "propsJson": "{\"type\":\"youtubeEmbed\",\"props\":{\"url\":\"https://www.youtube.com/watch?v=VIDEO_ID\"},\"content\":[]}"
}
```

Normalize supported `youtube.com` and `youtu.be` URLs to an embed URL on your trusted server. Keep the original URL as a fallback link if embedding is blocked.

### GitHub repository

```json
{
  "type": "blocknote",
  "propsJson": "{\"type\":\"githubRepository\",\"props\":{\"url\":\"https://github.com/owner/repository\"},\"content\":[]}"
}
```

Derive the visible `owner/repository` label from `props.url`. Display the repository link without requiring a GitHub API request. If you enrich the card with live repository data, cache the result and handle rate limits.

```ts
type StoredBlockNote = {
  type?: string;
  props?: Record<string, unknown>;
  content?: unknown;
};

function customBlock(block: NexfiyBlock): StoredBlockNote | null {
  if (block.type !== "blocknote" || !block.propsJson) return null;
  try {
    return JSON.parse(block.propsJson) as StoredBlockNote;
  } catch {
    return null;
  }
}
```

## Minimal recursive renderer

```tsx
function Blocks({ blocks }: { blocks: NexfiyBlock[] }) {
  return blocks.map((block) => (
    <Block key={block.id} block={block}>
      {block.children?.length ? <Blocks blocks={block.children} /> : null}
    </Block>
  ));
}
```

## Rendering checklist

- Preserve the API order.
- Escape text and sanitize any HTML you choose to support.
- Use semantic headings, lists, quotes, and links.
- Lazy-load media and reserve its aspect ratio.
- Show a link fallback when an embed cannot load.
- Ignore unknown fields and provide an unsupported-block fallback.

For complete, copyable payloads and rendering helpers, continue to [Complete API examples](/docs/content-api/examples).
