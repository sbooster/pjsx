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


import TYPES from "@/serializers/sia/types";
import Uint8ArrayWriter from "@/serializers/sia/writer/Uint8ArrayWriter";
import utfz from "@/serializers/sia/utfz";

const big_zero = BigInt(0);
const big_one = BigInt(1);
const big_8 = BigInt(8);
const big2p8m1 = BigInt(2 ** 8 - 1);
const big_16 = BigInt(16);
const big_2p16m1 = BigInt(2 ** 16 - 1);
const big_32 = BigInt(32);
const big_2p32m1 = BigInt(2 ** 32 - 1);

const big_64 = BigInt(64);
const big_0x100 = BigInt(0x100);
const big_0x10000 = BigInt(0x10000);
const big_0x100000000 = BigInt(0x100000000);
const big_m0x80 = BigInt(-0x80);
const big_m0x8000 = BigInt(-0x8000);
const big_m0x80000000 = BigInt(-0x80000000);
const big_max_safe_int = 18446744073709551615n;
const big_min_safe_int = BigInt(Number.MIN_SAFE_INTEGER);

export default abstract class TypeWriter extends Uint8ArrayWriter {
    public addOString(string: String) {
        this.writeUInt8(TYPES.ostring);
        this.addString(string.toString())
    }

    public addString(string: string) {
        const strLen = string.length;

        if (strLen < 60) {
            this.writeUInt8(TYPES.utfz);
            const lenIndex = this.offset;
            this.offset++;

            const byteLength = utfz.pack(string, strLen, this.buffer, this.offset);

            this.buffer[lenIndex] = byteLength;
            this.offset += byteLength;
            return;
        }

        const maxBytes = strLen * 3;
        const startOffset = this.offset;

        if (maxBytes < 0x100) {
            this.buffer[this.offset++] = TYPES.string8;
            const lenIndex = this.offset;
            this.offset++;
            const byteLength = this.writeString(string, this.offset);
            this.buffer[lenIndex] = byteLength;
            this.offset += byteLength;
        } else if (maxBytes < 0x10000) {
            this.buffer[this.offset++] = TYPES.string16;
            const lenIndex = this.offset;
            this.offset += 2;
            const byteLength = this.writeString(string, this.offset);
            this.buffer[lenIndex] = byteLength & 0xff;
            this.buffer[lenIndex + 1] = (byteLength >> 8) & 0xff;
            this.offset += byteLength;
        } else {
            this.buffer[this.offset++] = TYPES.string32;
            const lenIndex = this.offset;
            this.offset += 4;
            const byteLength = this.writeString(string, this.offset);
            this.buffer[lenIndex] = byteLength & 0xff;
            this.buffer[lenIndex + 1] = (byteLength >> 8) & 0xff;
            this.buffer[lenIndex + 2] = (byteLength >> 16) & 0xff;
            this.buffer[lenIndex + 3] = (byteLength >>> 24) & 0xff;
            this.offset += byteLength;
        }
    }


    public ensureCapacity(requiredLength: number) {
        if (this.buffer.length < requiredLength) {
            const newSize = Math.pow(2, Math.ceil(Math.log2(requiredLength)));
            const newBuffer = new Uint8Array(newSize);
            newBuffer.set(this.buffer);
            this.buffer = newBuffer;
        }
    }

    public addRef(ref: number) {
        if (ref < 0x100) {
            this.writeUInt8(TYPES.ref8);
            this.writeUInt8(ref);
        } else if (ref < 0x10000) {
            this.writeUInt8(TYPES.ref16);
            this.writeUInt16(ref);
        } else if (ref < 0x100000000) {
            this.writeUInt8(TYPES.ref32);
            this.writeUInt32(ref);
        } else {
            throw `Ref size ${ref} is too big`;
        }
    }

    public addORef(ref: number) {
        if (ref < 0x100) {
            this.writeUInt8(TYPES.oref8);
            this.writeUInt8(ref);
        } else if (ref < 0x10000) {
            this.writeUInt8(TYPES.oref16);
            this.writeUInt16(ref);
        } else if (ref < 0x100000000) {
            this.writeUInt8(TYPES.oref32);
            this.writeUInt32(ref);
        } else {
            throw `Object Ref size ${ref} is too big`;
        }
    }

