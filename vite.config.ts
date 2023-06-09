import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { join, resolve } from 'path';
import vuetify from 'vite-plugin-vuetify';
import { viteCommonjs } from '@originjs/vite-plugin-commonjs';
import vueSetupExtend from 'vite-plugin-vue-setup-extend';

export default defineConfig(() => {
    return {
        configureWebpack: {
            devtool: 'source-map',
        },
        mode: 'development',
        resolve: {
            alias: {
                '@': join(__dirname, './src'),
            },
        },
        server: {
            proxy: {
                '/web/echarts': {
                    target: `http://127.0.0.1:5654/`,
                    changeOrigin: true,
                    secure: false,
                    ws: false,
                },
                '/web/api': {
                    target: `http://127.0.0.1:5654/`,
                    changeOrigin: true,
                    secure: false,
                    ws: false,
                },
                '/web/machbase': {
                    target: `http://127.0.0.1:5654/`,
                    changeOrigin: true,
                    secure: false,
                    ws: false,
                },
                '/web/tutorials': {
                    target: `http://127.0.0.1:5654/`,
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
        plugins: [vue(), vuetify({ autoImport: true }), viteCommonjs(), vueSetupExtend()],
        define: { 'process.env': {} },
        optimizeDeps: {
            esbuildOptions: {
                target: 'es2020',
            },
        },
        base: '/web/ui/',
        build: {
            chunkSizeWarningLimit: 10000,
            target: 'es2020',
        },
    };
});
