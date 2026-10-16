import type { InputHTMLAttributes } from 'react';
import styles from './ToggleSwitch.module.css';

type NativeCheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'role'>;

export type ToggleSwitchProps = NativeCheckboxProps;

/**
 * An on/off switch styled as the kit's iron toggle with a gold knob. It stays
 * a native checkbox underneath (keyboard, form and label semantics come for
 * free) and exposes the switch role so screen readers announce on/off.
 */
export function ToggleSwitch({ className, ...rest }: ToggleSwitchProps) {
  const mergedClassName = className ? `${styles.switch} ${className}` : styles.switch;
  return <input type="checkbox" role="switch" className={mergedClassName} {...rest} />;
}
