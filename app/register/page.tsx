"use client";

import { FC } from "react";
import styles from "../styles/auth.module.scss";
import { Path } from "../constant";
import { useNavigate } from "../hooks/useNavigate";
import Link from "next/link";

const RegisterPage: FC = () => {
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement registration logic
    // For now, just redirect to login
    navigate(Path.Login);
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <div className={styles.authHeader}>
          <Link href={Path.Home} className={styles.backButton}>
            ← Back
          </Link>
          <h1>Register</h1>
        </div>
        <form onSubmit={handleSubmit} className={styles.authForm}>
          <div className={styles.formGroup}>
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              required
              placeholder="Choose a username"
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              required
              placeholder="Enter your email"
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              required
              placeholder="Choose a password"
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              required
              placeholder="Confirm your password"
            />
          </div>
          <button type="submit" className={styles.submitButton}>
            Register
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
