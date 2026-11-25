import type * as CalendarEventFile from './calendarEventFile';

// The .ics generator (ics + yup) is a separate chunk: preloaded once there is an event, so the
// download still starts synchronously inside the click.
type CalendarFileModule = typeof CalendarEventFile;

let calendarFileModule: CalendarFileModule | null = null;
let calendarFileModulePromise: Promise<CalendarFileModule> | null = null;

export function loadCalendarFileModule() {
  calendarFileModulePromise ??= import('./calendarEventFile')
    .then((module) => {
      calendarFileModule = module;
      return module;
    })
    .catch((error: unknown) => {
      calendarFileModulePromise = null;
      throw error;
    });

  return calendarFileModulePromise;
}

/** The loaded module, or null while it is still loading. */
export function getLoadedCalendarFileModule() {
  return calendarFileModule;
}
