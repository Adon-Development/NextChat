"use client";

import { useNavigate } from "react-router-dom";
import { SideBarContainer, SideBarBody } from "../layout";
import { Path } from "@/app/constant";
import styles from "@/app/styles/sidebar.module.scss";
import { SdPanel } from "./sd-panel";
import { useSdStore } from "@/app/store/sd";
import { IconButton } from "../button";
import GithubIcon from "@/app/icons/github.svg";
import Locale from "@/app/locales";

const REPO_URL = "https://github.com/Adon-Development/NextChat";

export function SdSideBar(props: { className?: string }) {
  const navigate = useNavigate();
  const sdStore = useSdStore();

  const handleSubmit = () => {
    // TODO: Implement SD submission
    console.log("Submitting SD request");
  };

  return (
    <SideBarContainer className={props.className}>
      <div className={styles["sidebar-header"]}>
        <div className={styles["sidebar-title"]}>
          <div>Stable Diffusion</div>
          <div className={styles["sidebar-sub-title"]}>
            Create beautiful images with AI
          </div>
        </div>
      </div>

      <SideBarBody
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            navigate(Path.Home);
          }
        }}
      >
        <SdPanel />
        <div className={styles["sidebar-actions"]}>
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
            <IconButton icon={<GithubIcon />} shadow />
          </a>
          <IconButton
            text={Locale.SdPanel.Submit}
            type="primary"
            shadow
            onClick={handleSubmit}
          />
        </div>
      </SideBarBody>
    </SideBarContainer>
  );
}
