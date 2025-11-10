import { buildImportGraph } from './graph-builder.js';
import chokidar from 'chokidar';
import path from 'path';

/**
 * Watches a full dependency tree and triggers on file change.
 * @param {string} entry - Entry file path
 * @param {(file: string) => void} onChange - Callback when any file changes
 */
export async function watchImports(entry, onChange) {
    const graph = await buildImportGraph(entry);
    const files = Object.keys(graph);

    const watcher = chokidar.watch(files, {
        ignoreInitial: true,
        persistent: true,
    });

    watcher.on('change', file => {
        console.log(`[watcher] Changed: ${file}`);
        onChange(path.resolve(file));
    });

    return watcher;
}