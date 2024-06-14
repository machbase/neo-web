import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import svgr from 'vite-plugin-svgr';
const TestTarget = '192.168.1.53:5654';
const TestSecurity = '';
// '192.168.1.53:5654'
// '192.168.1.166:5654';
// http://192.168.0.148/
// http://172.30.148.16:5654
// 'eirny.machbase.com'

// NEOW opt
// --jwt-at-expire=1m
// --http-debug=true
// --log-level=TRACE

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
                target: `http${TestSecurity}://${TestTarget}`,
                changeOrigin: true,
                secure: false,
            },
            '/web/geomap': {
                target: `http${TestSecurity}://${TestTarget}`,
                changeOrigin: true,
                secure: false,
                ws: false,
            },
            '/web/echarts': {
                target: `http${TestSecurity}://${TestTarget}`,
                changeOrigin: true,
                secure: false,
                ws: false,
            },
            '/web/api': {
                target: `http${TestSecurity}://${TestTarget}`,
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
                target: `http${TestSecurity}://${TestTarget}`,
                changeOrigin: true,
                secure: false,
                ws: false,
            },
            '/web/tutorials': {
                target: `http${TestSecurity}://${TestTarget}`,
                changeOrigin: true,
                secure: false,
                ws: false,
            },
            '/web/api/term': {
                target: `ws${TestSecurity}://${TestTarget}`,
                changeOrigin: true,
                secure: false,
                ws: true,
            },
            '/web/api/console': {
                target: `ws${TestSecurity}://${TestTarget}`,
                changeOrigin: true,
                secure: false,
                ws: true,
            },
            '/db/tql': {
                target: `http${TestSecurity}://${TestTarget}`,
                changeOrigin: true,
                secure: false,
            },
        },
    },
});
