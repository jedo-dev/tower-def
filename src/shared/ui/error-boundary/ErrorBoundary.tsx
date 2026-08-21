import { Component, type ErrorInfo, type ReactNode } from 'react';
import styles from './ErrorBoundary.module.css';

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
      <div className={styles.boundary} role="alert">
        <h2 className={styles.title}>Something broke</h2>
        <p className={styles.message}>{error.message || 'Unexpected error'}</p>
        <button type="button" className={styles.recoverButton} onClick={this.handleRecover}>
          {this.props.recoverLabel ?? 'Try again'}
        </button>
      </div>
    );
  }
}
