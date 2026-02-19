import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

type AppErrorBoundaryProps = {
  children: React.ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
  message: string;
};

export default class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      message: '',
    };
  }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'Erreur inattendue',
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    trackEvent('ui_runtime_error', {
      message: error.message,
      stackHead: error.stack?.split('\n').slice(0, 2).join(' | '),
      componentStackHead: errorInfo.componentStack?.split('\n').slice(0, 2).join(' | '),
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-100 px-4 py-10">
          <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-xl bg-red-100 p-2 text-red-700">
                <AlertTriangle size={18} />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-900">Une erreur est survenue</h1>
                <p className="mt-1 text-sm text-slate-700">
                  L’application a rencontré un problème inattendu. Recharge la page pour continuer.
                </p>
                <p className="mt-2 text-xs text-slate-500 break-all">{this.state.message}</p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-4 inline-flex rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Recharger
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

