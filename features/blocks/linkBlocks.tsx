"use client";

import { useState, type FormEvent } from "react";
import { createReactBlockSpec } from "@blocknote/react";
import { Code2, ExternalLink, Link2, Pencil, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function externalUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    return new URL(
      trimmed.match(/^https?:\/\//i) ? trimmed : `https://${trimmed}`,
    ).toString();
  } catch {
    return "";
  }
}

function youtubeVideoId(value: string) {
  const trimmed = value.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;

  const normalized = externalUrl(value);
  if (!normalized) return "";
  const url = new URL(normalized);
  let videoId = "";
  if (url.hostname === "youtu.be") {
    videoId = url.pathname.split("/")[1] ?? "";
  }
  if (url.hostname.endsWith("youtube.com")) {
    if (url.pathname === "/watch") videoId = url.searchParams.get("v") ?? "";
    const [, kind, id] = url.pathname.split("/");
    if (["embed", "shorts", "live"].includes(kind)) videoId = id ?? "";
  }
  return /^[A-Za-z0-9_-]{11}$/.test(videoId) ? videoId : "";
}

function youtubeWatchUrl(videoId: string) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

function YouTubeEmbedContent({
  url,
  editable,
  onCommit,
}: {
  url: string;
  editable: boolean;
  onCommit: (url: string) => void;
}) {
  const committedVideoId = youtubeVideoId(url);
  const [draft, setDraft] = useState(url);
  const [editing, setEditing] = useState(!committedVideoId);
  const [error, setError] = useState("");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const videoId = youtubeVideoId(draft);
    if (!videoId) {
      setError("Paste a valid YouTube video, Short, or Live URL.");
      return;
    }

    const normalizedUrl = youtubeWatchUrl(videoId);
    setDraft(normalizedUrl);
    setError("");
    setEditing(false);
    onCommit(normalizedUrl);
  };

  if (editing || !committedVideoId) {
    return (
      <form className="p-4" onSubmit={submit}>
        <div className="flex items-start gap-3">
          <span className="bg-destructive/10 text-destructive flex size-10 shrink-0 items-center justify-center rounded-xl">
            <Play className="size-4 fill-current" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Embed a YouTube video</p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Paste a YouTube video, Short, or Live link.
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Input
            aria-label="YouTube URL"
            aria-invalid={error ? true : undefined}
            value={draft}
            placeholder="https://www.youtube.com/watch?v=…"
            className="h-9 min-w-0 flex-1 rounded-lg shadow-none"
            readOnly={!editable}
            onChange={(event) => {
              setDraft(event.target.value);
              if (error) setError("");
            }}
          />
          {editable ? (
            <Button type="submit" size="sm" className="h-9 rounded-lg px-4">
              Embed video
            </Button>
          ) : null}
        </div>
        {error ? (
          <p className="text-destructive mt-2 text-xs" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    );
  }

  const watchUrl = youtubeWatchUrl(committedVideoId);
  return (
    <>
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <span className="bg-destructive/10 text-destructive flex size-7 shrink-0 items-center justify-center rounded-lg">
          <Play className="size-3 fill-current" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">YouTube video</p>
          <p className="text-muted-foreground truncate text-xs">
            youtube.com/watch?v={committedVideoId}
          </p>
        </div>
        {editable ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-lg"
            onClick={() => setEditing(true)}
          >
            <Pencil className="size-3.5" />
            Change
          </Button>
        ) : null}
        <Button asChild variant="ghost" size="icon-sm">
          <a
            href={watchUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="Open video on YouTube"
          >
            <ExternalLink className="size-4" />
          </a>
        </Button>
      </div>
      <div className="bg-muted aspect-video">
        <iframe
          key={committedVideoId}
          src={`https://www.youtube.com/embed/${committedVideoId}?rel=0`}
          title="YouTube video"
          className="size-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          loading="lazy"
          allowFullScreen
        />
      </div>
      <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 border-t px-3 py-2 text-xs">
        <span>Playback restricted?</span>
        <a
          href={watchUrl}
          target="_blank"
          rel="noreferrer"
          className="text-foreground inline-flex items-center gap-1 font-medium hover:underline"
        >
          Watch on YouTube
          <ExternalLink className="size-3" />
        </a>
      </div>
    </>
  );
}

function githubRepository(value: string) {
  const normalized = externalUrl(value);
  if (!normalized) return null;
  const url = new URL(normalized);
  if (url.hostname !== "github.com" && url.hostname !== "www.github.com") {
    return null;
  }
  const [owner, repository] = url.pathname.split("/").filter(Boolean);
  if (!owner || !repository) return null;
  return {
    href: `https://github.com/${owner}/${repository.replace(/\.git$/, "")}`,
    owner,
    repository: repository.replace(/\.git$/, ""),
  };
}

function LinkCardContent({
  label,
  url,
  editable,
  onCommit,
}: {
  label: string;
  url: string;
  editable: boolean;
  onCommit: (value: { label: string; url: string }) => void;
}) {
  const href = externalUrl(url);
  const [draftLabel, setDraftLabel] = useState(label);
  const [draftUrl, setDraftUrl] = useState(url);
  const [editing, setEditing] = useState(!href);
  const [error, setError] = useState("");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedUrl = externalUrl(draftUrl);
    if (!normalizedUrl) {
      setError("Paste a valid web address.");
      return;
    }

    const normalizedLabel =
      draftLabel.trim() ||
      new URL(normalizedUrl).hostname.replace(/^www\./, "");
    setDraftLabel(normalizedLabel);
    setDraftUrl(normalizedUrl);
    setError("");
    setEditing(false);
    onCommit({ label: normalizedLabel, url: normalizedUrl });
  };

  if (editing || !href) {
    return (
      <form className="p-4" onSubmit={submit}>
        <div className="flex items-start gap-3">
          <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
            <Link2 className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Add a labeled link</p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Give the link a readable name instead of showing a long URL.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)_auto]">
          <Input
            aria-label="Link label"
            value={draftLabel}
            placeholder="Link label"
            className="h-9 rounded-lg shadow-none"
            readOnly={!editable}
            onChange={(event) => setDraftLabel(event.target.value)}
          />
          <Input
            aria-label="Link URL"
            aria-invalid={error ? true : undefined}
            value={draftUrl}
            placeholder="https://example.com"
            className="h-9 rounded-lg shadow-none"
            readOnly={!editable}
            onChange={(event) => {
              setDraftUrl(event.target.value);
              if (error) setError("");
            }}
          />
          {editable ? (
            <Button type="submit" size="sm" className="h-9 rounded-lg px-4">
              Add link
            </Button>
          ) : null}
        </div>
        {error ? (
          <p className="text-destructive mt-2 text-xs" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3">
      <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
        <Link2 className="size-4" />
      </span>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="group min-w-0 flex-1"
      >
        <p className="group-hover:text-primary truncate text-sm font-medium transition-colors">
          {label || new URL(href).hostname}
        </p>
        <p className="text-muted-foreground truncate text-xs">{href}</p>
      </a>
      {editable ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="rounded-lg"
          onClick={() => setEditing(true)}
        >
          <Pencil className="size-3.5" />
          Change
        </Button>
      ) : null}
      <Button asChild variant="ghost" size="icon-sm">
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open ${label || "link"}`}
        >
          <ExternalLink className="size-4" />
        </a>
      </Button>
    </div>
  );
}

function GitHubRepositoryContent({
  url,
  editable,
  onCommit,
}: {
  url: string;
  editable: boolean;
  onCommit: (url: string) => void;
}) {
  const repository = githubRepository(url);
  const [draft, setDraft] = useState(url);
  const [editing, setEditing] = useState(!repository);
  const [error, setError] = useState("");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextRepository = githubRepository(draft);
    if (!nextRepository) {
      setError("Paste a valid GitHub repository URL.");
      return;
    }

    setDraft(nextRepository.href);
    setError("");
    setEditing(false);
    onCommit(nextRepository.href);
  };

  if (editing || !repository) {
    return (
      <form className="p-4" onSubmit={submit}>
        <div className="flex items-start gap-3">
          <span className="bg-foreground text-background flex size-10 shrink-0 items-center justify-center rounded-xl">
            <Code2 className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Add a GitHub repository</p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Paste the repository URL to create a clean project card.
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Input
            aria-label="GitHub repository URL"
            aria-invalid={error ? true : undefined}
            value={draft}
            placeholder="https://github.com/owner/repository"
            className="h-9 min-w-0 flex-1 rounded-lg shadow-none"
            readOnly={!editable}
            onChange={(event) => {
              setDraft(event.target.value);
              if (error) setError("");
            }}
          />
          {editable ? (
            <Button type="submit" size="sm" className="h-9 rounded-lg px-4">
              Add repository
            </Button>
          ) : null}
        </div>
        {error ? (
          <p className="text-destructive mt-2 text-xs" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3">
      <span className="bg-foreground text-background flex size-10 shrink-0 items-center justify-center rounded-xl">
        <Code2 className="size-4" />
      </span>
      <a
        href={repository.href}
        target="_blank"
        rel="noreferrer"
        className="group min-w-0 flex-1"
      >
        <p className="group-hover:text-primary truncate text-sm font-medium transition-colors">
          {repository.owner} / {repository.repository}
        </p>
        <p className="text-muted-foreground truncate text-xs">
          github.com/{repository.owner}/{repository.repository}
        </p>
      </a>
      {editable ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="rounded-lg"
          onClick={() => setEditing(true)}
        >
          <Pencil className="size-3.5" />
          Change
        </Button>
      ) : null}
      <Button asChild variant="ghost" size="icon-sm">
        <a
          href={repository.href}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open ${repository.owner}/${repository.repository} on GitHub`}
        >
          <ExternalLink className="size-4" />
        </a>
      </Button>
    </div>
  );
}

