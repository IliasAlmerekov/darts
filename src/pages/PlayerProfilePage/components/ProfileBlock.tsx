import React, { useId } from "react";
import clsx from "clsx";
import { SampleBadge } from "./SampleBadge";
import styles from "./ProfileBlock.module.css";

interface ProfileBlockProps {
  title: string;
  iconSrc: string;
  isSample?: boolean;
  className?: string | undefined;
  children: React.ReactNode;
}

/** One titled block of the Player profile, with an icon and an optional sample badge. */
export function ProfileBlock({
  title,
  iconSrc,
  isSample = false,
  className,
  children,
}: ProfileBlockProps): React.JSX.Element {
  const headingId = useId();

  return (
    <section className={clsx(styles.profileBlock, className)} aria-labelledby={headingId}>
      <header className={styles.blockHeader}>
        <img className={styles.blockIcon} src={iconSrc} alt="" width={28} height={28} />
        <h3 className={styles.blockTitle} id={headingId}>
          {title}
        </h3>
        {isSample ? <SampleBadge /> : null}
      </header>
      {children}
    </section>
  );
}
