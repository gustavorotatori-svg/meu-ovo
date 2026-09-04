import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  declare props: Props;
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Caught:', error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <ErrorFallback onReload={this.handleReload} />
      );
    }
    return this.props.children;
  }
}

function ErrorFallback({ onReload }: { onReload: () => void }) {
  const savedTheme = localStorage.getItem('theme') || 'auto';
  const hour = new Date().getHours();
  const isDark = savedTheme === 'dark' || (savedTheme === 'auto' && (hour < 6 || hour >= 18));

  return (
    <div className={`min-h-screen flex items-center justify-center p-8 transition-colors ${isDark ? 'bg-dark-bg' : 'bg-slate-50'}`}>
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4">🍳</div>
        <h2 className={`font-black text-2xl mb-2 ${isDark ? 'text-white' : 'text-[#111]'}`}>Algo deu errado</h2>
        <p className={`text-sm mb-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Ocorreu um erro inesperado. Tente recarregar a página.
        </p>
        <button
          onClick={onReload}
          className="bg-[#FFC928] text-[#111] font-black px-6 py-3 rounded-2xl hover:bg-[#e6b520] hover:scale-105 active:scale-95 transition-all"
        >
          Recarregar
        </button>
      </div>
    </div>
  );
}