export const linkCardBlock = createReactBlockSpec(
  {
    type: "linkCard",
    propSchema: {
      label: { default: "" },
      url: { default: "" },
    },
    content: "none",
  },
  {
    render: ({ block, editor }) => (
      <div
        className="bg-card my-1 w-full overflow-hidden rounded-xl border shadow-xs"
        contentEditable={false}
      >
        <LinkCardContent
          key={`${block.props.label}\u0000${block.props.url}`}
          label={block.props.label}
          url={block.props.url}
          editable={editor.isEditable}
          onCommit={(props) => editor.updateBlock(block, { props })}
        />
      </div>
    ),
  },
)();

export const youtubeEmbedBlock = createReactBlockSpec(
  {
    type: "youtubeEmbed",
    propSchema: { url: { default: "" } },
    content: "none",
  },
  {
    render: ({ block, editor }) => (
      <div
        className="bg-card my-1 w-full overflow-hidden rounded-xl border shadow-xs"
        contentEditable={false}
      >
        <YouTubeEmbedContent
          key={block.props.url}
          url={block.props.url}
          editable={editor.isEditable}
          onCommit={(url) => editor.updateBlock(block, { props: { url } })}
        />
      </div>
    ),
  },
)();

export const githubRepositoryBlock = createReactBlockSpec(
  {
    type: "githubRepository",
    propSchema: { url: { default: "" } },
    content: "none",
  },
  {
    render: ({ block, editor }) => (
      <div
        className="bg-card my-1 w-full overflow-hidden rounded-xl border shadow-xs"
        contentEditable={false}
      >
        <GitHubRepositoryContent
          key={block.props.url}
          url={block.props.url}
          editable={editor.isEditable}
          onCommit={(url) => editor.updateBlock(block, { props: { url } })}
        />
      </div>
    ),
  },
)();
