import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import basicSsl from '@vitejs/plugin-basic-ssl';
import path from 'path';
// https://vitejs.dev/config/
export default defineConfig(function (_a) {
    var mode = _a.mode;
    var apiTarget = mode === 'production'
        ? 'https://geolertbackend.onrender.com'
        : (process.env.VITE_API_URL || 'http://localhost:5000');
    return {
        plugins: [react(), basicSsl()],
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
    };
});
