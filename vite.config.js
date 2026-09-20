var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import basicSsl from '@vitejs/plugin-basic-ssl';
import path from 'path';
export default defineConfig(function (_a) {
    var _b;
    var mode = _a.mode;
    // loadEnv with an empty prefix loads every variable from the .env files
    // (no VITE_ required). We then expose only the whitelist below to the client.
    var env = loadEnv(mode, process.cwd(), '');
    var apiTarget = mode === 'production'
        ? 'https://geolertbackend.onrender.com'
        : (env.API_URL || 'http://localhost:5000');
    var exposedEnv = [
        'API_URL',
        'GOOGLE_CLIENT_ID',
        'FOUNDER_EMAIL',
        'GEMINI_API_KEY',
        'FIREBASE_API_KEY',
        'FIREBASE_AUTH_DOMAIN',
        'FIREBASE_PROJECT_ID',
        'FIREBASE_STORAGE_BUCKET',
        'FIREBASE_MESSAGING_SENDER_ID',
        'FIREBASE_APP_ID',
        'FIREBASE_MEASUREMENT_ID',
    ];
    var define = {};
    for (var _i = 0, exposedEnv_1 = exposedEnv; _i < exposedEnv_1.length; _i++) {
        var key = exposedEnv_1[_i];
        define["import.meta.env.".concat(key)] = JSON.stringify((_b = env[key]) !== null && _b !== void 0 ? _b : '');
    }
    return {
        define: define,
        plugins: __spreadArray([
            react()
        ], (mode === 'production' ? [] : [basicSsl()]), true),
        resolve: {
            alias: {
                "@": path.resolve(__dirname, "./src"),
            },
        },
        server: {
            host: true,
            proxy: {
                '/api': {
                    target: apiTarget,
                    changeOrigin: true,
                },
                '/socket.io': {
                    target: apiTarget,
                    changeOrigin: true,
                    ws: true,
                },
            },
        },
        build: {
            outDir: 'dist',
            sourcemap: false,
        },
    };
});
