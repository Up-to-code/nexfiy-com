"use client";

import { useState } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type DateTimePickerPopoverProps = {
  value?: number; // Epoch timestamp
  onChange: (timestamp?: number) => void;
  ariaLabel?: string;
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Preset delivery / valet time slots
const TIME_PRESETS = [
  "09:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "01:00 PM",
  "02:00 PM",
  "03:00 PM",
  "04:00 PM",
  "05:00 PM",
  "06:00 PM",
  "07:00 PM",
  "08:00 PM",
];

export function DateTimePickerPopover({
  value,
  onChange,
  ariaLabel,
}: DateTimePickerPopoverProps) {
  const [open, setOpen] = useState(false);

  const initialDate = value ? new Date(value) : new Date();
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth());
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
  const [selectedTime, setSelectedTime] = useState<string>(() => {
    if (!value) return "09:00 AM";
    const d = new Date(value);
    const hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    const formattedHours = (hours % 12 || 12).toString().padStart(2, "0");
    return `${formattedHours}:${minutes} ${ampm}`;
  });
  const [includeTime, setIncludeTime] = useState(false);

  const activeDate = value ? new Date(value) : undefined;

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    let hours = 0;
    let minutes = 0;

    if (includeTime && selectedTime) {
      const [timeStr, ampm] = selectedTime.split(" ");
      const [hStr, mStr] = timeStr.split(":");
      let parsedH = parseInt(hStr, 10);
      if (ampm === "PM" && parsedH < 12) parsedH += 12;
      if (ampm === "AM" && parsedH === 12) parsedH = 0;
      hours = parsedH;
      minutes = parseInt(mStr, 10) || 0;
    }

    const newDate = new Date(currentYear, currentMonth, day, hours, minutes);
    onChange(newDate.getTime());
  };

  const handleSelectTime = (presetTime: string) => {
    setSelectedTime(presetTime);
    setIncludeTime(true);

    if (activeDate) {
      const [timeStr, ampm] = presetTime.split(" ");
      const [hStr, mStr] = timeStr.split(":");
      let parsedH = parseInt(hStr, 10);
      if (ampm === "PM" && parsedH < 12) parsedH += 12;
      if (ampm === "AM" && parsedH === 12) parsedH = 0;

      const updatedDate = new Date(
        activeDate.getFullYear(),
        activeDate.getMonth(),
        activeDate.getDate(),
        parsedH,
        parseInt(mStr, 10) || 0,
      );
      onChange(updatedDate.getTime());
    }
  };

  const handleClear = () => {
    onChange(undefined);
    setOpen(false);
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentMonth(now.getMonth());
    setCurrentYear(now.getFullYear());
    onChange(now.getTime());
  };

  const formatDisplay = () => {
    if (!value) return null;
    const d = new Date(value);
    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const year = d.getFullYear();

    let text = `${day}/${month}/${year}`;
    if (includeTime || d.getHours() !== 0 || d.getMinutes() !== 0) {
      const hours = d.getHours();
      const minutes = d.getMinutes().toString().padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      const formattedHours = (hours % 12 || 12).toString().padStart(2, "0");
      text += ` ${formattedHours}:${minutes} ${ampm}`;
    }
    return text;
  };

  const displayText = formatDisplay();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel ?? "Choose date and time"}
          className={cn(
            "flex h-8 w-full items-center justify-between gap-2 px-2.5 text-left text-xs font-medium transition-colors hover:bg-muted/40 rounded-md",
            displayText ? "text-foreground" : "text-muted-foreground",
          )}
        >
          <span className="truncate">{displayText ?? "Empty"}</span>
          <CalendarIcon className="size-3.5 shrink-0 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[300px] p-3 shadow-xl border-border/60 rounded-xl bg-popover"
      >
        {/* Month Header Navigation */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/40">
          <span className="text-sm font-semibold">
            {MONTHS[currentMonth]} {currentYear}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handlePrevMonth}
              className="size-7 rounded-md"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleNextMonth}
              className="size-7 rounded-md"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-1 text-center mb-1">
          {DAYS_OF_WEEK.map((d) => (
            <span
              key={d}
              className="text-[10px] font-semibold text-muted-foreground uppercase"
            >
              {d}
            </span>
          ))}
        </div>

        {/* Day Grid */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="size-7" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const isSelected =
              activeDate &&
              activeDate.getDate() === dayNum &&
              activeDate.getMonth() === currentMonth &&
              activeDate.getFullYear() === currentYear;

            const isToday =
              new Date().getDate() === dayNum &&
              new Date().getMonth() === currentMonth &&
              new Date().getFullYear() === currentYear;

            return (
              <button
                key={dayNum}
                type="button"
                onClick={() => handleSelectDay(dayNum)}
                className={cn(
                  "flex size-7 items-center justify-center rounded-md text-xs font-medium transition-all hover:bg-muted/70",
                  isSelected &&
                    "bg-[#2383E2] text-white hover:bg-[#1d6fc2] font-bold shadow-xs",
                  !isSelected && isToday && "border border-[#2383E2] text-[#2383E2]",
                )}
              >
                {dayNum}
              </button>
            );
          })}
        </div>

        {/* Time Selection Section */}
        <div className="mt-3 pt-3 border-t border-border/40 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
              <Clock className="size-3.5 text-[#2383E2]" /> Delivery Time
            </span>
            <button
              type="button"
              onClick={() => setIncludeTime(!includeTime)}
              className={cn(
                "text-[11px] font-semibold transition-colors",
                includeTime ? "text-[#2383E2]" : "text-muted-foreground/70",
              )}
            >
              {includeTime ? "Time On" : "+ Add Time"}
            </button>
          </div>

          {includeTime ? (
            <div className="grid grid-cols-3 gap-1 max-h-24 overflow-y-auto pr-1">
              {TIME_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleSelectTime(preset)}
                  className={cn(
                    "rounded px-1.5 py-1 text-[11px] font-mono transition-colors border",
                    selectedTime === preset
                      ? "bg-[#2383E2] text-white border-[#2383E2]"
                      : "border-border/40 hover:bg-muted/50 text-foreground/80",
                  )}
                >
                  {preset}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between text-xs">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-7 text-xs text-muted-foreground hover:text-destructive px-2"
          >
            <X className="size-3 mr-1" /> Clear
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToday}
            className="h-7 text-xs text-[#2383E2] hover:text-[#1d6fc2] font-semibold px-2"
          >
            Today
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
