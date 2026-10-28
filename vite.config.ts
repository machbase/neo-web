import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import svgr from 'vite-plugin-svgr';
import fs from 'fs';
import type { Plugin } from 'vite';
import { THEME_TOKENS_FILE, parseThemeTokens } from './src/design-system/theme/themeTokens';
// 192.168.0.104
// 192.168.1.89
const TestTarget = '127.0.0.1';
const TestPort = '5654';
const TestSecurity = '';

/** `/web/ui/theme-tokens.json`: every theme variable and its dark default, from the token sources (theme builder). */
const themeTokens = (): Plugin => {
    const sSources = ['src/design-system/tokens/_colors.scss', 'src/design-system/tokens/_shadows.scss'].map((f) => path.resolve(__dirname, f));
    const sJson = () => JSON.stringify(parseThemeTokens(sSources.map((f) => fs.readFileSync(f, 'utf8'))), null, 1);
    return {
        name: 'neo-theme-tokens',
        configureServer(server) {
            server.middlewares.use(`/web/ui/${THEME_TOKENS_FILE}`, (_req, res) => {
                res.setHeader('Content-Type', 'application/json');
                res.end(sJson());
            });
        },
        generateBundle() {
            this.emitFile({ type: 'asset', fileName: THEME_TOKENS_FILE, source: sJson() });
        },
    };
};

export default defineConfig({
    plugins: [
        react(),
        themeTokens(),
        svgr({
            svgrOptions: {
                exportType: 'named',
                namedExport: 'ReactComponent',
            },
            include: '**/*.svg?react',
        }),
    ],
    resolve: {
        alias: [{ find: '@', replacement: path.resolve(__dirname, 'src') }],
    },
    build: {
        chunkSizeWarningLimit: 10000,
        target: 'es2020',
        sourcemap: false,
    },
    base: '/web/ui',
    server: {
        proxy: {
            '/web/services': {
                target: `http${TestSecurity}://${TestTarget}:${TestPort}`,
                changeOrigin: true,
                secure: false,
                ws: true,
            },
            '/public': {
                target: `http${TestSecurity}://${TestTarget}:${TestPort}`,
                changeOrigin: true,
                secure: false,
                ws: false,
            },
            'https://machbase.com/assets/example/*': {
                target: `http${TestSecurity}://${TestTarget}:${TestPort}`,
                changeOrigin: true,
                secure: false,
            },
            '/web/geomap': {
                target: `http${TestSecurity}://${TestTarget}:${TestPort}`,
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
                target: `http${TestSecurity}://${TestTarget}:${TestPort}`,
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
            '/web/api/term': {
                target: `ws${TestSecurity}://${TestTarget}:${TestPort}`,
                changeOrigin: true,
                secure: false,
                ws: true,
            },
            '/web/api': {
                target: `http${TestSecurity}://${TestTarget}:${TestPort}`,
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
            '/web/machbase': {
                target: `http${TestSecurity}://${TestTarget}:${TestPort}`,
                changeOrigin: true,
                secure: false,
                ws: false,
            },
            '/web/tutorials': {
                target: `http${TestSecurity}://${TestTarget}:${TestPort}`,
                changeOrigin: true,
                secure: false,
                ws: false,
            },
            '/web/api/console': {
                target: `ws${TestSecurity}://${TestTarget}:${TestPort}`,
                changeOrigin: true,
                secure: false,
                ws: true,
            },
            '/db/tql': {
                target: `http${TestSecurity}://${TestTarget}:${TestPort}`,
                changeOrigin: true,
                secure: false,
            },
            '/db/query': {
                target: `http${TestSecurity}://${TestTarget}:${TestPort}`,
                changeOrigin: true,
                secure: false,
            },
        },
    },
});
