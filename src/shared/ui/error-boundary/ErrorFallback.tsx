import type { ReactNode } from 'react';
import styles from './ErrorBoundary.module.css';

export type ErrorFallbackAction = {
  label: string;
  onClick: () => void;
  /** The action to reach first with the keyboard; defaults to the first one. */
  isPrimary?: boolean;
};

export type ErrorFallbackProps = {
  title?: string;
  message: string;
  actions: readonly ErrorFallbackAction[];
  children?: ReactNode;
};

/**
 * The "something broke" panel shared by the React error boundary and the
 * engine error state: a title, the message, and one or more recover actions.
 */
export function ErrorFallback({
  title = 'Something broke',
  message,
  actions,
  children,
}: ErrorFallbackProps) {
  return (
    <div className={styles.boundary} role="alert">
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.message}>{message || 'Unexpected error'}</p>
      {children}
      <div className={styles.actions}>
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            className={action.isPrimary === false ? styles.secondaryButton : styles.recoverButton}
            onClick={action.onClick}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
