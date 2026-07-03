import { Component, type ErrorInfo, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: unknown[];
}

interface ErrorBoundaryState {
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
    console.error("[ErrorBoundary]", error.message, errorInfo.componentStack);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.error && this.props.resetKeys) {
      if (
        prevProps.resetKeys?.some((k, i) => k !== this.props.resetKeys![i])
      ) {
        this.reset();
      }
    }
  }

  reset = () => {
    this.setState({ error: null, errorInfo: null });
  };

  render() {
    if (!this.state.error) return this.props.children;

    if (this.props.fallback) {
      if (typeof this.props.fallback === "function") {
        return this.props.fallback(this.state.error, this.reset);
      }
      return this.props.fallback;
    }

    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 p-4",
          "text-white/50 text-xs text-center"
        )}
      >
        <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <span>Something went wrong</span>
        <button
          type="button"
          onClick={this.reset}
          className="text-white/30 hover:text-white/60 transition-colors underline cursor-pointer"
        >
          Try again
        </button>
      </div>
    );
  }
}