    public addNumber(number: number) {
        if (Number.isInteger(number)) return this.addInteger(number);
        return this.addFloat(number);
    }

    public addBigInt(number: bigint) {
        const dv = new DataView(this.buffer.buffer, this.buffer.byteOffset, this.buffer.length);

        if (number < big_zero) {
            if (number >= big_m0x80) {
                this.writeUInt8(TYPES.bigint8);
                this.writeInt8(Number(number));
                return;
            } else if (number >= big_m0x8000) {
                this.writeUInt8(TYPES.bigint16);
                this.writeInt16(Number(number));
                return;
            } else if (number >= big_m0x80000000) {
                this.writeUInt8(TYPES.bigint32);
                this.writeInt32(Number(number));
                return;
            } else if (number >= big_min_safe_int) {
                this.writeUInt8(TYPES.bigint64);
                this.writeBigInt64(number);
                return;
            } else {
                this.writeUInt8(TYPES.bigintN);
                number = -number;
            }
        } else {
            if (number < big_0x100) {
                this.writeUInt8(TYPES.biguint8);
                this.writeUInt8(Number(number));
                return;
            } else if (number < big_0x10000) {
                this.writeUInt8(TYPES.biguint16);
                this.writeUInt16(Number(number));
                return;
            } else if (number < big_0x100000000) {
                this.writeUInt8(TYPES.biguint32);
                this.writeUInt32(Number(number));
                return;
            } else if (number <= big_max_safe_int) {
                this.writeUInt8(TYPES.biguint64);
                this.writeBigUInt64(number);
                return;
            } else {
                this.writeUInt8(TYPES.biguintN);
            }
        }

        let length = 0;
        const startOffset = this.offset + 1;

        while (number > big_zero) {
            const chunk = BigInt.asUintN(64, number);
            this.writeBigUInt64AtOffset(chunk, startOffset + 8 * length);
            number = number >> big_64;
            length++;
        }

        dv.setUint8(this.offset, length);
        this.offset = startOffset + 8 * length;
    }

    public addInteger(number: number) {
        if (number < 0) {
            if (number >= -0x80) {
                this.writeUInt8(TYPES.int8);
                this.writeInt8(number);
            } else if (number >= -0x8000) {
                this.writeUInt8(TYPES.int16);
                this.writeInt16(number);
            } else if (number >= -0x80000000) {
                this.writeUInt8(TYPES.int32);
                this.writeInt32(number);
            } else {
                this.addFloat(number);
            }
        } else {
            if (number < 0x100) {
                this.writeUInt8(TYPES.uint8);
                this.writeUInt8(number);
            } else if (number < 0x10000) {
                this.writeUInt8(TYPES.uint16);
                this.writeUInt16(number);
            } else if (number < 0x100000000) {
                this.writeUInt8(TYPES.uint32);
                this.writeUInt32(number);
            } else {
                this.addFloat(number);
            }
        }
    }

    public addFloat(number: number) {
        this.writeUInt8(TYPES.float64);
        this.writeDouble(number);
    }

    public addONumber(number: Number) {
        this.writeUInt8(TYPES.onumber);
        this.addNumber(+number);
    }

    public addRegExp(regexp: RegExp) {
        this.writeUInt8(TYPES.regexp);
        const encodedFlags = (regexp.global as unknown as number << 0) |
            (regexp.ignoreCase as unknown as number << 1) |
            (regexp.multiline as unknown as number << 2) |
            (regexp.unicode as unknown as number << 3) |
            (regexp.sticky as unknown as number << 4);
        this.writeInt8(encodedFlags);
        this.addString(regexp.source);
    }

    public addDate(date: Date) {
        this.writeUInt8(TYPES.date);
        this.writeDouble(date.getTime());
    }

    public startArray(length: number) {
        if (length < 0x100) {
            this.writeUInt8(TYPES.array8);
            this.writeUInt8(length);
        } else if (length < 0x10000) {
            this.writeUInt8(TYPES.array16);
            this.writeUInt16(length);
        } else if (length < 0x100000000) {
            this.writeUInt8(TYPES.array32);
            this.writeUInt32(length);
        } else {
            throw `Array of size ${length} is too big to serialize`;
        }
    }

    public startObject() {
        this.writeUInt8(TYPES.objectStart);
    }

    public endObject() {
        this.writeUInt8(TYPES.objectEnd);
    }

