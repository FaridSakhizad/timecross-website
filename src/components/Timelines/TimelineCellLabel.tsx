type TimelineCellLabelProps = {
  label: string;
  period: string | null;
  periodClassName: string;
};

export default function TimelineCellLabel({
  label,
  period,
  periodClassName,
}: TimelineCellLabelProps) {
  if (!period) {
    return label;
  }

  return (
    <>
      {label}
      {' '}
      <span className={periodClassName}>{period}</span>
    </>
  );
}
