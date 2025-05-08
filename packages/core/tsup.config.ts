/*
 *  Copyright (C) 2025 CKATEPTb
 *
 * This file is part of pjsx-boilerplate.
 *
 * pjsx-boilerplate is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * pjsx-boilerplate is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */
import {defineConfig} from 'tsup';
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],      // сборка в ESM и CommonJS
    dts: true,                   // генерация .d.ts
    clean: true,                 // чистить dist перед сборкой
    minify: false,               // можно включить если надо
    sourcemap: true,             // удобно для отладки
    esbuildOptions(options) {
        options.alias = {
            '@': path.resolve(__dirname, 'src'),
        };
    },
});

