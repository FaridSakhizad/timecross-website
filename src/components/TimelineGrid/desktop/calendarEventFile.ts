import { createEvent } from 'ics';
import type { GridCalendarEvent } from './gridSelection.ts';

export function createCalendarEventFile(event: Pick<GridCalendarEvent, 'start' | 'end' | 'title' | 'details'>): File {
  const { error, value } = createEvent({
    start: event.start,
    end: event.end,
    startInputType: 'utc',
    startOutputType: 'utc',
    endInputType: 'utc',
    endOutputType: 'utc',
    title: event.title,
    description: event.details,
    productId: 'timecross.app',
    method: 'PUBLISH',
  });
  if (error || !value) throw error ?? new Error('Unable to generate calendar file');
  const stamp = new Date(event.start).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  return new File([value], `timecross-${stamp}.ics`, { type: 'text/calendar' });
}

export function downloadCalendarFile(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  try {
    link.href = url;
    link.download = file.name;
    document.body.append(link);
    link.click();
  } finally {
    link.remove();
    // Give the browser time to consume the object URL before releasing it.
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
}
