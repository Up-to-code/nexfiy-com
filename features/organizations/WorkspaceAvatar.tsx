import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type WorkspaceAvatarProps = {
  name: string;
  image?: string | null;
  className?: string;
};

export function WorkspaceAvatar({
  name,
  image,
  className,
}: WorkspaceAvatarProps) {
  const initial = name.trim().charAt(0).toLocaleUpperCase() || "W";

  return (
    <Avatar
      className={cn(
        "size-10 rounded-[10px] border bg-background shadow-xs",
        className,
      )}
    >
      <AvatarImage src={image ?? undefined} alt="" className="object-cover" />
      <AvatarFallback className="rounded-[9px] bg-muted text-sm font-semibold text-foreground">
        {initial}
      </AvatarFallback>
    </Avatar>
  );
}
