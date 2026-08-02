"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ModeToggle() {
  const [isMounted, setIsMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="bg-background/50 border-border h-8 w-44 animate-pulse rounded-md border" />
    );
  }

  return (
    <Select value={theme} onValueChange={(val) => setTheme(val)}>
      <SelectTrigger className="bg-background/50 border-border/80 focus:ring-primary/50 h-8 w-44 text-xs font-normal focus:ring-1">
        <SelectValue placeholder="Use system setting" />
      </SelectTrigger>
      <SelectContent align="end" className="text-xs">
        <SelectItem value="system">Use system setting</SelectItem>
        <SelectItem value="light">Light</SelectItem>
        <SelectItem value="dark">Dark</SelectItem>
      </SelectContent>
    </Select>
  );
}
