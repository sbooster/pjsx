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


export default abstract class Uint8ArrayWriter {
    protected abstract buffer: Uint8Array<ArrayBuffer>
    protected abstract offset: number
    protected readonly textEncoder = new TextEncoder()

    public writeString(str: string, offset: number) {
        const worstCaseLength = str.length * 3;
        const requiredLength = offset + worstCaseLength;
        if (requiredLength > this.buffer.length) {
            const newBufferSize = Math.pow(2, Math.ceil(Math.log2(requiredLength)));
            const newBuffer = new Uint8Array(newBufferSize);
            newBuffer.set(this.buffer);
            this.buffer = newBuffer;
        }
        const view = this.buffer.subarray(offset);
        const {written} = this.textEncoder.encodeInto(str, view);
        return written;
    }

    public writeUInt8(number: number) {
        const offset = this.offset;
        const end = offset + 1;
        if (end <= this.buffer.length) {
            this.buffer[offset] = number;
            this.offset += 1;
            return this.offset;
        } else {
            const bufferSizeNeeded = Math.ceil(Math.log2(end));
            const newBufferSize = Math.pow(2, bufferSizeNeeded);
            const newBuffer = new Uint8Array(newBufferSize);
            newBuffer.set(this.buffer);
            this.buffer = newBuffer;
            this.buffer[offset] = number;
            this.offset += 1;
            return this.offset;
        }
    }

    public writeUInt16(number: number) {
        const end = this.offset + 2;
        if (end <= this.buffer.length) {
            new DataView(this.buffer.buffer).setUint16(this.offset, number, true);
            this.offset += 2;
            return this.offset;
        } else {
            const bufferSizeNeeded = Math.ceil(Math.log2(end));
            const newBufferSize = Math.pow(2, bufferSizeNeeded);
            const newBuffer = new Uint8Array(newBufferSize);
            newBuffer.set(this.buffer);
            this.buffer = newBuffer;
            new DataView(this.buffer.buffer).setUint16(this.offset, number, true);
            this.offset += 2;
            return this.offset;
        }
    }

    public writeUInt32(number: number) {
        const end = this.offset + 4;
        if (end <= this.buffer.length) {
            new DataView(this.buffer.buffer).setUint32(this.offset, number, true);
            this.offset += 4;
            return this.offset;
        } else {
            const bufferSizeNeeded = Math.ceil(Math.log2(end));
            const newBufferSize = Math.pow(2, bufferSizeNeeded);
            const newBuffer = new Uint8Array(newBufferSize);
            newBuffer.set(this.buffer);
            this.buffer = newBuffer;
            new DataView(this.buffer.buffer).setUint32(this.offset, number, true);
            this.offset += 4;
            return this.offset;
        }
    }

    public writeBigUInt64(number: bigint) {
        const end = this.offset + 8;
        if (end <= this.buffer.length) {
            new DataView(this.buffer.buffer).setBigUint64(this.offset, number, true);
            this.offset += 8;
            return this.offset;
        } else {
            const bufferSizeNeeded = Math.ceil(Math.log2(end));
            const newBufferSize = Math.pow(2, bufferSizeNeeded);
            const newBuffer = new Uint8Array(newBufferSize);
            newBuffer.set(this.buffer);
            this.buffer = newBuffer;
            new DataView(this.buffer.buffer).setBigUint64(this.offset, number, true);
            this.offset += 8;
            return this.offset;
        }
    }

    public writeBigUInt64AtOffset(number: bigint, offset: number) {
        const end = offset + 8;
        if (end <= this.buffer.length) {
            new DataView(this.buffer.buffer).setBigUint64(offset, number, true);
            return offset + 8;
        } else {
            const bufferSizeNeeded = Math.ceil(Math.log2(end));
            const newBufferSize = Math.pow(2, bufferSizeNeeded);
            const newBuffer = new Uint8Array(newBufferSize);
            newBuffer.set(this.buffer);
            this.buffer = newBuffer;
            new DataView(this.buffer.buffer).setBigUint64(offset, number, true);
            return offset + 8;
        }
    }

    public writeInt8(number: number) {
        const end = this.offset + 1;
        if (end <= this.buffer.length) {
            new DataView(this.buffer.buffer).setInt8(this.offset, number);
            this.offset += 1;
            return this.offset;
        } else {
            const bufferSizeNeeded = Math.ceil(Math.log2(end));
            const newBufferSize = Math.pow(2, bufferSizeNeeded);
            const newBuffer = new Uint8Array(newBufferSize);
            newBuffer.set(this.buffer);
            this.buffer = newBuffer;
            new DataView(this.buffer.buffer).setInt8(this.offset, number);
            this.offset += 1;
            return this.offset;
        }
    }

    public writeInt16(number: number) {
        const end = this.offset + 2;
        if (end <= this.buffer.length) {
            new DataView(this.buffer.buffer).setInt16(this.offset, number, true);
            this.offset += 2;
            return this.offset;
        } else {
            const bufferSizeNeeded = Math.ceil(Math.log2(end));
            const newBufferSize = Math.pow(2, bufferSizeNeeded);
            const newBuffer = new Uint8Array(newBufferSize);
            newBuffer.set(this.buffer);
            this.buffer = newBuffer;
            new DataView(this.buffer.buffer).setInt16(this.offset, number, true);
            this.offset += 2;
            return this.offset;
        }
    }

    public writeInt32(number: number) {
        const end = this.offset + 4;
        if (end <= this.buffer.length) {
            new DataView(this.buffer.buffer).setInt32(this.offset, number, true);
            this.offset += 4;
            return this.offset;
        } else {
            const bufferSizeNeeded = Math.ceil(Math.log2(end));
            const newBufferSize = Math.pow(2, bufferSizeNeeded);
            const newBuffer = new Uint8Array(newBufferSize);
            newBuffer.set(this.buffer);
            this.buffer = newBuffer;
            new DataView(this.buffer.buffer).setInt32(this.offset, number, true);
            this.offset += 4;
            return this.offset;
        }
    }

    public writeBigInt64(number: bigint) {
        const end = this.offset + 8;
        if (end <= this.buffer.length) {
            new DataView(this.buffer.buffer).setBigInt64(this.offset, number, true);
            this.offset += 8;
            return this.offset;
        } else {
            const bufferSizeNeeded = Math.ceil(Math.log2(end));
            const newBufferSize = Math.pow(2, bufferSizeNeeded);
            const newBuffer = new Uint8Array(newBufferSize);
            newBuffer.set(this.buffer);
            this.buffer = newBuffer;
            new DataView(this.buffer.buffer).setBigInt64(this.offset, number, true);
            this.offset += 8;
            return this.offset;
        }
    }

    public writeDouble(number: number) {
        const end = this.offset + 8;
        if (end <= this.buffer.length) {
            new DataView(this.buffer.buffer).setFloat64(this.offset, number, true);
            this.offset += 8;
            return this.offset;
        } else {
            const bufferSizeNeeded = Math.ceil(Math.log2(end));
            const newBufferSize = Math.pow(2, bufferSizeNeeded);
            const newBuffer = new Uint8Array(newBufferSize);
            newBuffer.set(this.buffer);
            this.buffer = newBuffer;
            new DataView(this.buffer.buffer).setFloat64(this.offset, number, true);
            this.offset += 8;
            return this.offset;
        }
    }
}