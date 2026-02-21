"use client";

import * as React from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "../Button";
import { ArrowButton } from "../ArrowButton";
import { cn } from "@/utils/cn";
import { WheelPicker, WheelPickerWrapper } from "../ui/wheel-picker";
import { ClockIcon } from "../Icons/ClockIcon";
import { HourIcon } from "../Icons/HourIcon";

interface TimePickerProps {
  value?: string; // Format: "HH:MM" (24-hour format)
  defaultValue?: string;
  onChange?: (value: string) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}

const createTimeOptions = (length: number, start = 0) =>
  Array.from({ length }, (_, i) => {
    const value = i + start;
    return {
      label: value.toString().padStart(2, "0"),
      value: value.toString().padStart(2, "0"),
    };
  });

const hourOptions = createTimeOptions(24); // 00-23
const minuteOptions = createTimeOptions(60); // 00-59

export function TimePicker({
  value: controlledValue,
  defaultValue,
  onChange,
  className,
  disabled = false,
  placeholder = "00:00",
}: TimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [internalValue, setInternalValue] = React.useState<string>(
    defaultValue || ""
  );
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const [popoverWidth, setPopoverWidth] = React.useState<string | undefined>();

  const isControlled = controlledValue !== undefined;
  const currentValue = isControlled ? controlledValue : internalValue;

  const [tempHour, setTempHour] = React.useState<string>("00");
  const [tempMinute, setTempMinute] = React.useState<string>("00");

  // Get width from className or trigger element
  React.useEffect(() => {
    if (isOpen && triggerRef.current) {
      const width = triggerRef.current.offsetWidth;
      setPopoverWidth(`${width}px`);
    }
  }, [isOpen]);

  // Parse current value to hour and minute
  React.useEffect(() => {
    if (currentValue) {
      const parts = currentValue.split(":");
      if (parts.length === 2) {
        setTempHour(parts[0] || "00");
        setTempMinute(parts[1] || "00");
      }
    } else {
      setTempHour("00");
      setTempMinute("00");
    }
  }, [currentValue, isOpen]);

  const formatTime = (time: string): string => {
    if (!time) return placeholder;
    const parts = time.split(":");
    if (parts.length === 2) {
      return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
    }
    return placeholder;
  };

  const handleConfirm = () => {
    const newValue = `${tempHour.padStart(2, "0")}:${tempMinute.padStart(2, "0")}`;
    if (!isControlled) {
      setInternalValue(newValue);
    }
    onChange?.(newValue);
    setIsOpen(false);
  };

  const displayValue = currentValue ? formatTime(currentValue) : placeholder;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          className={cn(
            "border border-gray-7 gap-2 rounded-lg h-12 flex items-center justify-between px-3 w-full hover:bg-gray-3 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0",
            className
          )}
          onFocus={(e) => e.target.blur()}
        >
          <HourIcon className="w-5 h-5 text-gray-11 shrink-0" />
          <span
            className={cn(
              "font-normal text-base leading-[1.3] font-family-dm-sans text-center flex-1",
              currentValue ? "text-gray-12" : "text-gray-11"
            )}
          >
            {displayValue}
          </span>
          {/*  <div className="flex-none -scale-y-100 shrink-0">
            <ArrowButton isOpen={isOpen} />
          </div> */}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="z-100000 w-full p-2"
        align="start"
      >
        <div className="space-y-4 w-full">
          <div className="flex items-center justify-center w-full gap-1">
            <WheelPickerWrapper className="flex-1 w-full">
              <WheelPicker
                options={hourOptions}
                value={tempHour}
                onValueChange={setTempHour}
                infinite
              />

            </WheelPickerWrapper>

            <span className="text-gray-12 text-lg">:</span>
            <WheelPickerWrapper className="flex-1 w-full">
              <WheelPicker
                options={minuteOptions}
                value={tempMinute}
                onValueChange={setTempMinute}
                infinite
              />
            </WheelPickerWrapper>

          </div>
          <div className="flex items-center justify-end">
            <Button
              type="button"
              onClick={handleConfirm}
              className="w-full h-8 text-xs"
            >
              Confirmar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
