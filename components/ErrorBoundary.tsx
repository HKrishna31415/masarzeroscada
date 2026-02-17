import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, Trash2, ShieldAlert } from 'lucide-react';

interface Props {
  children?: ReactNode;
  viewName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  // Explicitly declare props to resolve TypeScript property existence check
  public readonly props: Readonly<Props>;

  constructor(props: Props) {
    super(props);
    this.props = props;
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleHardReset = () => {
    localStorage.clear();
    window.location.reload();
  };

  public render() {
    const { viewName, children } = this.props;

    if (this.state.hasError) {
      return (
        <div className="h-full w-full min-h-[400px] flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-[#0b1121] text-center border-2 border-dashed border-rose-200 dark:border-rose-900/30 rounded-xl animate-in fade-in duration-500">
          <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/20 rounded-full flex items-center justify-center mb-6">
            <ShieldAlert size={40} className="text-rose-600 dark:text-rose-500" />
          </div>
          
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-widest">
            System Malfunction
          </h2>
          
          <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8 font-mono text-sm">
            Module: {viewName || 'Unknown'}<br/>
            Error: {this.state.error?.message || 'Critical Rendering Failure'}
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={this.handleReload}
              className="flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-lg hover:opacity-90 transition-opacity shadow-lg"
            >
              <RefreshCw size={18} /> System Restart
            </button>
            
            <button 
              onClick={this.handleHardReset}
              className="flex items-center gap-2 px-6 py-3 bg-rose-100 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 font-bold rounded-lg hover:bg-rose-200 dark:hover:bg-rose-900/40 transition-colors border border-rose-200 dark:border-rose-800"
            >
              <Trash2 size={18} /> Purge Cache
            </button>
          </div>
          
          <div className="mt-8 text-[10px] text-slate-400 uppercase font-bold tracking-widest">
            Error Code: 0xCRASH_RENDER
          </div>
        </div>
      );
    }

    return children;
  }
}