import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
const TestTarget = 'http://192.168.1.137:5654';

export default defineConfig({
    plugins: [react()],
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
            '/web/echarts': {
                target: `${TestTarget}`,
                changeOrigin: true,
                secure: false,
                ws: false,
            },
            '/web/api': {
                target: `${TestTarget}`,
                changeOrigin: true,
                secure: false,
                ws: false,
            },
            '/web/machbase': {
                target: `${TestTarget}`,
                changeOrigin: true,
                secure: false,
                ws: false,
            },
            '/web/tutorials': {
                target: `${TestTarget}`,
                changeOrigin: true,
                secure: false,
                ws: false,
            },
            '/web/api/term': {
                target: `ws://127.0.0.1:5654/`,
                changeOrigin: true,
                secure: false,
                ws: true,
            },
        },
    },
});
