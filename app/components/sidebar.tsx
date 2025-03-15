"use client";

import { useState } from "react";
import styles from "../styles/sidebar.module.scss";
import { Path } from "../constant";
import { useNavigate } from "../hooks/useNavigate";
import { useAuthStore } from "../store/auth";
import { IconButton } from "./button";
import CloseIcon from "../icons/close.svg";

export function SideBar(props: { className?: string }) {
  const [showSidePanel, setShowSidePanel] = useState(false);
  const { isAuthenticated, username, logout } = useAuthStore();
  const navigate = useNavigate();

  return (
    <div className={styles.sidebar}>
      <div className={styles["sidebar-header"]}>
        <div className={styles["sidebar-title"]}>VGC Assistant1</div>
        {isAuthenticated && (
          <div className={styles["sidebar-user-info"]}>
            Logged in as: {username}
          </div>
        )}
        <div className={styles["auth-buttons"]}>
          {isAuthenticated ? (
            <button
              className={styles["auth-button"]}
              onClick={() => {
                logout();
                navigate(Path.Login);
              }}
            >
              Logout
            </button>
          ) : (
            <>
              <button
                className={styles["auth-button"]}
                onClick={() => navigate(Path.Login)}
              >
                Login
              </button>
              <button
                className={styles["auth-button"]}
                onClick={() => navigate(Path.Register)}
              >
                Register
              </button>
            </>
          )}
        </div>
      </div>

      <div className={styles["sidebar-body"]}>
        {/* Chat list will go here */}
      </div>

      <div className={styles["sidebar-tail"]}>
        <div className={styles["sidebar-actions"]}>
          <div className={styles["sidebar-action"] + " " + styles.mobile}>
            <IconButton
              icon={<CloseIcon />}
              onClick={() => setShowSidePanel(false)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
