// components/Layout.js
// Replaces base.html — sidebar, nav, flash messages

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/router";
import Head from "next/head";
import { useEffect } from "react";

export default function Layout({ children, title = "MDC Leisure Finder", flash }) {
  const { data: session } = useSession();
  const router = useRouter();
  const ep = router.pathname;

  // Auto-dismiss flash messages after 4s — mirrors public/app.js
  useEffect(() => {
    const timers = [];
    document.querySelectorAll(".flash").forEach((el) => {
      const t1 = setTimeout(() => {
        el.style.transition = "opacity 0.5s";
        el.style.opacity = "0";
        const t2 = setTimeout(() => el.remove(), 500);
        timers.push(t2);
      }, 4000);
      timers.push(t1);
    });
    return () => timers.forEach(clearTimeout);
  }, [flash]);

  return (
    <>
      <Head>
        <title>{title}</title>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/favicon.png" />
        <link rel="stylesheet" href="/style.css" />
      </Head>

      {session && (
        <aside className="sidebar">
          <div className="sidebar-brand">
            <img src="/mdc_logo.svg" alt="MDC" className="brand-logo-img" />
            <span className="brand-text">Leisure Finder Portal</span>
          </div>
          <nav className="sidebar-nav">
            <Link href="/dashboard" className={`nav-item ${ep === "/dashboard" ? "active" : ""}`}>
              <span className="nav-icon">⊡</span> Dashboard
            </Link>
            <Link href="/members" className={`nav-item ${["/members", "/members/[id]/edit", "/members/[id]/timetable"].includes(ep) ? "active" : ""}`}>
              <span className="nav-icon">◉</span> Members
            </Link>
            <Link href="/finder" className={`nav-item ${ep === "/finder" ? "active" : ""}`}>
              <span className="nav-icon">◈</span> Leisure Finder
            </Link>
          </nav>
          <div className="sidebar-footer">
            <button onClick={() => signOut({ callbackUrl: "/login" })} className="logout-btn"
              style={{ width:"100%", padding:"10px 20px", background:"rgba(255,255,255,0.1)",
                border:"1px solid rgba(255,255,255,0.2)", borderRadius:"8px", color:"#ffffff",
                cursor:"pointer", fontSize:"0.875rem", fontWeight:500,
                display:"flex", alignItems:"center", gap:"8px" }}>
              ⏻ Logout
            </button>
          </div>
        </aside>
      )}

      {/* Mobile bottom navigation */}
      {session && (
        <nav className="bottom-nav">
          <Link href="/dashboard" className={ep === "/dashboard" ? "active" : ""}>
            <span className="nav-icon">⊡</span>
            Dashboard
          </Link>
          <Link href="/members" className={ep.startsWith("/members") ? "active" : ""}>
            <span className="nav-icon">◉</span>
            Members
          </Link>
          <Link href="/finder" className={ep === "/finder" ? "active" : ""}>
            <span className="nav-icon">◈</span>
            Finder
          </Link>
          <button onClick={() => signOut({ callbackUrl: "/login" })}>
            <span className="nav-icon">⏻</span>
            Logout
          </button>
        </nav>
      )}

      <main className={`main-content ${!session ? "full-width" : ""}`}>
        {flash && (
          <div className="flash-container">
            <div className={`flash flash-${flash.type}`}>{flash.message}</div>
          </div>
        )}
        {children}
      </main>
    </>
  );
}