import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './FantasyButton.css';

export type FantasyButtonTone = 'emerald' | 'ember' | 'steel';

type NativeButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>;

export type FantasyButtonProps = NativeButtonProps & {
  children: ReactNode;
  tone?: FantasyButtonTone;
};

export function FantasyButton({
  children,
  tone = 'emerald',
  className,
  type = 'button',
  ...rest
}: FantasyButtonProps) {
  const toneClassName = `fantasy-button--${tone}`;
  const mergedClassName = className
    ? `fantasy-button ${toneClassName} ${className}`
    : `fantasy-button ${toneClassName}`;

  return (
    <button type={type} className={mergedClassName} {...rest}>
      <span className='fantasy-button__label'>{children}</span>
    </button>
  );
}
