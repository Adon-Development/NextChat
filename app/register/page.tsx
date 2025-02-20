"use client";

import { FC, useState } from "react";
import styles from "../styles/auth.module.scss";
import { Path } from "../constant";
import { useNavigate } from "../hooks/useNavigate";
import Link from "next/link";
import { useAuthStore } from "../store/auth";

const RegisterPage: FC = () => {
  const navigate = useNavigate();
  const register = useAuthStore((state) => state.register);
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
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      // First register the user
      await register(username, password);
      // Then automatically log them in
      await login(username, password);
      navigate(Path.Home);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <div className={styles.authHeader}>
          <h1>VGC Assistant</h1>
          <p>Create your account to get started</p>
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
              minLength={3}
              maxLength={20}
              pattern="[a-zA-Z0-9_-]+"
              title="Username can only contain letters, numbers, underscores, and hyphens"
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
              minLength={6}
            />
          </div>
          <div className={styles.formGroup}>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              required
              placeholder="Confirm Password"
              disabled={isLoading}
              minLength={6}
            />
          </div>
          {error && <div className={styles.error}>{error}</div>}
          <button
            type="submit"
            className={styles.authButton}
            disabled={isLoading}
          >
            {isLoading ? "Creating Account..." : "Register"}
          </button>
          <p className={styles.authSwitch}>
            Already have an account? <Link href={Path.Login}>Login here</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;
