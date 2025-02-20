"use client";

import { FC, useState } from "react";
import styles from "../styles/auth.module.scss";
import { Path } from "../constant";
import { useNavigate } from "../hooks/useNavigate";
import Link from "next/link";
import { useAuthStore } from "../store/auth";

const LoginPage: FC = () => {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const formData = new FormData(e.target as HTMLFormElement);
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

    try {
      await login(username, password);
      navigate(Path.Home);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
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
              disabled={isLoading}
            />
          </div>
          <div className={styles.formGroup}>
            <input
              type="password"
              id="password"
              name="password"
              required
              placeholder="Password"
              disabled={isLoading}
            />
          </div>
          {error && <div className={styles.error}>{error}</div>}
          <div className={styles.buttonGroup}>
            <Link href={Path.Register} className={styles.authButton}>
              Register
            </Link>
            <button
              type="submit"
              className={styles.authButton}
              disabled={isLoading}
            >
              {isLoading ? "Logging in..." : "Login"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
