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


import TypeWriter from "@/serializers/sia/writer/TypeWriter";
import {Serializer} from "src/serializers";
import TYPES from "@/serializers/sia/types";
import utfz from "@/serializers/sia/utfz";

const encodedFlagsLookup = [
    '', 'g', 'i', 'gi', 'm', 'gm', 'im', 'gim', 'u', 'gu', 'iu', 'giu', 'mu', 'gmu', 'imu', 'gimu',
    'y', 'gy', 'iy', 'giy', 'my', 'gmy', 'imy', 'gimy', 'uy', 'guy', 'iuy', 'giuy', 'muy', 'gmuy', 'imuy', 'gimuy'
];
const big_64 = 64n;
const bigIndices = new Array(2 ** 8).fill(0).map((_, i) => BigInt(i));
const textDecoder = new TextDecoder('utf-8');

class SiaSerializer extends TypeWriter implements Serializer<any, Uint8Array<ArrayBuffer>> {
    protected buffer: Uint8Array<ArrayBuffer>
    protected keyRefIndex = 0;
    private keyRefMap = new Map<string, number>()
    protected objectRefIndex = 0;
    private objectRefMap = new Map<any, number>()
    protected offset = 0;
    private readonly decoderMap

    private readonly registry = new Map<string | (new (...args: any) => any), (writer: SiaSerializer, item: any, keyRefMap: Map<string, number>, objectRefMap: Map<any, number>) => void>

    public constructor(private readonly size: number = 33554432, private readonly decoderSize: number = 256000) {
        super();
        this.decoderMap = new Array(decoderSize)
        this.buffer = new Uint8Array(this.size)
        this.register<string>('string', (writer, item) => writer.addString(item))
        this.register<undefined>('undefined', (writer) => writer.addUndefined())
        this.register<number>('number', (writer, item) => writer.addNumber(item))
        this.register<boolean>('boolean', (writer, item) => writer.addBoolean(item))
        this.register<bigint>('bigint', (writer, item) => writer.addBigInt(item))
        this.register<object>('object', (writer, item, keyRefMap, objectRefMap) => {
            if (item === null) return writer.addNull()
            const prototype = Object.getPrototypeOf(item);
            if (prototype === null) return writer.addONull();
            const serializer = writer.findSerializer(prototype.constructor)
            if (serializer == null) throw new Error(`Serializer for ${item} not found!`)
            serializer(writer, item, keyRefMap, objectRefMap)
        })
        this.register<any>(Object, (writer, item, keyRefMap, objectRefMap) => {
            const ref = objectRefMap.get(item);
            if (ref === undefined) objectRefMap.set(item, writer.nextObjectRefIndex());
            else return writer.addORef(ref);
            writer.startObject();
            for (const key in item) {
                const ref = keyRefMap.get(key);
                if (ref === undefined) {
                    keyRefMap.set(key, writer.nextKeyRefIndex());
                    writer.addString(key);
                } else {
                    writer.addRef(ref);
                }
                writer.serialize(item[key]);
            }
            writer.endObject();
        })
        this.register<Array<any>>(Array, (writer, item, keyRefMap, objectRefMap) => {
            const ref = objectRefMap.get(item);
            if (ref === undefined) objectRefMap.set(item, writer.nextObjectRefIndex());
            else return writer.addORef(ref);
            writer.startArray(item.length);
            for (const member of item) {
                writer.serialize(member);
            }
        })
        this.register<Set<any>>(Set, (writer, item, keyRefMap, objectRefMap) => {
            const ref = objectRefMap.get(item);
            if (ref === undefined) objectRefMap.set(item, writer.nextObjectRefIndex());
            else return writer.addORef(ref);
            writer.startSet();
            for (const member of item) {
                writer.serialize(member);
            }
            writer.endSet();
        })
        this.register<Map<any, any>>(Map, (writer, item, keyRefMap, objectRefMap) => {
            const ref = objectRefMap.get(item);
            if (ref === undefined) objectRefMap.set(item, writer.nextObjectRefIndex());
            else return writer.addORef(ref);
            writer.startMap();
            for (const [key, value] of item) {
                writer.serialize(key);
                writer.serialize(value);
            }
            writer.endMap();
        })
        this.register<Int8Array>(Int8Array, (writer, item) => writer.addInt8Array(item))
        this.register<Uint8Array>(Uint8Array, (writer, item) => writer.addUint8Array(item))
        this.register<Uint8ClampedArray>(Uint8ClampedArray, (writer, item) => writer.addUint8ClampedArray(item))
        this.register<Int16Array>(Int16Array, (writer, item) => writer.addInt16Array(item))
        this.register<Uint16Array>(Uint16Array, (writer, item) => writer.addUint16Array(item))
        this.register<Int32Array>(Int32Array, (writer, item) => writer.addInt32Array(item))
        this.register<Uint32Array>(Uint32Array, (writer, item) => writer.addUint32Array(item))
        this.register<Float32Array>(Float32Array, (writer, item) => writer.addFloat32Array(item))
        this.register<Float64Array>(Float64Array, (writer, item) => writer.addFloat64Array(item))
        this.register<BigInt64Array>(BigInt64Array, (writer, item) => writer.addBigInt64Array(item))
        this.register<BigUint64Array>(BigUint64Array, (writer, item) => writer.addBigUint64Array(item))
        this.register<ArrayBuffer>(ArrayBuffer, (writer, item) => writer.addArrayBuffer(item))
        this.register<Date>(Date, (writer, item) => writer.addDate(item))
        this.register<RegExp>(RegExp, (writer, item) => writer.addRegExp(item))
        this.register<Number>(Number, (writer, item) => writer.addONumber(item))
        this.register<String>(String, (writer, item) => writer.addOString(item))
        this.register<Boolean>(Boolean, (writer, item) => writer.addOBoolean(item))
    }

