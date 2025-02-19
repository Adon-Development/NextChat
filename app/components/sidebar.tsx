"use client";

import { useState } from "react";
import { useNavigate } from "../hooks/useNavigate";
import { Path } from "../constant";
import styles from "../styles/sidebar.module.scss";
import { useAuthStore } from "../store/auth";
import { IconButton } from "./button";
import { SideBarContainer, SideBarBody } from "./layout";
import { Selector } from "./selector";
import MaskIcon from "../icons/mask.svg";
import McpIcon from "../icons/mcp.svg";
import DiscoveryIcon from "../icons/discovery.svg";
import Locale from "../locales";
import { useMobileScreen } from "../utils";
import { useAppConfig } from "../store";

const DISCOVERY = [
  { name: Locale.Plugin.Name, path: Path.Plugins },
  { name: Locale.Mcp.Name, path: Path.McpMarket },
  { name: Locale.SearchChat.Page.Title, path: Path.SearchChat },
];

export function SideBar(props: { className?: string }) {
  const [showSideBar, setShowSideBar] = useState(true);
  const [showMaskModal, setShowMaskModal] = useState(false);
  const [showPluginModal, setShowPluginModal] = useState(false);
  const [showDiscoverySelector, setshowDiscoverySelector] = useState(false);
  const { isAuthenticated, username, logout } = useAuthStore();
  const navigate = useNavigate();
  const config = useAppConfig();
  const isMobileScreen = useMobileScreen();
  const shouldNarrow = !isMobileScreen && config.sidebarWidth < 300;
  const [mcpEnabled, setMcpEnabled] = useState(false);

  return (
    <SideBarContainer className={props.className} shouldNarrow={shouldNarrow}>
      <div className={styles["sidebar-header"]}>
        <div className={styles["sidebar-title"]}>
          <div>VGC Assistant</div>
          <div className={styles["sidebar-sub-title"]}>
            {isAuthenticated ? `Logged in as: ${username}` : "Not logged in"}
          </div>
        </div>
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

      <div className={styles["sidebar-header-bar"]}>
        <IconButton
          icon={<MaskIcon />}
          text={shouldNarrow ? undefined : Locale.Mask.Name}
          className={styles["sidebar-bar-button"]}
          onClick={() => {
            if (config.dontShowMaskSplashScreen !== true) {
              navigate(Path.NewChat);
            } else {
              navigate(Path.Masks);
            }
          }}
          shadow
        />
        {mcpEnabled && (
          <IconButton
            icon={<McpIcon />}
            text={shouldNarrow ? undefined : Locale.Mcp.Name}
            className={styles["sidebar-bar-button"]}
            onClick={() => {
              navigate(Path.McpMarket);
            }}
            shadow
          />
        )}
        <IconButton
          icon={<DiscoveryIcon />}
          text={shouldNarrow ? undefined : Locale.Discovery.Name}
          className={styles["sidebar-bar-button"]}
          onClick={() => setshowDiscoverySelector(true)}
          shadow
        />
      </div>

      {showDiscoverySelector && (
        <Selector
          items={[
            ...DISCOVERY.map((item) => {
              return {
                title: item.name,
                value: item.path,
              };
            }),
          ]}
          onClose={() => setshowDiscoverySelector(false)}
          onSelection={(s) => {
            navigate(s[0]);
          }}
        />
      )}

      <SideBarBody
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            navigate(Path.Home);
          }
        }}
      >
        {/* Chat List */}
      </SideBarBody>
    </SideBarContainer>
  );
}
