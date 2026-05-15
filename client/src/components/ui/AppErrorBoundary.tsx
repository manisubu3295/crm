import { Component, type ErrorInfo, type ReactNode } from "react";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  errorMessage?: string;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[AppErrorBoundary] Unhandled error", { error, errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#020813] px-6 text-slate-100">
          <div className="w-full max-w-lg rounded-2xl border border-blue-900/60 bg-slate-950/80 p-8 shadow-2xl shadow-blue-950/40 backdrop-blur-md">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300/80">
              CRM Recovery Mode
            </p>
            <h1 className="mb-3 text-2xl font-bold tracking-tight text-white">
              Something went wrong
            </h1>
            <p className="mb-6 text-sm text-slate-300">
              The app hit an unexpected error. Reload to restore your session.
            </p>
            {this.state.errorMessage && (
              <p className="mb-6 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-400">
                {this.state.errorMessage}
              </p>
            )}
            <button
              onClick={this.handleReload}
              className="rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
              type="button"
            >
              Reload CRM
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
