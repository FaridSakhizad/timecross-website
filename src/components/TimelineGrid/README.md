# Planner Components

## Entry Points

- `desktop/DesktopGrid.tsx`: desktop view, with no device detection.
- `mobile/MobileGrid.tsx`: touch view, with no device detection.
- `shared/TimelineGridSession.tsx`: session state and data for the explicitly supplied `View`.
- `../Planner/Planner.tsx`: application-level selector. `layout="auto"` follows input capabilities;
  `layout="desktop"` and `layout="mobile"` force the requested implementation on any device.
- `index.tsx`: compatibility entry for the application-level selector.

Both implementations support `presentation="zen"` and `presentation="embedded"`.
These presentation options select page framing and scroll ownership, not an input device.

## Ownership

`desktop/` owns mouse panning, marquee selection, its frame/handles, desktop layout, toolbar and styles.
`mobile/` owns touch resizing, initial range selection, page scroll locking, mobile layout, toolbar and styles.
Neither implementation imports anything from the other folder.

`shared/` owns city/session state, URL restoration, date calculations, hour blocks, user hour blocks,
city row markup, calendar actions and pure range geometry. Its scroll helpers work
with an explicit page or element target, without deciding which implementation should be displayed.
Shared modules do not import either implementation or perform device detection.

`DesktopToolbar.tsx` and `MobileToolbar.tsx` own their markup, menu state and button sets.
Their CSS is in `DesktopToolbar.css` and `MobileToolbar.css`. Mobile has no decorative backdrop or
placeholder controls. Calendar actions and the toolbar data contract are shared; there is no shared
toolbar component or arbitrary control slot.

Selection portals have separate `_desktop` and `_mobile` layer classes. Each version styles its own
frame and handles. The common cell classes and selection data attributes are intentionally unchanged.
Current scrollbar calibration constants are in `desktop/DesktopGrid.tsx`.

## Changing Or Removing A Version

Change automatic selection only in `../Planner/`. To remove a version, remove its import/selection
there, its folder and its dedicated tests. Shared cells, calendars and URL state need no changes.
The application selector keeps session state above the selected view so cities and committed ranges
survive a view switch.

Run `node --experimental-strip-types --test tests/*.test.mjs` from the project root. Architecture
tests verify dependency isolation, explicit layout selection and independent selection-frame styles.
