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
                    target: `http://192.168.1.166:5654`,
                    changeOrigin: true,
                    rewrite: (path) => path.replace(/^\/api/, ''),
                    secure: false,
                    ws: true,
                },
                '/ui': {
                    target: `http://192.168.1.166:5654`,
                    changeOrigin: true,
                    rewrite: (path) => path.replace(/^\/ui/, ''),
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

        build: {
            target: 'es2020',
        },
    };
});
