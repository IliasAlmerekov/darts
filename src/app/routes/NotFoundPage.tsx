import React from "react";
import { Link } from "react-router-dom";
import dartIllustration from "@/assets/images/not-found-dart.webp";
import { ROUTES } from "@/lib/router/routes";
import styles from "./NotFoundPage.module.css";

function NotFoundPage(): React.JSX.Element {
  return (
    <main className={styles.page}>
      <div className={styles.stage} aria-hidden="true">
        <span className={styles.numeral}>404</span>
        <img className={styles.dart} src={dartIllustration} alt="" width={1200} height={1200} />
      </div>
      <h1 className={styles.title}>Page not found</h1>
      <p className={styles.message}>This page seems to have missed the target.</p>
      <Link className={styles.backLink} to={ROUTES.start()}>
        Back to start
      </Link>
    </main>
  );
}

export default NotFoundPage;
