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


export default Object.fromEntries(["null", "undefined", "uint8", "uint16", "uint32", "uint64", "uint128", "uintn",
    "int8", "int16", "int32", "int64", "int128", "intn", "float8", "float16", "float32", "float64", "float128",
    "floatn", "record", "ref8", "ref16", "ref32", "ref64", "ref128", "refn", "utfz", "string8", "string16", "string32",
    "string64", "string128", "stringn", "bin8", "bin16", "bin32", "bin64", "bin128", "binN", "true", "false", "date",
    "date64", "constructor8", "constructor16", "constructor32", "array8", "array16", "array32", "array64", "array128",
    "objectStart", "objectEnd", "setStart", "setEnd", "mapStart", "mapEnd", "onull", "onumber", "ostring", "otrue",
    "ofalse", "regexp", "date", "int8array8", "int8array16", "int8array32", "uint8array8", "uint8array16",
    "uint8array32", "uint8clampedarray8", "uint8clampedarray16", "uint8clampedarray32", "int16array8", "int16array16",
    "int16array32", "uint16array8", "uint16array16", "uint16array32", "int32array8", "int32array16", "int32array32",
    "uint32array8", "uint32array16", "uint32array32", "float32array8", "float32array16", "float32array32",
    "float64array8", "float64array16", "float64array32", "bigint64array8", "bigint64array16", "bigint64array32",
    "biguint64array8", "biguint64array16", "biguint64array32", "bigint8", "bigint16", "bigint32", "bigint64", "bigintN",
    "biguint8", "biguint16", "biguint32", "biguint64", "biguintN", "oref8", "oref16", "oref32"]
    .map((r, a) => [r, a]));