    public startMap() {
        this.writeUInt8(TYPES.mapStart);
    }

    public endMap() {
        this.writeUInt8(TYPES.mapEnd);
    }

    public startSet() {
        this.writeUInt8(TYPES.setStart);
    }

    public endSet() {
        this.writeUInt8(TYPES.setEnd);
    }

    public addBoolean(bool: boolean) {
        const type = bool ? TYPES.true : TYPES.false;
        this.writeUInt8(type);
    }

    public addOBoolean(bool: Boolean) {
        const type = bool ? TYPES.otrue : TYPES.ofalse;
        this.writeUInt8(type);
    }

    public addNull() {
        this.writeUInt8(TYPES.null);
    }

    public addONull() {
        this.writeUInt8(TYPES.onull);
    }

    public addUndefined() {
        this.writeUInt8(TYPES.undefined);
    }

    public addArrayBuffer(item: ArrayBuffer) {
        const {byteLength} = item;
        if (byteLength < 0x100) {
            this.writeUInt8(TYPES.bin8);
            this.writeUInt8(byteLength);
            new Uint8Array(item).forEach((byte) => {
                this.writeUInt8(byte);
            });
        } else if (byteLength < 0x10000) {
            this.writeUInt8(TYPES.bin16);
            this.writeUInt16(byteLength);
            new Uint8Array(item).forEach((byte) => {
                this.writeUInt8(byte);
            });
        } else if (byteLength < 0x100000000) {
            this.writeUInt8(TYPES.bin32);
            this.writeUInt32(byteLength);
            new Uint8Array(item).forEach((byte) => {
                this.writeUInt8(byte);
            });
        } else {
            throw `ArrayBuffer of size ${byteLength} is too big to serialize`;
        }
    }

    public copyTypedArrayToBuffer(item: { buffer: ArrayBufferLike, byteOffset: number, byteLength: number }) {
        const byteView = new Uint8Array(item.buffer, item.byteOffset, item.byteLength);
        this.buffer.set(byteView, this.offset);
        this.offset += item.byteLength;
    }

    public addInt8Array(item: Int8Array) {
        const {length} = item;
        if (length < 0x100) {
            this.writeUInt8(TYPES.int8array8);
            this.writeUInt8(length);
        } else if (length < 0x10000) {
            this.writeUInt8(TYPES.int8array16);
            this.writeUInt16(length);
        } else if (length < 0x100000000) {
            this.writeUInt8(TYPES.int8array32);
            this.writeUInt32(length);
        } else {
            throw new Error(`Buffer of size ${length} is too big to serialize`);
        }
        this.copyTypedArrayToBuffer(item);
    }

    public addUint8Array(item: Uint8Array) {
        const {length} = item;
        if (item.length < 0x100) {
            this.writeUInt8(TYPES.uint8array8);
            this.writeUInt8(length);
        } else if (item.length < 0x10000) {
            this.writeUInt8(TYPES.uint8array16);
            this.writeUInt16(length);
        } else if (item.length < 0x100000000) {
            this.writeUInt8(TYPES.uint8array32);
            this.writeUInt32(length);
        } else {
            throw `Buffer of size ${length} is too big to serialize`;
        }
        this.copyTypedArrayToBuffer(item);
    }

    public addUint8ClampedArray(item: Uint8ClampedArray) {
        const {length} = item;
        if (item.length < 0x100) {
            this.writeUInt8(TYPES.uint8clampedarray8);
            this.writeUInt8(length);
        } else if (item.length < 0x10000) {
            this.writeUInt8(TYPES.uint8clampedarray16);
            this.writeUInt16(length);
        } else if (item.length < 0x100000000) {
            this.writeUInt8(TYPES.uint8clampedarray32);
            this.writeUInt32(length);
        } else {
            throw `Buffer of size ${length} is too big to serialize`;
        }
        this.copyTypedArrayToBuffer(item);
    }

    public addInt16Array(item: Int16Array) {
        const {length} = item;
        if (item.length < 0x100) {
            this.writeUInt8(TYPES.int16array8);
            this.writeUInt8(length);
        } else if (item.length < 0x10000) {
            this.writeUInt8(TYPES.int16array16);
            this.writeUInt16(length);
        } else if (item.length < 0x100000000) {
            this.writeUInt8(TYPES.int16array32);
            this.writeUInt32(length);
        } else {
            throw `Buffer of size ${length} is too big to serialize`;
        }
        this.copyTypedArrayToBuffer(item);
    }

