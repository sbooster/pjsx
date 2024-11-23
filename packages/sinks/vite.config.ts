import {defineConfig} from 'vite';
import dts from 'vite-plugin-dts';
import {fileURLToPath} from "node:url";
import * as path from "node:path";
import * as fs from "node:fs";

const packageJsonPath = path.resolve(__dirname, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

const name = packageJson.name;
let entry = path.resolve(__dirname, 'src/index.ts');


export default defineConfig({
    build: {
        lib: {
            entry: entry,
            name: name,
            fileName: () => `${name.toLowerCase()}.js`,
            formats: ['es'],
        },
        rollupOptions: {
            input: entry,
            external: ['tslib'],
        },
        sourcemap: true,
    },
    plugins: [dts()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        }
    }
});
