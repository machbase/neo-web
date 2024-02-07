import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import svgr from 'vite-plugin-svgr';
const TestTarget = '127.0.0.1:5654';
// '192.168.1.137:5654';

export default defineConfig({
    plugins: [react(), svgr()],
    resolve: {
        alias: [{ find: '@', replacement: path.resolve(__dirname, 'src') }],
    },
    build: {
        chunkSizeWarningLimit: 10000,
        target: 'es2020',
    },
    base: '/web/ui',
    server: {
        proxy: {
            'https://machbase.com/assets/example/*': {
                target: `http://${TestTarget}`,
                changeOrigin: true,
                secure: false,
            },
            '/web/geomap': {
                target: `http://${TestTarget}`,
                changeOrigin: true,
                secure: false,
                ws: false,
            },
            '/web/echarts': {
                target: `http://${TestTarget}`,
                changeOrigin: true,
                secure: false,
                ws: false,
            },
            '/web/api': {
                target: `http://${TestTarget}`,
                changeOrigin: true,
                secure: false,
                ws: false,
                configure: (proxy, options) => {
                    proxy.on('error', function (err, req, res) {
                        if (req.url === '/web/api/tql' && req.method === 'POST') {
                            res.writeHead(401, {
                                'Content-Type': 'application/json; charset=utf-8',
                            });
                            res.end('{"reason":"token is expired by 6.3134028s","success":false}');
                        }
                    });
                },
            },
            '/web/machbase': {
                target: `http://${TestTarget}`,
                changeOrigin: true,
                secure: false,
                ws: false,
            },
            '/web/tutorials': {
                target: `http://${TestTarget}`,
                changeOrigin: true,
                secure: false,
                ws: false,
            },
            '/web/api/term': {
                target: `ws://${TestTarget}`,
                changeOrigin: true,
                secure: false,
                ws: true,
            },
            '/web/api/console': {
                target: `ws://${TestTarget}`,
                changeOrigin: true,
                secure: false,
                ws: true,
            },
        },
    },
});
