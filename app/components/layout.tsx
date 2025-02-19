import { ReactNode } from "react";
import styles from "../styles/sidebar.module.scss";

export function SideBarContainer(props: {
  children: ReactNode;
  shouldNarrow?: boolean;
  className?: string;
}) {
  const { children, className, shouldNarrow } = props;
  return (
    <div
      className={`${styles.sidebar} ${className} ${
        shouldNarrow ? styles["narrow-sidebar"] : ""
      }`}
    >
      {children}
    </div>
  );
}

export function SideBarBody(props: {
  children: ReactNode;
  onClick?: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
}) {
  const { onClick, children } = props;
  return (
    <div className={styles["sidebar-body"]} onClick={onClick}>
      {children}
    </div>
  );
}
