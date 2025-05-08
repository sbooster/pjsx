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


import {ReplaySink} from "@/sinks/many/replay";

export class ReplayLatestSink<T> extends ReplaySink<T> {
    public constructor(private readonly limit: number) {
        super()
        if (limit < 1) throw new Error("LatestSink: limit must be > 0")
    }

    protected override store(emit: "next" | "error" | "complete", data?: Error | T) {
        super.store(emit, data)
        if (this.buffer.length > this.limit) this.buffer.shift()
    }
}