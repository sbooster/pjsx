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


const fromCharCode = String.fromCharCode;

export default {
    pack: (str: string, length: number, buf: Uint8Array<ArrayBuffer>, offset: number) => {
        const start = offset;
        let currHigh = 0;
        for (let i = 0; i < length; i++) {
            const code = str.charCodeAt(i);
            const high = code >> 8;
            if (high !== currHigh) {
                buf[i + offset++] = 0;
                buf[i + offset++] = high;
                currHigh = high;
            }
            const low = code & 0xff;
            buf[i + offset] = low;
            if (low === 0) {
                buf[i + ++offset] = currHigh;
            }
        }
        return length + offset - start;
    },
    unpack: (buf: Uint8Array<ArrayBuffer>, length: number, offset: number) => {
        const end = offset + length;
        let currHigh = 0;
        const codes = [];
        for (let i = offset; i < end; i++) {
            const curr = buf[i];
            if (curr === 0) {
                if (buf[i + 1] === currHigh) {
                    codes.push(buf[i++] + (currHigh << 8));
                } else {
                    currHigh = buf[++i];
                }
            } else {
                codes.push(buf[i] + (currHigh << 8));
            }
        }
        return fromCharCode.apply(null, codes);
    }
}