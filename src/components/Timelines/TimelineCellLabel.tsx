type TimelineCellLabelProps = {
  label: string;
  periodClassName: string;
};

const DAY_PERIOD_PATTERN = /^(.*)\s(AM|PM)$/;

export default function TimelineCellLabel({
  label,
  periodClassName,
}: TimelineCellLabelProps) {
  const match = label.match(DAY_PERIOD_PATTERN);

  if (!match) {
    return label;
  }

  return (
    <>
      {match[1]} <span className={periodClassName}>{match[2]}</span>
    </>
  );
}
