// core/graph-builder.js
import fs from 'fs';
import path from 'path';

const graph = {};
const visited = new Set();

/**
 * Recursively build import graph for a file.
 * @param {string} entryPath - Absolute path to the entry file
 * @param {object} [options]
 * @param {RegExp} [options.matcher] - RegExp to match valid import targets
 * @returns {Promise<object>} - Graph of file -> [imported files]
 */
export async function buildImportGraph(entryPath, options = {}) {
    const matcher = options.matcher || /\.(js|ts)$/;

    async function walk(filePath) {
        const absPath = path.resolve(filePath);
        if (visited.has(absPath) || !matcher.test(absPath)) return;
        visited.add(absPath);

        let code;
        try {
            code = await fs.promises.readFile(absPath, 'utf-8');
        } catch {
            return;
        }

        const imports = parseImports(code, path.dirname(absPath));
        graph[absPath] = imports;

        for (const dep of imports) {
            await walk(dep);
        }
    }

    await walk(entryPath);
    return graph;
}

/**
 * Parse static import statements and resolve relative paths.
 * @param {string} code
 * @param {string} dir
 * @returns {string[]} resolved paths
 */
function parseImports(code, dir) {
    const importRegex = /import\s+(?:["'][^"']+["']|.+?from\s+["']([^"']+)["'])/g;
    const result = new Set(); // 👈 prevent duplicates

    let match;
    while ((match = importRegex.exec(code))) {
        const raw = match[1] || match[0].split('import')[1].trim().replace(/['"]/g, '');
        if (!raw.startsWith('.')) continue; // Skip node_modules

        let full = path.resolve(dir, raw);
        if (!/\.(js|ts)$/.test(full)) {
            if (fs.existsSync(full + '.js')) full += '.js';
            else if (fs.existsSync(full + '.ts')) full += '.ts';
            else continue;
        }

        result.add(full); // 👈 add to Set
    }

    return Array.from(result); // 👈 convert back to array
}

export function buildReverseGraph(forward) {
    const reverse = {};
    for (const [from, deps] of Object.entries(forward)) {
        for (const dep of deps) {
            if (!reverse[dep]) reverse[dep] = [];
            reverse[dep].push(from);
        }
    }
    return reverse;
}

export function findNearestHandler(changedPath, reverseGraph, handlers) {
    const visited = new Set();
    const queue = [changedPath];

    while (queue.length > 0) {
        const current = queue.shift();
        if (handlers.has(current)) return current;

        const parents = reverseGraph[current] || [];
        for (const parent of parents) {
            if (!visited.has(parent)) {
                visited.add(parent);
                queue.push(parent);
            }
        }
    }

    return null; // fallback to reload
}
