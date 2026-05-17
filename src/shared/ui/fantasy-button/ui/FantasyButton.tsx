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
      <span className='fantasy-button__frame' aria-hidden />

      <span className='fantasy-button__corner fantasy-button__corner--top-left' aria-hidden />
      <span className='fantasy-button__corner fantasy-button__corner--top-right' aria-hidden />
      <span className='fantasy-button__corner fantasy-button__corner--bottom-left' aria-hidden />
      <span className='fantasy-button__corner fantasy-button__corner--bottom-right' aria-hidden />
      <span className='fantasy-button__gem fantasy-button__gem--left' aria-hidden />
      <span className='fantasy-button__gem fantasy-button__gem--right' aria-hidden />
      <span className='fantasy-button__label'>{children}</span>
    </button>
  );
}
