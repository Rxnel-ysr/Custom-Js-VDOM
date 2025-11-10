// native-watcher.js
import fs from 'fs';
import path from 'path';

const _watchedFile = new Set()

/**
 * Recursively watch all files in a directory.
 * @param {string} dir - directory path
 * @param {(file: string) => void} onChange
 */
function watchDirRecursive(dir, onChange, opt = {}) {
    const extPattern = (opt.ext || ['js', 'ts']).map(e => e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const ext = new RegExp('\\.(' + extPattern + ')$');
    const debounceDelay = opt.debounce || 100

    fs.watch(dir, (event, filename) => {
        if (!filename) return;
        if (event === 'rename') {
            const fullPath = path.join(dir, filename);
            if (fs.existsSync(fullPath)) {
                const stat = fs.statSync(fullPath);
                if (stat.isDirectory()) {
                    watchDirRecursive(fullPath, onChange, opt); // fixed
                } else if (opt.watchAll || ext.test(filename)) {
                    watchFile(fullPath, onChange, debounceDelay, opt.notice || false);
                    if (opt.notice) console.log(`[watch] New file: ${fullPath}`);
                    onChange(fullPath);
                }
            }
        }
    });
    

    // Still scan current content
    fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            watchDirRecursive(fullPath, onChange, opt);
        } else if (opt.watchAll || ext.test(entry.name)) {
            watchFile(fullPath, onChange, debounceDelay, opt.notice || false);
        }
    });
}


/**
 * Watch a single file using fs.watch
 */
function watchFile(file, onChange, debounceDelay = 100, notice = false) {
    let delay;
    if (_watchedFile.has(file)) return;
    _watchedFile.add(file)
    try {
        fs.watch(file, (event) => {
            if (event === 'change') {
                clearTimeout(delay)
                delay = setTimeout(() => {
                    if (notice) console.log(`[watch] ${file} modified`);
                    onChange(file);
                }, debounceDelay)
            }
        });
    } catch (err) {
        console.error(`[error] Can't watch ${file}`, err);
    }
}

export function watch(entry, onChange, opt = {}) {
    const abs = path.resolve(entry);
    const stat = fs.statSync(abs);

    if (stat.isDirectory()) {
        watchDirRecursive(abs, onChange, opt);
    } else {
        watchFile(abs, onChange, opt.debounce || 100, opt.notice || false);
    }
}
