import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

/**
 * Loading / NotFound fallback page
 * Usage:
 *  - Render <LoadingPage /> for unknown routes (404)
 *  - Or render <LoadingPage loading /> while waiting for data
 *
 * Place this file at: /src/pages/Loading.jsx
 */
export default function LoadingPage({ loading = false, error = null, retry = null }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [countdown, setCountdown] = useState(10);

    // If being used as an error/404 page, start a redirect countdown to home
    useEffect(() => {
        if (loading) return;
        const timer = setInterval(() => {
            setCountdown((c) => {
                if (c <= 1) {
                    clearInterval(timer);
                    navigate("/", { replace: true });
                    return 0;
                }
                return c - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [loading, navigate]);

    return (
        <div style={styles.container} role="alert" aria-live="polite">
            {loading ? (
                <div style={styles.card}>
                    <Spinner />
                    <h2 style={styles.title}>Loading…</h2>
                    <p style={styles.message}>Please wait while we load the content.</p>
                </div>
            ) : (
                <div style={styles.card}>
                    <svg
                        width="64"
                        height="64"
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden="true"
                        style={{ marginBottom: 12 }}
                    >
                        <path d="M11 9h2v6h-2z" fill="#ef4444" />
                        <path
                            d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16z"
                            fill="#fecaca"
                        />
                    </svg>

                    <h2 style={styles.title}>Page not found OR Error loading page</h2>
                    <p style={styles.message}>
                        No route matches <code style={styles.path}>{location.pathname}</code>.
                    </p>

                    {error && (
                        <div style={styles.errorBox}>
                            <strong style={{ color: "#7f1d1d" }}>Error:</strong> {String(error)}
                        </div>
                    )}

                    <div style={styles.controls}>
                        <button style={styles.button} onClick={() => navigate(-1)}>
                            Go back
                        </button>
                        <Link to="/" style={{ ...styles.button, ...styles.linkButton }}>
                            Home
                        </Link>
                        <button
                            style={{ ...styles.button }}
                            onClick={() => window.location.reload()}
                            // sx={{
                            //     borderColor: '#22d3ee',
                            //     color: '#22d3ee',
                            //     px: 4,
                            //     py: 1.5
                            // }}
                        >
                            Hard Reload
                        </button>

                        {/* {retry && ( */}
                            <button
                                style={{ ...styles.button, marginLeft: 8 }}
                                onClick={() => {
                                    retry();
                                }}
                            >
                                Retry
                            </button>
                        {/* )} */}
                    </div>

                    <p style={styles.small}>
                        Redirecting to Home in {countdown} second{countdown !== 1 ? "s" : ""}…
                    </p>
                </div>
            )}
        </div>
    );
}

function Spinner() {
    return (
        <svg
            width="56"
            height="56"
            viewBox="0 0 50 50"
            aria-hidden="true"
            style={{ marginBottom: 12 }}
        >
            <path
                fill="#2563eb"
                d="M43.935,25.145c0-10.318-8.37-18.688-18.688-18.688c-10.318,0-18.688,8.37-18.688,18.688h4.068
                    c0-8.071,6.549-14.62,14.62-14.62c8.071,0,14.62,6.549,14.62,14.62H43.935z"
            >
                <animateTransform
                    attributeType="xml"
                    attributeName="transform"
                    type="rotate"
                    from="0 25 25"
                    to="360 25 25"
                    dur="0.9s"
                    repeatCount="indefinite"
                />
            </path>
        </svg>
    );
}

const styles = {
    container: {
        minHeight: "70vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background: "#000",
        // background: "linear-gradient(180deg,#f8fafc,#fff)",
    },
    card: {
        maxWidth: 720,
        textAlign: "center",
        padding: 28,
        borderRadius: 12,
        boxShadow: "0 8px 30px rgba(2,6,23,0.08)",
        background: "#000000ff",
    },
    title: {
        margin: "8px 0 6px",
        fontSize: 20,
        color: "#eff2f8ff",
    },
    message: {
        margin: "0 0 12px",
        color: "#475569",
    },
    path: {
        fontFamily: "monospace",
        background: "#f1f5f9",
        padding: "2px 6px",
        borderRadius: 4,
    },
    controls: {
        display: "flex",
        justifyContent: "center",
        gap: 8,
        marginTop: 12,
        flexWrap: "wrap",
    },
    button: {
        background: "#2563eb",
        color: "#fff",
        border: "none",
        padding: "10px 14px",
        borderRadius: 8,
        cursor: "pointer",
        fontSize: 14,
    },
    linkButton: {
        display: "inline-block",
        textDecoration: "none",
        textAlign: "center",
    },
    small: {
        marginTop: 12,
        color: "#94a3b8",
        fontSize: 13,
    },
    errorBox: {
        marginTop: 8,
        padding: 10,
        borderRadius: 6,
        background: "#fff1f2",
        border: "1px solid #fecaca",
        color: "#7f1d1d",
        textAlign: "left",
        maxWidth: 560,
        marginLeft: "auto",
        marginRight: "auto",
    },
};