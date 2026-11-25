# Planner (TimelineGrid)

The meeting planner: a grid of cities × hours with range selection. Pages render it through
`lazyWidgets.ts`: the grid page as `presentation="zen"` (default), the home and meeting planner pages
as `presentation="embedded"`. CSS classes use the `timelineGrid` prefix.

## Entry Points

- `TimelineGrid.tsx` (`index.ts`): the only place that picks a view. `layout="auto"` follows input
  capabilities (`layout.ts`); `layout="desktop"` and `layout="mobile"` force the requested view on any device.
- `desktop/DesktopGrid.tsx`: desktop view, with no device detection.
- `mobile/MobileGrid.tsx`: touch view, with no device detection.
- `shared/TimelineGridSession.tsx`: session state and data for the explicitly supplied `View`.

Both views support `presentation="zen"` and `presentation="embedded"`.
These presentation options select page framing and scroll ownership, not an input device.

## Ownership

`desktop/` owns mouse panning, marquee selection, its frame/handles, desktop layout, toolbar and styles.
`mobile/` owns touch resizing, page scroll locking, mobile layout, toolbar and styles.
Neither implementation imports anything from the other folder (enforced by `no-restricted-imports` in `eslint.config.js`).

`shared/` owns city/session state, URL state (`sessionUrlState.ts` for cities and date,
`eventUrlState.ts` for a shared event), hour cells (`timelineCells.ts`, `constants.ts`), user hour blocks,
city row markup, calendar actions and pure range geometry, including the "New meeting" range
(`getMeetingSeed`: every city, one hour in the middle of the screen). A selection is made of
half-hour slots (`SelectedGridSlot`, `GRID_SLOT_MS`): the cells stay whole hours, but both
geometry readers split each cell into two halves (`getHourCellSlots`). A frame picks only the
time and spans every city, behind `FEATURES.timeOnlyFrame` (who the meeting is for is checked in
the selection card): it is drawn across every city in whole hours (`getWholeHourSlots`), and its two
side handles (`GRID_FRAME_HANDLES`) and the keyboard then move its sides by 30 minutes. Such a frame takes in the user's hours too
(`GRID_FRAME_COVERS_USER_HOURS`): it starts at the top of the content, where their row is, and is
drawn above that sticky row; the hours a selection touches show as selected in it as well
(`getSelectedHourStarts`), painted by the controllers while a frame is drawn. The
selection card sits by the frame on both versions; both place it with `selectionCardPlacement.ts`. A cell shows as selected when either of its
halves is (`isGridHourSelected`). Its scroll helpers work
with an explicit page or element target, without deciding which implementation should be displayed.
Shared modules do not import either implementation or perform device detection (also enforced by ESLint).

`DesktopToolbar.tsx` and `MobileToolbar.tsx` own their markup, menu state and button sets.
Their styles live in `desktop/style.css` and `mobile/style.css`. Mobile has no decorative backdrop or
placeholder controls. Calendar actions and the toolbar data contract are shared; there is no shared
toolbar component or arbitrary control slot.

Persistent selection frames are absolute siblings of the rows inside `.timelineGrid-content`.
The content container clips frame overflow without introducing another scroller. Frames move with
native scrolling; idle scroll events do not measure or reposition them. Only the desktop's temporary
mouse marquee uses a fixed portal. Shared frame and base handle styles live in `shared/selection.css`;
each version owns its handle sizes, positions and input-specific styles. The common cell classes
and selection data attributes are unchanged.
Current scrollbar calibration constants are in `desktop/DesktopGrid.tsx`.

## Changing Or Removing A Version

Change automatic selection only in `TimelineGrid.tsx` and `layout.ts`. To remove a version, remove its import/selection
there, its folder and its dedicated tests. Shared cells, calendars and URL state need no changes.
The application selector keeps session state above the selected view so cities and committed ranges
survive a view switch.

Run `node --experimental-strip-types --test tests/*.test.mjs` from the project root. Architecture
tests verify dependency isolation, explicit layout selection and independent selection-frame styles.
