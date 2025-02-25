"use client";

import styles from "./loading.module.scss";
import LoadingIcon from "./icons/three-dots.svg";

export default function Loading() {
  return (
    <div className={styles.loading}>
      <LoadingIcon />
    </div>
  );
}