    public register<T>(type: string | (new (...args: any) => T), fn: (writer: SiaSerializer, item: T, keyRefMap: Map<string, number>, objectRefMap: Map<any, number>) => void) {
        this.registry.set(type, fn)
    }

    public unregister(type: string | ObjectConstructor) {
        this.registry.delete(type)
    }

    public findSerializer<T>(type: string | (new (...args: any) => T)) {
        return this.registry.get(type)
    }

    public nextObjectRefIndex() {
        return this.objectRefIndex++
    }

    public nextKeyRefIndex() {
        return this.keyRefIndex++
    }

    public serialize(data: any) {
        const type = typeof data;
        this.findSerializer(type)?.(this, data, this.keyRefMap, this.objectRefMap)
        return this.buffer.slice(0, this.offset);
    }

    public deserialize(buffer: Uint8Array<ArrayBuffer>): any {
        this.buffer = buffer;
        return this.readBlock(new DataView(
            buffer.buffer,
            buffer.byteOffset,
            buffer.byteLength
        ));
    }

    private readKey(blockType: number, dv: DataView) {
        switch (blockType) {
            case TYPES.ref8: {
                const ref = this.readUInt8();
                return this.decoderMap[ref];
            }

            case TYPES.ref16: {
                const ref = this.readUInt16();
                return this.decoderMap[ref];
            }

            case TYPES.ref32: {
                const ref = this.readUInt32(dv);
                return this.decoderMap[ref];
            }

            case TYPES.utfz: {
                const length = this.readUInt8();
                const str = utfz.unpack(this.buffer, length, this.offset);
                this.offset += length;
                this.decoderMap[this.nextKeyRefIndex()] = str;
                return str;
            }

            case TYPES.string8: {
                const length = this.readUInt8();
                const str = this.readString(length);
                this.decoderMap[this.nextKeyRefIndex()] = str;
                return str;
            }

            case TYPES.string16: {
                const length = this.readUInt16();
                const str = this.readString(length);
                this.decoderMap[this.nextKeyRefIndex()] = str;
                return str;
            }

            case TYPES.string32: {
                const length = this.readUInt32(dv);
                const str = this.readString(length);
                this.decoderMap[this.nextKeyRefIndex()] = str;
                return str;
            }

            default:
                throw `Key of type ${blockType} is invalid.`;
        }
    }

