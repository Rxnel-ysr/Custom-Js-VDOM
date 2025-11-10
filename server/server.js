// native-ws-server.js
import http from 'http';
import fs from 'fs/promises';
import path from 'path';
// import Url from 'url';
import { createWSServer } from './webSock.js';
import { watch } from '../core/file-watcher.js';
import env from '../env.json' with {type: 'json'}

const root = process.cwd();
const mimeTypes = {
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.html': 'text/html',
    '.css': 'text/css',
};

const coreFiles = [
    'main.js',
    'vdom.js',
    'vdom.hooks.js',
    'hmr.store.js'
];

const { broadcast } = createWSServer(env.server);
let prev, prevRepeat = 1;

watch(root, (filePath) => {
    const relativePath = '/' + path.relative(root, filePath).replace(/\\/g, '/');

    if (coreFiles.includes(path.basename(filePath))) return;

    if (relativePath === prev) {
        prevRepeat++;
    } else {
        prevRepeat = 1;
        prev = relativePath;
    }

    const time = new Date().toLocaleTimeString();
    const emoji = prevRepeat > 1 ? '🔁' : '🔄';

    console.log(
        `%c[HMR]%c ${emoji} ${relativePath}%c${prevRepeat > 1 ? ` (${prevRepeat}x)` : ''} %cat ${time}`,
        'color: #42b883; font-weight: bold',
        'color: #ffffff',
        'color: #42b883; font-weight: bold',
        'color: #888; font-style: italic'
    );

    broadcast({
        type: 'reload',
        path: relativePath,
        timestamp: Date.now()
    });
});

const hasExtension = (url) => /\.[^/]+$/.test(url)

// Frontend server
const server = http.createServer(async (req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);;
    let pathname = decodeURIComponent(parsedUrl.pathname);
    pathname = pathname.replace(/\?.*$/, '');
    if (pathname === '/') pathname = '/index.html';
    if (!hasExtension(pathname)) pathname = '/index.html';
    // console.log(pathname, hasExtension(pathname));
    

    const fullPath = path.join(root, pathname);
    const ext = path.extname(fullPath);
    const basename = path.basename(fullPath);
    const type = mimeTypes[ext] || 'text/plain';

    try {
        let code = await fs.readFile(fullPath, 'utf-8');
        res.setHeader('Content-Type', type);
        res.setHeader('Cache-Control', 'no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');


        if (ext === '.js' && !coreFiles.includes(basename)) {
            code = transformImports(code, fullPath);
            // code = injectHMR(code, pathname);
        }
        // console.log("hi");
        

        res.end(code);
    } catch {
        res.writeHead(404);
        res.end('404: Not Found');
    }
});

function transformImports(code, importerFilePath) {
    const fileDir = path.dirname(importerFilePath);

    const resolveImportPath = (importPath) => {
        if (importPath.startsWith('.') || importPath.startsWith('/')) {
            const abs = path.resolve(fileDir, importPath);
            return '/' + path.relative(root, abs).replace(/\\/g, '/');
        }
        return importPath;
    };

    const importDefault = /import\s+([\w${}]+)\s+from\s+['"]([^'"]+)['"]\s*;?/g;
    const importNamed = /import\s+\{\s*([^}]+?)\s*\}\s+from\s+['"]([^'"]+)['"]\s*;?/g;
    const importNamespace = /import\s+\*\s+as\s+([\w${}]+)\s+from\s+['"]([^'"]+)['"]\s*;?/g;

    code = code.replace(importNamespace, (match, name, fromPath) => {
        const fullPath = resolveImportPath(fromPath);
        return `const ${name} = await window.hmrImport('${fullPath}', '*');`;
    });

    code = code.replace(importNamed, (match, names, fromPath) => {
        const fullPath = resolveImportPath(fromPath);
        const props = names.split(',').map(n => {
            const [orig] = n.trim().split(/\s+as\s+/);
            return `'${orig.trim()}'`;
        }).join(', ');
        return `const { ${names.trim()} } = await window.hmrImport('${fullPath}', [${props}]);`;
    });

    code = code.replace(importDefault, (match, def, fromPath) => {
        const fullPath = resolveImportPath(fromPath);
        return `const ${def} = await window.hmrImport('${fullPath}', 'default');`;
    });

    return code;
}

server.listen(env.frontend, () => {
    console.log('Frontend server running on http://localhost:3000');
});