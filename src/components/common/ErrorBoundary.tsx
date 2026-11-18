import React, { Component } from "react";
import i18n from "@/i18n";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            padding: "2rem",
            fontFamily:
              'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
            color: "var(--text-primary, #e0e0e0)",
            background: "var(--bg-primary, #1a1a2e)",
          }}
        >
          <h2
            style={{
              fontSize: "1.5rem",
              marginBottom: "0.75rem",
              color: "var(--text-primary, #e0e0e0)",
            }}
          >
            {i18n.t("reader.boundaryTitle")}
          </h2>
          <p
            style={{
              fontSize: "0.875rem",
              color: "var(--text-secondary, #a0a0a0)",
              marginBottom: "1.5rem",
              textAlign: "center",
              maxWidth: "400px",
            }}
          >
            {this.state.error?.message ? `${i18n.t("reader.boundaryDetail")}: ${this.state.error.message}` : i18n.t("reader.boundaryDetail")}
          </p>
          <button
            onClick={this.handleReload}
            style={{
              padding: "0.5rem 1.5rem",
              fontSize: "0.875rem",
              borderRadius: "6px",
              border: "1px solid var(--border-color, #333)",
              background: "var(--bg-secondary, #252540)",
              color: "var(--text-primary, #e0e0e0)",
              cursor: "pointer",
            }}
          >
            {i18n.t("reader.retry")}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
