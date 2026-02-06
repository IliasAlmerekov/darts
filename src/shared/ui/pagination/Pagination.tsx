import * as React from "react";
import { ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon } from "lucide-react";
import styles from "./Pagination.module.css";

type Size = "icon" | "default";
type Variant = "ghost" | "outline";

function cx(...parts: Array<string | undefined | false>): string {
  return parts.filter(Boolean).join(" ");
}

function isModifiedEvent(e: React.MouseEvent<HTMLElement>): boolean {
  return e.metaKey || e.altKey || e.ctrlKey || e.shiftKey;
}

export function Pagination({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"nav">): React.JSX.Element {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      data-slot="pagination"
      className={cx(styles.pagination, className)}
      {...props}
    />
  );
}

export const PaginationContent = React.forwardRef<
  HTMLUListElement,
  React.ComponentPropsWithoutRef<"ul">
>(({ className, ...props }, ref) => {
  return (
    <ul
      ref={ref}
      data-slot="pagination-content"
      className={cx(styles.content, className)}
      {...props}
    />
  );
});
PaginationContent.displayName = "PaginationContent";

export const PaginationItem = React.forwardRef<HTMLLIElement, React.ComponentPropsWithoutRef<"li">>(
  ({ className, ...props }, ref) => {
    return (
      <li ref={ref} data-slot="pagination-item" className={cx(styles.item, className)} {...props} />
    );
  },
);
PaginationItem.displayName = "PaginationItem";

export type PaginationLinkProps = {
  isActive?: boolean;
  size?: Size;
  variant?: Variant;
  disabled?: boolean;
} & React.ComponentPropsWithoutRef<"a">;

export function PaginationLink({
  className,
  isActive,
  size = "icon",
  variant,
  disabled,
  onClick,
  children,
  href,
  "aria-current": ariaCurrent,
  ...props
}: PaginationLinkProps): React.JSX.Element {
  const resolvedVariant: Variant = variant ?? (isActive ? "outline" : "ghost");
  const resolvedHref = href ?? "#";

  return (
    <a
      data-slot="pagination-link"
      data-active={isActive ? "true" : "false"}
      href={resolvedHref}
      aria-current={isActive ? "page" : ariaCurrent}
      aria-disabled={disabled ? "true" : undefined}
      tabIndex={disabled ? -1 : props.tabIndex}
      className={cx(
        styles.link,
        size === "icon" ? styles.linkIcon : styles.linkDefault,
        resolvedVariant === "ghost" ? styles.ghost : styles.outline,
        disabled && styles.disabled,
        className,
      )}
      onClick={(e) => {
        if (disabled) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        if (isModifiedEvent(e)) return;
        if (onClick) {
          e.preventDefault();
          onClick(e);
        }
      }}
      {...props}
    >
      {children}
    </a>
  );
}

export function PaginationPrevious({
  className,
  text = "Previous",
  ...props
}: Omit<React.ComponentProps<typeof PaginationLink>, "children"> & {
  text?: string;
}): React.JSX.Element {
  return (
    <PaginationLink
      aria-label="Go to previous page"
      size="default"
      className={cx(styles.prevNext, className)}
      {...props}
    >
      <ChevronLeftIcon className={styles.icon} aria-hidden="true" />
      <span className={styles.prevNextText}>{text}</span>
    </PaginationLink>
  );
}

export function PaginationNext({
  className,
  text = "Next",
  ...props
}: Omit<React.ComponentProps<typeof PaginationLink>, "children"> & {
  text?: string;
}): React.JSX.Element {
  return (
    <PaginationLink
      aria-label="Go to next page"
      size="default"
      className={cx(styles.prevNext, className)}
      {...props}
    >
      <span className={styles.prevNextText}>{text}</span>
      <ChevronRightIcon className={styles.icon} aria-hidden="true" />
    </PaginationLink>
  );
}

export function PaginationEllipsis({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"span">): React.JSX.Element {
  return (
    <span
      aria-hidden="true"
      data-slot="pagination-ellipsis"
      className={cx(styles.ellipsis, className)}
      {...props}
    >
      <MoreHorizontalIcon className={styles.icon} aria-hidden="true" />
      <span className={styles.srOnly}>More pages</span>
    </span>
  );
}