    private readBlock(dv: DataView): any {
        const blockType = this.buffer[this.offset++]; //this.readUInt8();
        switch (blockType) {
            case TYPES.utfz: {
                const length = this.readUInt8();
                const str = utfz.unpack(this.buffer, length, this.offset);
                this.offset += length;
                return str;
            }

            case TYPES.string8: {
                const len = this.buffer[this.offset++];
                const str = textDecoder.decode(this.buffer.subarray(this.offset, this.offset + len));
                this.offset += len;
                return str;
            }
            case TYPES.string16: {
                // Little-endian 16-bit length
                const len = this.buffer[this.offset] | (this.buffer[this.offset + 1] << 8);
                this.offset += 2;
                const str = textDecoder.decode(this.buffer.subarray(this.offset, this.offset + len));
                this.offset += len;
                return str;
            }
            case TYPES.string32: {
                const len = dv.getUint32(this.offset, true);
                this.offset += 4;
                const str = textDecoder.decode(this.buffer.subarray(this.offset, this.offset + len));
                this.offset += len;
                return str;
            }


            case TYPES.bin8: {
                const length = this.readUInt8();
                const buf = new Uint8Array(length);
                buf.set(this.buffer.subarray(this.offset, this.offset + length));
                this.offset += length;
                return buf;
            }

            case TYPES.bin16: {
                const length = this.readUInt16();
                const buf = new Uint8Array(length);
                buf.set(this.buffer.subarray(this.offset, this.offset + length));
                this.offset += length;
                return buf;
            }

            case TYPES.bin32: {
                const length = this.readUInt32(dv);
                const buf = new Uint8Array(length);
                buf.set(this.buffer.subarray(this.offset, this.offset + length));
                this.offset += length;
                return buf;
            }

            case TYPES.int8: {
                return this.readInt8(dv);
            }

            case TYPES.int16: {
                return this.readInt16(dv);
            }

            case TYPES.int32: {
                return this.readInt32(dv);
            }

            case TYPES.uint8: {
                return this.readUInt8();
            }

            case TYPES.uint16: {
                return this.readUInt16();
            }

            case TYPES.uint32: {
                return this.readUInt32(dv);
            }

            case TYPES.float64: {
                return this.readDouble(dv);
            }

            case TYPES.false:
                return false;

            case TYPES.true:
                return true;

            case TYPES.null:
                return null;

            case TYPES.undefined:
                return undefined;

            case TYPES.objectStart: {
                const obj: any = {};
                this.objectRefMap.set(this.nextObjectRefIndex(), obj);
                let curr = this.buffer[this.offset++];
                while (curr !== TYPES.objectEnd) {
                    obj[this.readKey(curr, dv)] = this.readBlock(dv);
                    curr = this.buffer[this.offset++];
                }
                return obj;
            }

            case TYPES.mapStart: {
                const map: any = new Map();
                this.objectRefMap.set(this.nextObjectRefIndex(), map);
                let curr = this.buffer[this.offset];
                while (curr !== TYPES.mapEnd) {
                    const key = this.readBlock(dv);
                    const value = this.readBlock(dv);
                    map.set(key, value);
                    curr = this.buffer[this.offset];
                }
                this.offset++;
                return map;
            }

            case TYPES.setStart: {
                const set: any = new Set();
                this.objectRefMap.set(this.nextObjectRefIndex(), set);
                let curr = this.buffer[this.offset];
                while (curr !== TYPES.setEnd) {
                    set.add(this.readBlock(dv));
                    curr = this.buffer[this.offset];
                }
                this.offset++;
                return set;
            }
            case TYPES.array8: {
                const length = this.readUInt8();
                const arr: any = new Array(length);
                this.objectRefMap.set(this.nextObjectRefIndex(), arr);
                for (let i = 0; i < length; i++) {
                    arr[i] = this.readBlock(dv);
                }
                return arr;
            }

            case TYPES.array16: {
                const length = this.readUInt16();
                const arr: any = new Array(length);
                this.objectRefMap.set(this.nextObjectRefIndex(), arr);
                for (let i = 0; i < length; i++) {
                    arr[i] = this.readBlock(dv);
                }
                return arr;
            }

            case TYPES.array32: {
                const length = this.readUInt32(dv);
                const arr: any = new Array(length);
                this.objectRefMap.set(this.nextObjectRefIndex(), arr);
                for (let i = 0; i < length; i++) {
                    arr[i] = this.readBlock(dv);
                }
                return arr;
            }
            case TYPES.bigint8: {
                return BigInt(this.readInt8(dv))
            }
            case TYPES.bigint16: {
                return BigInt(this.readInt16(dv))
            }
            case TYPES.bigint32: {
                return BigInt(this.readInt32(dv))
            }
            case TYPES.bigint64: {
                return BigInt(this.readBigInt64(dv))
            }
            case TYPES.bigintN: {
                const chunksCount = this.readUInt8();
                let bigIntValue = 0n;
                for (let i = 0; i < chunksCount; i++) {
                    const bytesRead = dv.getBigUint64(this.offset, true); // Little-endian
                    bigIntValue += bytesRead << (big_64 * bigIndices[i]);
                    this.offset += 8;
                }
                return -bigIntValue;
            }
            case TYPES.biguint8: {
                return BigInt(this.readUInt8())
            }
            case TYPES.biguint16: {
                return BigInt(this.readUInt16())
            }
            case TYPES.biguint32: {
                return BigInt(this.readUInt32(dv))
            }
            case TYPES.biguint64: {
                return this.readBigUInt64(dv)
            }
            case TYPES.biguintN: {
                const chunksCount = this.readUInt8();
                let bigIntValue = 0n;
                for (let i = 0; i < chunksCount; i++) {
                    const bytesRead = dv.getBigUint64(this.offset, true); // Little-endian
                    bigIntValue += bytesRead << (big_64 * bigIndices[i]);
                    this.offset += 8;
                }
                return bigIntValue;
            }

            // For Int8Array (8-bit length marker variant)
            case TYPES.int8array8: {
                const length = this.readUInt8();
                const offset = this.offset;
                this.offset += length;
                const slice = this.buffer.slice(offset, offset + length);
                const newBuffer = slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
                return new Int8Array(newBuffer);
            }

            // For Int8Array (16-bit length marker variant)
            case TYPES.int8array16: {
                const length = this.readUInt16();
                const offset = this.offset;
                this.offset += length;
                const slice = this.buffer.slice(offset, offset + length);
                const newBuffer = slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
                return new Int8Array(newBuffer);
            }

            // For Int8Array (32-bit length marker variant)
            case TYPES.int8array32: {
                const length = this.readUInt32(dv);
                const offset = this.offset;
                this.offset += length;
                const slice = this.buffer.slice(offset, offset + length);
                const newBuffer = slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
                return new Int8Array(newBuffer);
            }

            // For Uint8Array
            case TYPES.uint8array8: {
                const length = this.readUInt8();
                const offset = this.offset;
                this.offset += length;
                const result = new Uint8Array(length);
                const slice = this.buffer.slice(offset, offset + length);
                result.set(Uint8Array.from(slice));
                return result;
            }

            case TYPES.uint8array16: {
                const length = this.readUInt16();
                const offset = this.offset;
                this.offset += length;
                const result = new Uint8Array(length);
                const slice = this.buffer.slice(offset, offset + length);
                result.set(Uint8Array.from(slice));
                return result;
            }

            case TYPES.uint8array32: {
                const length = this.readUInt32(dv);
                const offset = this.offset;
                this.offset += length;
                const result = new Uint8Array(length);
                const slice = this.buffer.slice(offset, offset + length);
                result.set(Uint8Array.from(slice));
                return result;
            }


            // For Uint8ClampedArray
            case TYPES.uint8clampedarray8: {
                const length = this.readUInt8();
                const offset = this.offset;
                this.offset += length;
                const result = new Uint8ClampedArray(length);
                const slice = this.buffer.slice(offset, offset + length);
                result.set(Uint8ClampedArray.from(slice));
                return result;
            }

            case TYPES.uint8clampedarray16: {
                const length = this.readUInt16();
                const offset = this.offset;
                this.offset += length;
                const result = new Uint8ClampedArray(length);
                const slice = this.buffer.slice(offset, offset + length);
                result.set(Uint8ClampedArray.from(slice));
                return result;
            }

            case TYPES.uint8clampedarray32: {
                const length = this.readUInt32(dv);
                const offset = this.offset;
                this.offset += length;
                const result = new Uint8ClampedArray(length);
                const slice = this.buffer.slice(offset, offset + length);
                result.set(Uint8ClampedArray.from(slice));
                return result;
            }


            // For Int16Array (8-bit length marker variant)
            case TYPES.int16array8: {
                const length = this.readUInt8();
                const offset = this.offset;
                this.offset += length * 2;
                // Slice the buffer (returns a Node Buffer)
                const slice = this.buffer.slice(offset, offset + length * 2);
                // Create a new ArrayBuffer that contains exactly the data from the slice.
                const newBuffer = slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
                return new Int16Array(newBuffer);
            }

            // For Int16Array (16-bit length marker variant)
            case TYPES.int16array16: {
                const length = this.readUInt16();
                const offset = this.offset;
                this.offset += length * 2;
                const slice = this.buffer.slice(offset, offset + length * 2);
                const newBuffer = slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
                return new Int16Array(newBuffer);
            }

            // For Int16Array (32-bit length marker variant)
            case TYPES.int16array32: {
                const length = this.readUInt32(dv);
                const offset = this.offset;
                this.offset += length * 2;
                const slice = this.buffer.slice(offset, offset + length * 2);
                const newBuffer = slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
                return new Int16Array(newBuffer);
            }


            // For Uint16Array (8-bit length marker variant)
            case TYPES.uint16array8: {
                const length = this.readUInt8();
                const offset = this.offset;
                this.offset += length * 2;
                const slice = this.buffer.slice(offset, offset + length * 2);
                const newBuffer = slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
                return new Uint16Array(newBuffer);
            }

            // For Uint16Array (16-bit length marker variant)
            case TYPES.uint16array16: {
                const length = this.readUInt16();
                const offset = this.offset;
                this.offset += length * 2;
                const slice = this.buffer.slice(offset, offset + length * 2);
                const newBuffer = slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
                return new Uint16Array(newBuffer);
            }

            // For Uint16Array (32-bit length marker variant)
            case TYPES.uint16array32: {
                const length = this.readUInt32(dv);
                const offset = this.offset;
                this.offset += length * 2;
                const slice = this.buffer.slice(offset, offset + length * 2);
                const newBuffer = slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
                return new Uint16Array(newBuffer);
            }

            // For Int32Array (8-bit length marker variant)
            case TYPES.int32array8: {
                const length = this.readUInt8();
                const offset = this.offset;
                this.offset += length * 4;
                const slice = this.buffer.slice(offset, offset + length * 4);
                const newBuffer = slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
                return new Int32Array(newBuffer);
            }

            // For Int32Array (16-bit length marker variant)
            case TYPES.int32array16: {
                const length = this.readUInt16();
                const offset = this.offset;
                this.offset += length * 4;
                const slice = this.buffer.slice(offset, offset + length * 4);
                const newBuffer = slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
                return new Int32Array(newBuffer);
            }

            // For Int32Array (32-bit length marker variant)
            case TYPES.int32array32: {
                const length = this.readUInt32(dv);
                const offset = this.offset;
                this.offset += length * 4;
                const slice = this.buffer.slice(offset, offset + length * 4);
                const newBuffer = slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
                return new Int32Array(newBuffer);
            }



            // For Uint32Array (8-bit length marker variant)
            case TYPES.uint32array8: {
                const length = this.readUInt8();
                const offset = this.offset;
                this.offset += length * 4;
                const slice = this.buffer.slice(offset, offset + length * 4);
                const newBuffer = slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
                return new Uint32Array(newBuffer);
            }

            // For Uint32Array (16-bit length marker variant)
            case TYPES.uint32array16: {
                const length = this.readUInt16();
                const offset = this.offset;
                this.offset += length * 4;
                const slice = this.buffer.slice(offset, offset + length * 4);
                const newBuffer = slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
                return new Uint32Array(newBuffer);
            }

            // For Uint32Array (32-bit length marker variant)
            case TYPES.uint32array32: {
                const length = this.readUInt32(dv);
                const offset = this.offset;
                this.offset += length * 4;
                const slice = this.buffer.slice(offset, offset + length * 4);
                const newBuffer = slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
                return new Uint32Array(newBuffer);
            }


            // For Float32Array (8-bit length marker variant)
            case TYPES.float32array8: {
                const length = this.readUInt8();
                const offset = this.offset;
                this.offset += length * 4;
                const slice = this.buffer.slice(offset, offset + length * 4);
                const newBuffer = slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
                return new Float32Array(newBuffer);
            }

            // For Float32Array (16-bit length marker variant)
            case TYPES.float32array16: {
                const length = this.readUInt16();
                const offset = this.offset;
                this.offset += length * 4;
                const slice = this.buffer.slice(offset, offset + length * 4);
                const newBuffer = slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
                return new Float32Array(newBuffer);
            }

            // For Float32Array (32-bit length marker variant)
            case TYPES.float32array32: {
                const length = this.readUInt32(dv);
                const offset = this.offset;
                this.offset += length * 4;
                const slice = this.buffer.slice(offset, offset + length * 4);
                const newBuffer = slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
                return new Float32Array(newBuffer);
            }



            // For Float64Array (8-bit length marker variant)
            case TYPES.float64array8: {
                const length = this.readUInt8();
                const offset = this.offset;
                this.offset += length * 8;
                const slice = this.buffer.slice(offset, offset + length * 8);
                const newBuffer = slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
                return new Float64Array(newBuffer);
            }

            // For Float64Array (16-bit length marker variant)
            case TYPES.float64array16: {
                const length = this.readUInt16();
                const offset = this.offset;
                this.offset += length * 8;
                const slice = this.buffer.slice(offset, offset + length * 8);
                const newBuffer = slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
                return new Float64Array(newBuffer);
            }

            // For Float64Array (32-bit length marker variant)
            case TYPES.float64array32: {
                const length = this.readUInt32(dv);
                const offset = this.offset;
                this.offset += length * 8;
                const slice = this.buffer.slice(offset, offset + length * 8);
                const newBuffer = slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
                return new Float64Array(newBuffer);
            }


            // For BigInt64Array (8-bit length marker variant)
            case TYPES.bigint64array8: {
                const length = this.readUInt8();
                const offset = this.offset;
                this.offset += length * 8;
                const slice = this.buffer.slice(offset, offset + length * 8);
                const newBuffer = slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
                return new BigInt64Array(newBuffer);
            }

            // For BigInt64Array (16-bit length marker variant)
            case TYPES.bigint64array16: {
                const length = this.readUInt16();
                const offset = this.offset;
                this.offset += length * 8;
                const slice = this.buffer.slice(offset, offset + length * 8);
                const newBuffer = slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
                return new BigInt64Array(newBuffer);
            }

            // For BigInt64Array (32-bit length marker variant)
            case TYPES.bigint64array32: {
                const length = this.readUInt32(dv);
                const offset = this.offset;
                this.offset += length * 8;
                const slice = this.buffer.slice(offset, offset + length * 8);
                const newBuffer = slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
                return new BigInt64Array(newBuffer);
            }


            // For BigUint64Array (8-bit length marker variant)
            case TYPES.biguint64array8: {
                const length = this.readUInt8();
                const offset = this.offset;
                this.offset += length * 8;
                const slice = this.buffer.slice(offset, offset + length * 8);
                const newBuffer = slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
                return new BigUint64Array(newBuffer);
            }

            // For BigUint64Array (16-bit length marker variant)
            case TYPES.biguint64array16: {
                const length = this.readUInt16();
                const offset = this.offset;
                this.offset += length * 8;
                const slice = this.buffer.slice(offset, offset + length * 8);
                const newBuffer = slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
                return new BigUint64Array(newBuffer);
            }

            // For BigUint64Array (32-bit length marker variant)
            case TYPES.biguint64array32: {
                const length = this.readUInt32(dv);
                const offset = this.offset;
                this.offset += length * 8;
                const slice = this.buffer.slice(offset, offset + length * 8);
                const newBuffer = slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
                return new BigUint64Array(newBuffer);
            }

            case TYPES.date: {
                return new Date(this.readDouble(dv));
            }
            case TYPES.regexp: {
                const encodedFlags = this.readUInt8();
                const source: any = this.readBlock(dv);
                const flags = encodedFlagsLookup[encodedFlags];
                return new RegExp(source, flags);
            }
            case TYPES.oref8: {
                const key = this.readUInt8();
                return this.objectRefMap.get(key);
            }
            case TYPES.oref16: {
                const key = this.readUInt16();
                return this.objectRefMap.get(key);
            }
            case TYPES.oref32: {
                const key = this.readUInt32(dv);
                return this.objectRefMap.get(key);
            }
            case TYPES.onull: {
                return Object.create(null);
            }
            case TYPES.onumber: {
                return Number(this.readBlock(dv));
            }
            case TYPES.ostring: {
                return String(this.readBlock(dv));
            }
            case TYPES.otrue: {
                return Boolean(true);
            }
            case TYPES.ofalse: {
                return Boolean(false);
            }
            default:
                throw `Unsupported type: ${blockType}`;
        }
    }

