import React from "react";
import { DropdownMenu } from "@fujiui/react";
import styles from "./RangeSelect.module.css";

interface RangeSelectOption<Value extends string> {
  value: Value;
  label: string;
}

interface RangeSelectProps<Value extends string> {
  label: string;
  options: readonly RangeSelectOption<Value>[];
  value: Value;
  onSelect?: (value: Value) => void;
}

function ChevronIcon(): React.JSX.Element {
  return (
    <svg
      className={styles.chevron}
      viewBox="-4 -4 32 32"
      width={24}
      height={24}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CheckIcon(): React.JSX.Element {
  return (
    <svg
      className={styles.check}
      viewBox="0 0 24 24"
      width={16}
      height={16}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/** A menu of the games a block counts; the trigger shows the selected option. */
export function RangeSelect<Value extends string>({
  label,
  options,
  value,
  onSelect,
}: RangeSelectProps<Value>): React.JSX.Element {
  const selected = options.find((option) => option.value === value)?.label ?? value;

  return (
    <DropdownMenu>
      <DropdownMenu.Trigger className={styles.trigger} aria-label={`${label}: ${selected}`}>
        {selected}
        <ChevronIcon />
      </DropdownMenu.Trigger>
      <DropdownMenu.Content className={styles.menu} align="center">
        {options.map((option) => (
          <DropdownMenu.Item
            key={option.value}
            className={styles.item}
            onClick={() => onSelect?.(option.value)}
          >
            {option.label}
            {option.value === value ? <CheckIcon /> : null}
          </DropdownMenu.Item>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu>
  );
}
