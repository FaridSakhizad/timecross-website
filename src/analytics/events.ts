/**
 * Every event the website sends, with its own properties: nothing outside this list leaves the
 * page. Each event also carries the page it happened on (see getPageProperties in analytics.ts).
 * No titles, city names or other text typed by the visitor are sent.
 */
export type AnalyticsEvents = {
  /** A page was opened: a full load or a move to another page within the website. */
  $pageview: Record<string, never>;

  /** A button to an app store; installs are counted by the store, by campaign (see appStoreLinks.ts). */
  app_store_click: {
    store: AppStore;
    placement: AppStorePlacement;
  };

  /** A city was added to the visitor's list, on any page that has one. */
  city_added: Record<string, never>;

  /** The converter was used for the first time on the page: a city, a date or a time picked. */
  converter_used: {
    change: 'sourceCity' | 'date' | 'time';
  };

  /** Hours were selected in the planner, without a meeting from a link. */
  meeting_started: Record<string, never>;

  /** A meeting from a link was opened. */
  meeting_link_opened: {
    cities: number;
  };

  /** A meeting from a link was taken into editing. */
  meeting_edit_started: Record<string, never>;

  /** A meeting left the website: into a calendar, a file, the clipboard or the share sheet. */
  meeting_saved: {
    method: MeetingSaveMethod;
    cities: number;
    durationMinutes: number;
    /** The meeting came from a link and was not edited. */
    fromLink: boolean;
  };
};

export type AnalyticsEventName = keyof AnalyticsEvents;

export type AppStore = 'appStore' | 'googlePlay';

/** Where the button is: the home page's hero, its download section, the call to action on a tool page. */
export type AppStorePlacement = 'hero' | 'homeDownload' | 'toolCta';

export type MeetingSaveMethod = 'googleCalendar' | 'outlook' | 'ics' | 'text' | 'link' | 'share';
