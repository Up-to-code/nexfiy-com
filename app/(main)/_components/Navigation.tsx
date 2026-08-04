"use client";

import React, {
  ComponentRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useMediaQuery } from "usehooks-ts";
import { useMutation } from "convex/react";
import { useParams, usePathname, useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { api } from "@/convex/_generated/api";
import { DocumentList } from "./DocumentList";
import { Item } from "./Item";
import { UserItem } from "./UserItem";

import { toast } from "sonner";
import {
  ChevronsLeft,
  MenuIcon,
  Plus,
  PlusCircle,
  Search,
  Settings,
  Trash,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TrashBox } from "./TrashBox";
import { useSearch } from "@/hooks/useSearch";
import { useSettings } from "@/hooks/useSettingsModal";
import { Navbar } from "./Navbar";
import { ScrollableList } from "@/components/scrollable-list";
import { FavoritesList } from "./FavoritesList";
import { ActionTooltip } from "@/components/action-tooltip";
import { useFocusMode } from "@/hooks/useFocusMode";
import NavDrawer from "./NavDrawer";
import { useI18n } from "@/lib/i18n/I18nProvider";
import posthog from "posthog-js";

const Navigation = () => {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();

  const isMobile = useMediaQuery("(max-width: 768px)");
  const isDesktop = useMediaQuery("(min-width: 1020px)");

  const search = useSearch();
  const settings = useSettings();
  const { t } = useI18n();

  const { focusMode, setFocusMode } = useFocusMode();
  const prevFocusMode = useRef(focusMode);

  const create = useMutation(api.documents.create);

  const isResizingRef = useRef(false);
  const sidebarRef = useRef<ComponentRef<"aside">>(null);
  const navbarRef = useRef<ComponentRef<"div">>(null);

  const [isResetting, setIsResetting] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(isMobile);

  const [isNavbarHovered, setIsNavbarHovered] = useState(false);

  const resetWidth = useCallback(() => {
    if (!sidebarRef.current || !navbarRef.current) return;
    setIsCollapsed(false);
    setIsResetting(true);
    setTimeout(() => {
      if (!sidebarRef.current || !navbarRef.current) return;
      sidebarRef.current.style.width = isMobile ? "100%" : "240px";
      navbarRef.current.style.setProperty(
        "width",
        isMobile ? "0" : "calc(100% - 240px)",
      );
      navbarRef.current.style.setProperty("left", isMobile ? "100%" : "240px");
    }, 0);
    setTimeout(() => setIsResetting(false), 300);
  }, [isMobile]);

  const collapse = useCallback(() => {
    if (!sidebarRef.current || !navbarRef.current) return;
    setIsCollapsed(true);
    setIsResetting(true);
    sidebarRef.current.style.width = "0";
    navbarRef.current.style.setProperty("width", "100%");
    navbarRef.current.style.setProperty("left", "0");
    setTimeout(() => setIsResetting(false), 300);
  }, []);

  // sidebar effects
  useEffect(() => {
    if (isMobile) {
      collapse();
    } else {
      resetWidth();
    }
  }, [collapse, isMobile, resetWidth]);

  useEffect(() => {
    if (isMobile) {
      collapse();
    }
  }, [collapse, pathname, isMobile]);

  // focus mode effects
  useEffect(() => {
    if (isMobile) return;

    if (focusMode && params.documentId) {
      collapse();
    } else if (!focusMode && prevFocusMode.current && params.documentId) {
      resetWidth();
    } else if (!isCollapsed) {
      resetWidth();
    }

    prevFocusMode.current = focusMode;
  }, [
    collapse,
    focusMode,
    isCollapsed,
    isMobile,
    params.documentId,
    resetWidth,
  ]);

  useEffect(() => {
    if (!navbarRef.current) return;

    if (
      focusMode &&
      params.documentId &&
      !isNavbarHovered &&
      isCollapsed &&
      !isMobile
    ) {
      const timer = setTimeout(
        () => navbarRef.current?.style.setProperty("opacity", "0"),
        400,
      );
      return () => clearTimeout(timer);
    } else {
      navbarRef.current.style.removeProperty("opacity");
    }
  }, [focusMode, params.documentId, isMobile, isNavbarHovered, isCollapsed]);

  // key binds effects
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "\\") {
        e.preventDefault();
        if (isCollapsed) resetWidth();
        else collapse();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [collapse, isCollapsed, resetWidth]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "F") {
        e.preventDefault();
        setFocusMode(!focusMode);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [focusMode, setFocusMode]);

  const handleMouseDown = (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    isResizingRef.current = true;
    setIsResizing(true);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizingRef.current) return;
    let newWidth = e.clientX;

    if (newWidth < 240) newWidth = 240;
    if (newWidth > 480) newWidth = 480;

    if (sidebarRef.current && navbarRef.current) {
      sidebarRef.current.style.width = `${newWidth}px`;
      navbarRef.current.style.setProperty("left", `${newWidth}px`);
      navbarRef.current.style.setProperty(
        "width",
        `calc(100% - ${newWidth}px)`,
      );
    }
  };

  const handleMouseUp = () => {
    isResizingRef.current = false;
    setIsResizing(false);
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  const handleCreate = () => {
    const promise = create({ title: t("common.untitled") }).then((documentId) => {
      posthog.capture("document_created", { source: "navigation" });
      router.push(`/documents/${documentId}`);
    });

    toast.promise(promise, {
      loading: t("app.creatingNote"),
      success: t("app.noteCreated"),
      error: t("app.createFailed"),
    });
  };

  return (
    <>
      <aside
        ref={sidebarRef}
        className={cn(
          "group/sidebar bg-sidebar border-sidebar-border relative z-300 flex h-full w-60 flex-col overflow-hidden overflow-x-hidden border-r pb-4",
          isResetting && "transition-all duration-300 ease-in-out",
          isMobile && "w-0",
        )}
      >
        <ActionTooltip label={t("app.closeSidebar")}>
          <div
            onClick={collapse}
            role="button"
            aria-label={t("app.closeSidebar")}
            className={cn(
              "text-muted-foreground absolute top-3 right-2 h-6 w-6 rounded-sm opacity-0 transition group-hover/sidebar:opacity-100 hover:bg-neutral-300 dark:hover:bg-neutral-600",
              isMobile && "opacity-100",
            )}
          >
            <ChevronsLeft className="h-6 w-6" />
          </div>
        </ActionTooltip>
        <div>
          <UserItem />
          <Item
            label={t("app.search")}
            icon={Search}
            onClick={search.onOpen}
            shortcut="Ctrl + K"
          />
          <Item
            label={t("app.settings")}
            icon={Settings}
            onClick={() => settings.onOpen("preferences")}
          />
          <Item onClick={handleCreate} label={t("app.newPage")} icon={PlusCircle} />
        </div>
        <div className="mt-4">
          <div>
            <ScrollableList>
              <FavoritesList />
              <div>
                <p className="text-muted-foreground/60 px-3 py-1 text-xs font-medium">
                  {t("app.notes")}
                </p>
                <DocumentList />
              </div>
            </ScrollableList>
          </div>
          <Item onClick={handleCreate} icon={Plus} label={t("app.addPage")} />
          <Popover>
            <PopoverTrigger className="mt-3 w-full">
              <Item label={t("app.trash")} icon={Trash} />
            </PopoverTrigger>
            <PopoverContent
              side={isMobile ? "bottom" : "right"}
              className="w-72 p-0"
              collisionPadding={16}
            >
              <TrashBox />
            </PopoverContent>
          </Popover>
        </div>
        <div
          onMouseDown={handleMouseDown}
          onClick={resetWidth}
          className="bg-primary/10 absolute top-0 right-0 h-full w-1 cursor-ew-resize opacity-0 transition group-hover/sidebar:opacity-100"
        ></div>
      </aside>
      {isCollapsed && isDesktop && !focusMode && (
        <NavDrawer resetWidth={resetWidth} isMobile={isMobile} />
      )}
      <div
        ref={navbarRef}
        onMouseEnter={() => setIsNavbarHovered(true)}
        onMouseLeave={() => setIsNavbarHovered(false)}
        className={cn(
          "absolute top-0 left-60 z-40 w-[calc(100%_-_240px)]",
          !isResizing &&
            "transition-[left,width,opacity,transform] duration-300 ease-out",
          isMobile && "left-0 w-full",
        )}
      >
        {!!params.documentId ? (
          (!isMobile || isCollapsed) && (
            <Navbar isCollapsed={isCollapsed} onResetWidth={resetWidth} />
          )
        ) : (
          <nav
            className={cn(
              "w-full bg-transparent px-3 py-2",
              !isCollapsed && "p-0",
            )}
          >
            {isCollapsed && (
              <ActionTooltip label={t("app.openSidebar")}>
                <button onClick={resetWidth}>
                  <MenuIcon className="text-muted-foreground h-6 w-6" />
                </button>
              </ActionTooltip>
            )}
          </nav>
        )}
      </div>
    </>
  );
};
export default Navigation;
