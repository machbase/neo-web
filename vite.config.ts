import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import svgr from 'vite-plugin-svgr';
// 192.168.0.104
// 192.168.1.89
const TestTarget = 'localhost:5654';
const TestSecurity = '';

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
                configure: (proxy, options) => {
                    console.log(options);
                    proxy.on('proxyReq', (proxyReq, req, res) => {
                        console.log(`geomap - Proxying request to: ${req.url}`);
                    });
                    proxy.on('proxyRes', (proxyRes, req, res) => {
                        console.log(`geomap - Received response from: ${req.url}`);
                    });
                    proxy.on('error', (err, req, res) => {
                        console.error(`geomap - Proxy error: ${err.message}`);
                    });
                },
            },
            '/web/echarts': {
                target: `http${TestSecurity}://${TestTarget}`,
                changeOrigin: true,
                secure: false,
                ws: false,
                configure: (proxy, options) => {
                    console.log(options);
                    proxy.on('proxyReq', (proxyReq, req, res) => {
                        console.log(`echarts - Proxying request to: ${req.url}`);
                    });
                    proxy.on('proxyRes', (proxyRes, req, res) => {
                        console.log(`echarts - Received response from: ${req.url}`);
                    });
                    proxy.on('error', (err, req, res) => {
                        console.error(`echarts - Proxy error: ${err.message}`);
                    });
                },
            },
            '/web/api': {
                target: `http${TestSecurity}://${TestTarget}`,
                changeOrigin: true,
                secure: false,
                ws: false,
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
            '/web/apps': {
                target: `http${TestSecurity}://${TestTarget}`,
                changeOrigin: true,
                secure: false,
                ws: false,
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
