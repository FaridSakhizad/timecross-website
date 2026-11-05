/**
 * Lets tests import the app's source as Vite does: extensionless relative imports, TSX, JSON,
 * assets (CSS and images become their URL) and `import.meta.env` of a production build. Call it
 * before importing any source module.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';
// The app's packages are loaded before the hooks are registered: CommonJS packages loaded
// through the hooks lose their named exports (`import { useState } from 'react'` would fail).
import 'react';
import 'react/jsx-runtime';
import 'react-dom';
import 'react-dom/server';
import 'react-router';
import '@dnd-kit/core';
import '@dnd-kit/sortable';
import '@dnd-kit/utilities';
import 'lucide-react';
import 'date-fns';
import 'ics';

const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
const sourceRoots = ['src/', 'server/'].map((folder) => `${projectRoot}${folder}`);
const ASSET_EXTENSIONS = new Set(['.css', '.svg', '.png', '.jpg']);
const IMPORT_META_ENV = 'import.meta.env = { DEV: false, PROD: true, MODE: \'production\' };\n';

function resolveSourceFile(specifier, parentURL) {
  const path = fileURLToPath(new URL(specifier, parentURL));

  return [path, `${path}.ts`, `${path}.tsx`, `${path}/index.ts`, `${path}/index.tsx`]
    .find((candidate) => existsSync(candidate) && statSync(candidate).isFile());
}

function transpile(path) {
  const source = readFileSync(path, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    fileName: path,
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      verbatimModuleSyntax: true,
    },
  });

  return source.includes('import.meta.env') ? IMPORT_META_ENV + outputText : outputText;
}

/** Returns the hooks; call `deregister()` on them in `after()`. */
export function registerSourceLoader() {
  return registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
        const file = resolveSourceFile(specifier, context.parentURL);

        if (file) {
          return nextResolve(pathToFileURL(file).href, context);
        }
      }

      return nextResolve(specifier, context);
    },
    load(url, context, nextLoad) {
      const path = url.startsWith('file:') ? fileURLToPath(url) : '';

      if (!sourceRoots.some((root) => path.startsWith(root))) {
        return nextLoad(url, context);
      }

      const extension = extname(path);

      if (extension === '.ts' || extension === '.tsx') {
        return { format: 'module', source: transpile(path), shortCircuit: true };
      }

      if (extension === '.json') {
        return { format: 'module', source: `export default ${readFileSync(path, 'utf8')};`, shortCircuit: true };
      }

      if (ASSET_EXTENSIONS.has(extension)) {
        return { format: 'module', source: `export default ${JSON.stringify(url)};`, shortCircuit: true };
      }

      return nextLoad(url, context);
    },
  });
}
