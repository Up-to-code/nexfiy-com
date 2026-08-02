import {
  contentApiGet,
  contentApiOptions,
} from "@/features/content-api/contentApiRoute";

export const runtime = "nodejs";
export const GET = contentApiGet;
export const OPTIONS = contentApiOptions;
