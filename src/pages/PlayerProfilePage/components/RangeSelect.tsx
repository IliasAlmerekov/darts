import React from "react";
import { DropdownMenu } from "@fujiui/react";
import styles from "./RangeSelect.module.css";

interface RangeSelectProps {
  label: string;
  option: string;
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

// shortcut: the API serves one range, so the menu has one item; add items with ranges.
export function RangeSelect({ label, option }: RangeSelectProps): React.JSX.Element {
  return (
    <DropdownMenu>
      <DropdownMenu.Trigger className={styles.trigger} aria-label={`${label}: ${option}`}>
        {option}
        <ChevronIcon />
      </DropdownMenu.Trigger>
      <DropdownMenu.Content className={styles.menu} align="center">
        <DropdownMenu.Item className={styles.item}>
          {option}
          <CheckIcon />
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu>
  );
}
