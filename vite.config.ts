import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { join, resolve } from 'path';
import vuetify from 'vite-plugin-vuetify';
import { viteCommonjs } from '@originjs/vite-plugin-commonjs';
import vueSetupExtend from 'vite-plugin-vue-setup-extend';

export default defineConfig({
    mode: 'development',
    resolve: {
        alias: {
            '@': join(__dirname, './src'),
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
});