    public addUint16Array(item: Uint16Array) {
        const {length} = item;
        if (item.length < 0x100) {
            this.writeUInt8(TYPES.uint16array8);
            this.writeUInt8(length);
        } else if (item.length < 0x10000) {
            this.writeUInt8(TYPES.uint16array16);
            this.writeUInt16(length);
        } else if (item.length < 0x100000000) {
            this.writeUInt8(TYPES.uint16array32);
            this.writeUInt32(length);
        } else {
            throw `Buffer of size ${length} is too big to serialize`;
        }
        this.copyTypedArrayToBuffer(item);
    }

    public addInt32Array(item: Int32Array) {
        const {length} = item;
        if (item.length < 0x100) {
            this.writeUInt8(TYPES.int32array8);
            this.writeUInt8(length);
        } else if (item.length < 0x10000) {
            this.writeUInt8(TYPES.int32array16);
            this.writeUInt16(length);
        } else if (item.length < 0x100000000) {
            this.writeUInt8(TYPES.int32array32);
            this.writeUInt32(length);
        } else {
            throw `Buffer of size ${length} is too big to serialize`;
        }
        this.copyTypedArrayToBuffer(item);
    }

    public addUint32Array(item: Uint32Array) {
        const {length} = item;
        if (item.length < 0x100) {
            this.writeUInt8(TYPES.uint32array8);
            this.writeUInt8(length);
        } else if (item.length < 0x10000) {
            this.writeUInt8(TYPES.uint32array16);
            this.writeUInt16(length);
        } else if (item.length < 0x100000000) {
            this.writeUInt8(TYPES.uint32array32);
            this.writeUInt32(length);
        } else {
            throw `Buffer of size ${length} is too big to serialize`;
        }
        this.copyTypedArrayToBuffer(item);
    }

    public addFloat32Array(item: Float32Array) {
        const {length} = item;
        if (item.length < 0x100) {
            this.writeUInt8(TYPES.float32array8);
            this.writeUInt8(length);
        } else if (item.length < 0x10000) {
            this.writeUInt8(TYPES.float32array16);
            this.writeUInt16(length);
        } else if (item.length < 0x100000000) {
            this.writeUInt8(TYPES.float32array32);
            this.writeUInt32(length);
        } else {
            throw `Buffer of size ${length} is too big to serialize`;
        }
        this.copyTypedArrayToBuffer(item);
    }

    public addFloat64Array(item: Float64Array) {
        const {length} = item;
        if (item.length < 0x100) {
            this.writeUInt8(TYPES.float64array8);
            this.writeUInt8(length);
        } else if (item.length < 0x10000) {
            this.writeUInt8(TYPES.float64array16);
            this.writeUInt16(length);
        } else if (item.length < 0x100000000) {
            this.writeUInt8(TYPES.float64array32);
            this.writeUInt32(length);
        } else {
            throw `Buffer of size ${length} is too big to serialize`;
        }
        this.copyTypedArrayToBuffer(item);
    }

    public addBigInt64Array(item: BigInt64Array) {
        const {length} = item;
        if (item.length < 0x100) {
            this.writeUInt8(TYPES.bigint64array8);
            this.writeUInt8(length);
        } else if (item.length < 0x10000) {
            this.writeUInt8(TYPES.bigint64array16);
            this.writeUInt16(length);
        } else if (item.length < 0x100000000) {
            this.writeUInt8(TYPES.bigint64array32);
            this.writeUInt32(length);
        } else {
            throw `Buffer of size ${length} is too big to serialize`;
        }
        this.copyTypedArrayToBuffer(item);
    }

    public addBigUint64Array(item: BigUint64Array) {
        const {length} = item;
        if (item.length < 0x100) {
            this.writeUInt8(TYPES.biguint64array8);
            this.writeUInt8(length);
        } else if (item.length < 0x10000) {
            this.writeUInt8(TYPES.biguint64array16);
            this.writeUInt16(length);
        } else if (item.length < 0x100000000) {
            this.writeUInt8(TYPES.biguint64array32);
            this.writeUInt32(length);
        } else {
            throw `Buffer of size ${length} is too big to serialize`;
        }
        this.copyTypedArrayToBuffer(item);
    }
}