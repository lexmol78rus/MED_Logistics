import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

type Props = {
  children: ReactNode;
  title?: string;
};

type State = {
  error: Error | null;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-6 m-4 rounded border border-red-200 bg-red-50 text-red-900">
          <h2 className="text-sm font-bold">{this.props.title ?? 'Ошибка отображения'}</h2>
          <p className="text-xs mt-2 font-mono break-words">{this.state.error.message}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-4"
            onClick={() => this.setState({ error: null })}
          >
            Повторить
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
