"use client";

import { FC, useState } from "react";
import styles from "../styles/auth.module.scss";
import { Path } from "../constant";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/auth";

export const AuthPage: FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isLogin = location.pathname === Path.Login;
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login, register } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      if (isLogin) {
        await login(username, password);
        navigate(Path.Home);
      } else {
        await register(username, password);
        // After successful registration, navigate to login
        navigate(Path.Login);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <div className={styles.authHeader}>
          <h1>VGC Assistant</h1>
          <p>Ask me anything about VGC and Competitive play</p>
        </div>
        {error && <div className={styles.errorMessage}>{error}</div>}
        <form onSubmit={handleSubmit} className={styles.authForm}>
          <div className={styles.formGroup}>
            <input
              type="text"
              id="username"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Username"
            />
          </div>
          <div className={styles.formGroup}>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Password"
            />
          </div>
          <div className={styles.buttonGroup}>
            <button
              type="button"
              onClick={() => navigate(isLogin ? Path.Register : Path.Login)}
              className={styles.authButton}
            >
              {isLogin ? "Register" : "Back to Login"}
            </button>
            <button type="submit" className={styles.authButton}>
              {isLogin ? "Login" : "Register"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
