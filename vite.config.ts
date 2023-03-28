import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { join, resolve } from 'path';
import vuetify from 'vite-plugin-vuetify';
import { viteCommonjs } from '@originjs/vite-plugin-commonjs';
import vueSetupExtend from 'vite-plugin-vue-setup-extend';

export default defineConfig(() => {
    return {
        mode: 'development',
        resolve: {
            alias: {
                '@': join(__dirname, './src'),
            },
        },
        server: {
            proxy: {
                '/api': {
                    target: `http://192.168.1.166:5654/web`,
                    changeOrigin: true,
                    secure: false,
                    ws: false,
                },
                '/machbase': {
                    target: `http://192.168.1.166:5654/web`,
                    changeOrigin: true,
                    secure: false,
                    ws: false,
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
        base: './',
        build: {
            target: 'es2020',
        },
    };
});
