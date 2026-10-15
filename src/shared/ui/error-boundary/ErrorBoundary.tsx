import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorFallback } from './ErrorFallback';

export type ErrorBoundaryProps = {
  children: ReactNode;
  /** Label for the recovery action, e.g. "Back to menu". */
  recoverLabel?: string;
  /** Invoked after the boundary resets its own state. */
  onRecover?: () => void;
  onError?: (error: Error, info: ErrorInfo) => void;
};

type ErrorBoundaryState = {
  error: Error | null;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { error: null };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  public componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);
  }

  private readonly handleRecover = (): void => {
    this.setState({ error: null });
    this.props.onRecover?.();
  };

  public render(): ReactNode {
    const { error } = this.state;
    if (error === null) {
      return this.props.children;
    }

    return (
      <ErrorFallback
        message={error.message}
        actions={[{ label: this.props.recoverLabel ?? 'Try again', onClick: this.handleRecover }]}
      />
    );
  }
}
