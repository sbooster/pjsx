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


import {Serializer} from "src/serializers";

export default new class Rc4 implements Serializer<string, string> {
    public serialize(data: string, secret: string = 'rc4'): string {
        let i
        const s = [];
        let j = 0;
        let x;
        let res = ''
        for (i = 0; i < 256; i++) {
            s[i] = i
        }
        for (i = 0; i < 256; i++) {
            j = (j + s[i] + secret.charCodeAt(i % secret.length)) % 256
            x = s[i]
            s[i] = s[j]
            s[j] = x
        }
        i = 0
        j = 0
        for (let y = 0; y < data.length; y++) {
            i = (i + 1) % 256
            j = (j + s[i]) % 256
            x = s[i]
            s[i] = s[j]
            s[j] = x
            res += String.fromCharCode(data.charCodeAt(y) ^ s[(s[i] + s[j]) % 256])
        }
        return res
    }
    public deserialize<C extends string>(data: string, secret = 'rc4'): C {
        return this.serialize(data, secret) as C
    }
}()