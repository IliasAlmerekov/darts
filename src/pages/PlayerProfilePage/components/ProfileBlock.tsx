import React, { useId } from "react";
import clsx from "clsx";
import { SampleBadge } from "./SampleBadge";
import styles from "./ProfileBlock.module.css";

interface ProfileBlockProps {
  title: string;
  iconSrc?: string;
  description?: string;
  action?: React.ReactNode;
  isSample?: boolean;
  className?: string | undefined;
  children: React.ReactNode;
}

/** One titled block of the Player profile, with an optional icon, action and sample badge. */
export function ProfileBlock({
  title,
  iconSrc,
  description,
  action,
  isSample = false,
  className,
  children,
}: ProfileBlockProps): React.JSX.Element {
  const headingId = useId();

  return (
    <section className={clsx(styles.profileBlock, className)} aria-labelledby={headingId}>
      <header className={styles.blockHeader}>
        {iconSrc ? (
          <img className={styles.blockIcon} src={iconSrc} alt="" width={28} height={28} />
        ) : null}
        <div className={styles.blockHeading}>
          <div className={styles.titleRow}>
            <h3 className={styles.blockTitle} id={headingId}>
              {title}
            </h3>
            {isSample ? <SampleBadge /> : null}
          </div>
          {description ? <p className={styles.blockDescription}>{description}</p> : null}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
