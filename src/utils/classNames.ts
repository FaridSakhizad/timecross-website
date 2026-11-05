type ClassName = string | false | null | undefined;

/** Joins class names, skipping empty ones: cx('button', isActive && 'isActive', className). */
export function cx(...classNames: ClassName[]) {
  return classNames.filter(Boolean).join(' ');
}
