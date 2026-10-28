import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { resolvePlannerLayout } from '../src/components/Planner/plannerLayout.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const grid = resolve(root, 'src/components/TimelineGrid');

function dependencies(entry, visited = new Set()) {
  const file = resolve(entry);
  if (visited.has(file)) return visited;
  visited.add(file);
  if (!['.ts', '.tsx'].includes(extname(file))) return visited;
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement)) continue;
    const specifier = statement.moduleSpecifier;
    if (!specifier || !ts.isStringLiteral(specifier) || !specifier.text.startsWith('.')) continue;
    const target = resolve(dirname(file), specifier.text);
    const match = [target, `${target}.ts`, `${target}.tsx`, `${target}/index.ts`, `${target}/index.tsx`]
      .find((candidate) => existsSync(candidate) && extname(candidate));
    assert.ok(match, `Missing local dependency: ${file} -> ${specifier.text}`);
    dependencies(match, visited);
  }
  return visited;
}

test('automatic layout follows input capabilities; explicit layout ignores the device', () => {
  assert.equal(resolvePlannerLayout('auto', false), 'desktop');
  assert.equal(resolvePlannerLayout('auto', true), 'mobile');
  for (const touch of [true, false]) {
    assert.equal(resolvePlannerLayout('desktop', touch), 'desktop');
    assert.equal(resolvePlannerLayout('mobile', touch), 'mobile');
  }
});

for (const [kind, other, component] of [
  ['desktop', 'mobile', 'DesktopGrid'],
  ['mobile', 'desktop', 'MobileGrid'],
]) {
  test(`${kind} entry is independent of the other implementation and automatic device detection`, () => {
    const files = [...dependencies(resolve(grid, kind, `${component}.tsx`))];
    assert.ok(files.some((file) => file === resolve(grid, 'shared/GridUserHours.tsx')));
    assert.ok(files.some((file) => file === resolve(grid, 'shared/GridRow.tsx')));
    assert.ok(!files.some((file) => file.startsWith(resolve(grid, other) + '/')));
    assert.ok(!files.some((file) => file.endsWith('/useMobileWidgetLayout.ts')));
    assert.ok(!files.some((file) => file.endsWith('/Planner/Planner.tsx')));
    assert.ok(files.some((file) => file.endsWith(`/${kind}/${kind === 'desktop' ? 'Desktop' : 'Mobile'}Toolbar.tsx`)));
    assert.ok(!files.some((file) => file.endsWith('/shared/GridToolbar.tsx')));
    assert.ok(!files.some((file) => file.endsWith('/Timelines/TimelinesTopControls.tsx')));
  });
}

test('shared modules have no dependencies on desktop or mobile implementation folders', () => {
  for (const name of readdirSync(resolve(grid, 'shared')).filter((name) => /\.tsx?$/.test(name))) {
    const files = [...dependencies(resolve(grid, 'shared', name))];
    assert.ok(!files.some((file) => file.startsWith(resolve(grid, 'desktop') + '/')), name);
    assert.ok(!files.some((file) => file.startsWith(resolve(grid, 'mobile') + '/')), name);
  }
});

test('desktop toolbar is an unconditional sibling before the grid, never inside it', () => {
  const file = resolve(grid, 'desktop/DesktopGrid.tsx');
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let shell;
  function visit(node) {
    if (ts.isReturnStatement(node) && node.expression && ts.isParenthesizedExpression(node.expression)
      && ts.isJsxElement(node.expression.expression)) shell = node.expression.expression;
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(shell);
  const children = shell.children.filter((node) => !ts.isJsxText(node));
  assert.ok(ts.isJsxExpression(children[0]));
  assert.equal(children[0].expression?.getText(source), 'toolbar');
  assert.ok(ts.isJsxElement(children[1]));
  assert.ok(children[1].openingElement.getText(source).includes("'timelineGrid'"));
  assert.ok(!children[1].children.some((node) => ts.isJsxExpression(node)
    && node.expression?.getText(source).includes('toolbar')));
});

test('toolbar styles are independent and mobile has no decorative backdrop styles', () => {
  const desktop = readFileSync(resolve(grid, 'desktop/DesktopToolbar.css'), 'utf8');
  const mobile = readFileSync(resolve(grid, 'mobile/MobileToolbar.css'), 'utf8');
  const timelines = readFileSync(resolve(root, 'src/components/Timelines/style.css'), 'utf8');
  assert.ok(desktop.includes('.widgetHeader_desktop'));
  assert.ok(desktop.includes('.widgetHeader-backdrop'));
  assert.ok(!desktop.includes('_mobile'));
  assert.ok(mobile.includes('.widgetHeader_mobile'));
  assert.ok(!mobile.includes('widgetHeader-backdrop'));
  assert.ok(!mobile.includes('_desktop'));
  assert.ok(!timelines.includes('widgetHeader'));
});

test('selection base styles are shared while handle adaptations remain isolated', () => {
  const desktop = readFileSync(resolve(grid, 'desktop/style.css'), 'utf8');
  const mobile = readFileSync(resolve(grid, 'mobile/style.css'), 'utf8');
  const shared = readFileSync(resolve(grid, 'shared/selection.css'), 'utf8');
  assert.ok(shared.includes('.timelineGridSelectionLayer {'));
  assert.ok(shared.includes(':where(.timelineGridSelectionLayer) .timelineGridSelectionFrame'));
  assert.ok(shared.includes(':where(.timelineGridSelectionLayer .timelineGridSelectionHandle) {'));
  assert.ok(shared.includes('.timelineGridSelectionHandle:focus-visible'));
  assert.ok(desktop.includes(':where(.timelineGridSelectionLayer_desktop) .timelineGridSelectionHandle_n'));
  assert.ok(mobile.includes('.timelineGridSelectionLayer_mobile {'));
  assert.ok(mobile.includes('width: min(44px, calc(100% / 3))'));
  for (const [kind, component] of [['desktop', 'DesktopSelectionOverlay'], ['mobile', 'MobileSelectionOverlay']]) {
    assert.ok([...dependencies(resolve(grid, kind, `${component}.tsx`))].includes(resolve(grid, 'shared/selection.css')));
    const css = kind === 'desktop' ? desktop : mobile;
    assert.ok(!css.includes(' .timelineGridSelectionFrame {'));
    assert.ok(!css.includes('.timelineGridSelectionHandle:focus-visible'));
  }
  assert.ok(!desktop.includes('_mobile'));
  assert.ok(!mobile.includes('_desktop'));
  assert.ok(!shared.includes('_mobile'));
  assert.ok(!shared.includes('_desktop'));
});
