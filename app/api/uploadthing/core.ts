import { api } from "@/convex/_generated/api";
import { fetchAuthQuery, isAuthenticated } from "@/lib/auth-server";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UTFiles, UploadThingError } from "uploadthing/server";

const upload = createUploadthing();

const withAuthenticatedOwner = async (
  files: readonly { name: string; size: number; type: string }[],
) => {
  if (!(await isAuthenticated())) {
    throw new UploadThingError("You must be signed in to upload files");
  }
  const user = await fetchAuthQuery(api.auth.getAuthUser, {}).catch(() => null);
  if (!user)
    throw new UploadThingError("You must be signed in to upload files");

  return {
    userId: user._id,
    [UTFiles]: files.map((file) => ({
      ...file,
      customId: `${user._id}--${crypto.randomUUID()}`,
    })),
  };
};

const getOwnedFileUrl = (ufsUrl: string, customId: string | null) => {
  if (!customId) throw new UploadThingError("Upload ownership tag is missing");
  const url = new URL(ufsUrl);
  url.pathname = `/f/${encodeURIComponent(customId)}`;
  return url.toString();
};

export const uploadRouter = {
  coverImage: upload({
    image: { maxFileSize: "8MB", maxFileCount: 1 },
  })
    .middleware(async ({ files }) => withAuthenticatedOwner(files))
    .onUploadComplete(async ({ file }) => ({
      url: getOwnedFileUrl(file.ufsUrl, file.customId),
    })),

  documentFile: upload({
    blob: { maxFileSize: "64MB", maxFileCount: 1 },
  })
    .middleware(async ({ files }) => withAuthenticatedOwner(files))
    .onUploadComplete(async ({ file }) => ({
      url: getOwnedFileUrl(file.ufsUrl, file.customId),
    })),
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;
