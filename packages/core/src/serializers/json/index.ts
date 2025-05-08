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


import {Serializer} from "@/serializers";

export default {
    serialize(obj: any): string {
        return JSON.stringify(obj, (_key, value) => {
            if (value == null) return value
            switch (Object.getPrototypeOf(value)?.constructor) {
                case Map:
                    return {
                        "__type__": "Map",
                        "value": Array.from(value.entries())
                    }
                case Set:
                    return {
                        "__type__": "Set",
                        "value": Array.from(value)
                    }
                default:
                    return value
            }
        })
    },
    deserialize<C>(obj: string): C {
        return JSON.parse(obj, (_key, value) => {
            switch (value?.__type__) {
                case "Map":
                    return new Map(value.value)
                case "Set":
                    return new Set(value.value)
                default:
                    return value
            }
        })
    },
} as Serializer<any, string>