import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import basicSsl from '@vitejs/plugin-basic-ssl';
import path from 'path';
// https://vitejs.dev/config/
export default defineConfig({
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
                target: 'http://localhost:5000',
                changeOrigin: true,
            },
            '/socket.io': {
                target: 'http://localhost:5000',
                changeOrigin: true,
                ws: true,
            },
        },
    },
});
