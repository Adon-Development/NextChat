"use client";

import { FC } from "react";
import styles from "../styles/auth.module.scss";
import { Path } from "../constant";
import { useNavigate } from "../hooks/useNavigate";
import Link from "next/link";

const LoginPage: FC = () => {
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement login logic
    navigate(Path.Home);
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <div className={styles.authHeader}>
          <h1>VGC Assistant</h1>
          <p>Ask me anything about VGC and Competitive play</p>
        </div>
        <form onSubmit={handleSubmit} className={styles.authForm}>
          <div className={styles.formGroup}>
            <input
              type="text"
              id="username"
              name="username"
              required
              placeholder="Username"
            />
          </div>
          <div className={styles.formGroup}>
            <input
              type="password"
              id="password"
              name="password"
              required
              placeholder="Password"
            />
          </div>
          <div className={styles.buttonGroup}>
            <Link href={Path.Register} className={styles.authButton}>
              Register
            </Link>
            <button type="submit" className={styles.authButton}>
              Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
