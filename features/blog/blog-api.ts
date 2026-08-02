import "server-only";

export type BlogBlock = {
  id: string;
  parentBlockId: string | null;
  type: string;
  order: number;
  text: string | null;
  checked: boolean | null;
  url: string | null;
  color: string | null;
  propsJson: string | null;
};

export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  status: string;
  publishedAt: number | null;
  coverImage: string | null;
  author: string;
  tags: string[];
  blocks?: BlogBlock[];
};

type ApiProperty = {
  id: string;
  name: string;
  type: string;
  options: Array<{ id: string; name: string }>;
};

type ApiValue = {
  propertyId: string;
  text: string | null;
  dateStart: number | null;
  optionIds: string[];
};

type ApiItem = {
  id: string;
  title: string;
  values: ApiValue[];
};

const siteUrl = () => process.env.SITE_URL ?? "https://nexfiy.com";

function blogConfig() {
  const token = process.env.NEXFIY_BLOG_CONTENT_API_KEY;
  const dataSourceId = process.env.NEXFIY_BLOG_DATA_SOURCE_ID;
  return token && dataSourceId ? { token, dataSourceId } : null;
}

async function requestBlogApi(path: string) {
  const config = blogConfig();
  if (!config) return null;
  const response = await fetch(
    `${siteUrl()}/api/contents/${config.dataSourceId}${path}`,
    {
      headers: { Authorization: `Bearer ${config.token}` },
      next: { revalidate: 60 },
    },
  );
  if (!response.ok) return null;
  return (await response.json()) as { data: unknown };
}

function fieldValue(item: ApiItem, properties: ApiProperty[], name: string) {
  const property = properties.find(
    (candidate) => candidate.name.toLowerCase() === name.toLowerCase(),
  );
  const value = property
    ? item.values.find((candidate) => candidate.propertyId === property.id)
    : null;
  return { property, value };
}

function optionNames(property: ApiProperty | undefined, ids: string[]) {
  if (!property) return [];
  const selected = new Set(ids);
  return property.options
    .filter((option) => selected.has(option.id))
    .map((option) => option.name);
}

function mapPost(item: ApiItem, properties: ApiProperty[]): BlogPost {
  const slug = fieldValue(item, properties, "Slug").value?.text?.trim() ?? "";
  const excerpt =
    fieldValue(item, properties, "Excerpt").value?.text?.trim() ?? "";
  const coverImage =
    fieldValue(item, properties, "Cover image").value?.text?.trim() ?? null;
  const author =
    fieldValue(item, properties, "Author").value?.text?.trim() ?? "Nexfiy";
  const publishedAt =
    fieldValue(item, properties, "Published date").value?.dateStart ?? null;
  const statusField = fieldValue(item, properties, "Status");
  const tagsField = fieldValue(item, properties, "Tags");
  return {
    id: item.id,
    title: item.title,
    slug,
    excerpt,
    coverImage,
    author,
    publishedAt,
    status:
      optionNames(
        statusField.property,
        statusField.value?.optionIds ?? [],
      )[0] ?? "Draft",
    tags: optionNames(tagsField.property, tagsField.value?.optionIds ?? []),
  };
}

export async function getPublishedPosts() {
  const response = await requestBlogApi("?limit=100");
  if (!response) return { available: false, posts: [] as BlogPost[] };
  const data = response.data as {
    schema: ApiProperty[];
    items: ApiItem[];
  };
  const posts = data.items
    .map((item) => mapPost(item, data.schema))
    .filter(
      (post) =>
        post.status.toLowerCase() === "published" &&
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug),
    )
    .sort((left, right) => (right.publishedAt ?? 0) - (left.publishedAt ?? 0));
  return { available: true, posts };
}

export async function getPublishedPost(slug: string) {
  const { posts } = await getPublishedPosts();
  const post = posts.find((candidate) => candidate.slug === slug);
  if (!post) return null;
  const response = await requestBlogApi(`/${post.id}`);
  if (!response) return null;
  const data = response.data as {
    item: { blocks: BlogBlock[]; blocksTruncated: boolean };
  };
  if (data.item.blocksTruncated) return null;
  return {
    ...post,
    blocks: [...data.item.blocks].sort(
      (left, right) => left.order - right.order,
    ),
  };
}
