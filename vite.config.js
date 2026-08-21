var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import basicSsl from '@vitejs/plugin-basic-ssl';
import path from 'path';
export default defineConfig(function (_a) {
    var mode = _a.mode;
    var apiTarget = mode === 'production'
        ? 'https://geolertbackend.onrender.com'
        : (process.env.VITE_API_URL || 'http://localhost:5000');
    return {
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