    private readUInt8() {
        return this.buffer[this.offset++];
    }

    private readUInt16() {
        return this.buffer[this.offset++] + (this.buffer[this.offset++] << 8);
    }

    private readUInt32(dv: DataView) {
        const value = dv.getUint32(this.offset, true);
        this.offset += 4;
        return value;
    }

    private readInt8(dv: DataView) {
        const value = dv.getInt8(this.offset);
        this.offset += 1;
        return value;
    }

    private readInt16(dv: DataView) {
        const value = dv.getInt16(this.offset, true);
        this.offset += 2;
        return value;
    }

    private readInt32(dv: DataView) {
        const value = dv.getInt32(this.offset, true);
        this.offset += 4;
        return value;
    }

    private readBigInt64(dv: DataView) {
        const value = dv.getBigInt64(this.offset, true);
        this.offset += 8;
        return value;
    }

    private readBigUInt64(dv: DataView) {
        const value = dv.getBigUint64(this.offset, true);
        this.offset += 8;
        return value;
    }

    private readDouble(dv: DataView) {
        const value = dv.getFloat64(this.offset, true);
        this.offset += 8;
        return value;
    }

    private readString(length: number) {
        const slice = this.buffer.subarray(this.offset, this.offset + length);
        this.offset += length;
        return textDecoder.decode(slice);
    }
}

export default {
    serialize(obj: any): Uint8Array<ArrayBuffer> {
        return new SiaSerializer().serialize(obj)
    },
    deserialize(obj: Uint8Array<ArrayBuffer>): any {
        return new SiaSerializer().deserialize(obj)
    },
} as Serializer<any, Uint8Array<ArrayBuffer>>