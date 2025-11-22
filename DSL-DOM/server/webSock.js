// ws-server.js
"use strict";
import http from 'http';
import crypto from 'crypto';

const clients = new Set();

export function createWSServer(port = 3001) {
    const server = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('WebSocket server is running');
    });

    server.on('upgrade', (req, socket) => {
        if (req.headers['upgrade'] !== 'websocket') {
            socket.destroy();
            return;
        }

        const acceptKey = req.headers['sec-websocket-key'];
        const acceptHash = crypto
            .createHash('sha1')
            .update(acceptKey + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
            .digest('base64');

        socket.write([
            'HTTP/1.1 101 Switching Protocols',
            'Upgrade: websocket',
            'Connection: Upgrade',
            `Sec-WebSocket-Accept: ${acceptHash}`,
            '\r\n',
        ].join('\r\n'));

        clients.add(socket);
        socket.on('close', () => clients.delete(socket));
        socket.on('error', () => clients.delete(socket));
    });

    function broadcast(msg) {
        const encoded = encodeFrame(msg);
        for (const client of clients) {
            client.write(encoded);
        }
    }

    function encodeFrame(data) {
        const json = Buffer.from(JSON.stringify(data));
        const len = json.length;
        const head = len < 126
            ? Buffer.from([0x81, len])
            : Buffer.from([0x81, 126, len >> 8, len & 255]);

        return Buffer.concat([head, json]);
    }

    server.listen(port, () => {
        console.log(`WebSocket server running on ws://localhost:${port}`);
    });

    return { broadcast };
}