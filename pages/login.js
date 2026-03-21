// pages/login.js
// Replaces login.html + Flask /login route

import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/router";
import Head from "next/head";

export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (session) return { redirect: { destination: "/dashboard", permanent: false } };
  return { props: {} };
}

export default function Login() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const username = e.target.username.value.trim();
    const password = e.target.password.value.trim();

    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid credentials. Please try again.");
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <>
      <Head>
        <title>Leisure Finder Portal</title>
        <link rel="icon" type="image/svg+xml" href="/mdc_logo.svg" />
        <link rel="shortcut icon" href="/mdc_logo.svg" />
        <link rel="stylesheet" href="/style.css" />
      </Head>
      <main className="main-content full-width">
        <div className="login-wrapper">
          <div className="login-card glass-card">
            <img src="/mdc_logo.svg" alt="MDC Logo" className="login-logo-img" />
            <h1 className="login-title">Leisure Finder Portal</h1>
            <p className="login-subtitle">Meta Developers Communities</p>

            {error && <div className="flash flash-error">{error}</div>}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input type="text" id="username" name="username" placeholder="admin" required autoComplete="username" />
              </div>
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input type="password" id="password" name="password" placeholder="••••••••" required autoComplete="current-password" />
              </div>
              <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                {loading ? "Signing in…" : "Sign In"}
              </button>
            </form>
          </div>
        </div>
      </main>
    </>
  );
}