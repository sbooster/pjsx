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


import Rc4 from "@/serializers/rc4";
import Stringify from "@/serializers/stringify";
import Json from "@/serializers/json";

type CacheEntry<V> = {
    value: V
    expire: number
}

export type StorageType = 'memory' | 'local' | 'session'
export type RemoveReason = 'manual' | 'expire' | 'eviction'
export type OverflowPolicy = 'overwrite' | 'ignore' | 'error'

export interface CacheOptions<K, V> {
    name?: string
    encode: boolean
    storage: StorageType
    maxSize: number,
    overflowPolicy: OverflowPolicy
    expireAfterAccess: number,
    expireAfterWrite: number,
    onRemove?: (key: K, value: V, reason: RemoveReason) => void
}

export class CacheBuilder<K, V> {
    private _name?: string
    private _encode = false
    private _storage: StorageType = 'memory'
    private _maxSize = -1
    private _overflowPolicy: OverflowPolicy = 'overwrite'
    private _expireAfterAccess = -1
    private _expireAfterWrite = -1
    private _onRemove?: (key: K, value: V, reason: RemoveReason) => void


    public name(value: string) {
        this._name = value;
        return this
    }

    public encode(value: boolean) {
        this._encode = value;
        return this
    }

    public storage(value: StorageType) {
        this._storage = value;
        return this
    }

    public maxSize(value: number) {
        this._maxSize = value;
        return this
    }

    public overflowPolicy(value: OverflowPolicy) {
        this._overflowPolicy = value;
        return this
    }

    public expireAfterAccess(value: number) {
        this._expireAfterAccess = value;
        return this
    }

    public expireAfterWrite(value: number) {
        this._expireAfterWrite = value;
        return this
    }

    public onRemove(value: (key: K, value: V, reason: RemoveReason) => void) {
        this._onRemove = value;
        return this
    }

    private buildOptions() {
        return {
            name: this._name,
            encode: this._encode,
            storage: this._storage,
            maxSize: this._maxSize,
            overflowPolicy: this._overflowPolicy,
            expireAfterAccess: this._expireAfterAccess,
            expireAfterWrite: this._expireAfterWrite,
            onRemove: this._onRemove
        }
    }

    public build() {
        return new Cache<K, V>(this.buildOptions())
    }
}

class Cache<K, V> {
    private readonly cache = new Map<K, CacheEntry<V>>()

    public constructor(protected readonly options: CacheOptions<K, V>) {
        this.initialize()
    }

    private initialize() {
        const storageType = this.options.storage;
        if (storageType == 'memory' || window == null) return
        const name = this.options.name;
        if (name == null) throw new Error('Stores other than memory require an explicit name')
        window.addEventListener('beforeunload', this.save)
        const storage = window[`${storageType}Storage`]
        const encode = this.options.encode;
        const stored = storage.getItem(encode ? Rc4.serialize(name, name) : name)
        if (stored == null) return
        const decoded: Map<K, CacheEntry<V>> = encode ? Stringify.deserialize(stored) : Json.deserialize(stored)
        decoded.forEach((value, key) => {
            if (value.expire == -1 || value.expire > Date.now()) {
                this.cache.set(key, value)
            }
        })
    }

    public save() {
        const name = this.options.name;
        const storageType = this.options.storage;
        if (storageType == 'memory' || window == null || name == null) return
        const storage = window[`${storageType}Storage`]
        const encode = this.options.encode;
        storage.setItem(encode ? Rc4.serialize(name, name) : name,
            encode ? Stringify.serialize(this.cache) : Json.serialize(this.cache))
    }

    public get(key: K, factory: (key: K) => V) {
        return this.getIfPresent(key) || this.put(key, factory(key))
    }

    public getIfPresent(key: K) {
        let stored = this.cache.get(key)
        if (stored != null && stored.expire > -1 && stored.expire >= Date.now()) {
            if (this.options.expireAfterAccess > -1) stored.expire = Date.now() + this.options.expireAfterAccess
            return stored.value
        }
        this.invalidate(key, 'expire')
        return null
    }

    public put(key: K, value: V) {
        if (this.options.maxSize > -1 && this.cache.size >= this.options.maxSize) {
            const overflowPolicy = this.options.overflowPolicy;
            if (overflowPolicy == "ignore") return value
            if (overflowPolicy == "error") throw new Error("Cache overflowed!")
            if (overflowPolicy == "overwrite") this.invalidate(this.cache.keys().next().value, 'eviction')
        }
        this.cache.set(key, {
            value: value,
            expire: this.options.expireAfterWrite > -1 ? Date.now() + this.options.expireAfterWrite : -1
        } as CacheEntry<V>)
        return value
    }

    public invalidate(key?: K, reason: RemoveReason = "manual") {
        if (key == null || !this.cache.has(key)) return
        const value = this.cache.get(key)
        this.cache.delete(key)
        if (value == null) return;
        this.options.onRemove?.(key, value.value, reason)
    }

    public invalidateAll() {
        const keys = this.cache.keys();
        let next = keys.next()
        while (!next.done) {
            this.invalidate(next.value)
            next = keys.next()
        }
    }
}

export default {
    builder: <K, V>() => new CacheBuilder<K, V>()
}