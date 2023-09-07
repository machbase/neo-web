import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
const TestTarget = '127.0.0.1:5654';
// '192.168.1.137:5654';

export default defineConfig({
    plugins: [react()],
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
