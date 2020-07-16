
// DataCube private methods

import Utils from '../stuff/utils.js'
import DCEvents from './dc_events.js'

export default class DCCore extends DCEvents {

    // Set TV instance (once). Called by TradingVue itself
    init_tvjs($root) {
        if (!this.tv) {
            this.tv = $root
            this.init_data()
            this.update_ids()
        }
    }

    // Init Data Structure v1.1
    init_data($root) {

        if (!('chart' in this.data)) {
            this.tv.$set(this.data, 'chart', {
                type: 'Candles',
                data: this.data.ohlcv || []
            })
        }

        if (!('onchart' in this.data)) {
            this.tv.$set(this.data, 'onchart', [])
        }

        if (!('offchart' in this.data)) {
            this.tv.$set(this.data, 'offchart', [])
        }

        if (!this.data.chart.settings) {
            this.tv.$set(this.data.chart,'settings', {})
        }

        // Remove ohlcv cuz we have Data v1.1^
        delete this.data.ohlcv

    }

    // Range change callback (called by TradingVue)
    // TODO: improve (reliablity + chunk with limited size)
    async range_changed(range, tf, check=false) {

        if (!this.loader) return
        if (!this.loading) {
            let first = this.data.chart.data[0][0]
            if (range[0] < first) {
                this.loading = true
                await Utils.pause(250) // Load bigger chunks
                range = range.slice()  // copy
                range[0] = Math.floor(range[0])
                range[1] = Math.floor(first)
                let prom = this.loader(range, tf, d => {
                    // Callback way
                    this.chunk_loaded(d)
                })
                if (prom && prom.then) {
                    // Promise way
                    this.chunk_loaded(await prom)
                }
            }
        }
        if (!check) this.last_chunk = [range, tf]
    }

    // A new chunk of data is loaded
    // TODO: bulletproof fetch
    chunk_loaded(data) {

        // Updates only candlestick data, or
        if (Array.isArray(data)) {
            this.merge('chart.data', data)
        } else {
            // Bunch of overlays, including chart.data
            for (var k in data) {
                this.merge(k, data[k])
            }
        }

        this.loading = false
        if (this.last_chunk) {
            this.range_changed(...this.last_chunk, true)
            this.last_chunk = null
        }

    }

    // Update ids for all overlays
    update_ids() {
        this.data.chart.id = `chart.${this.data.chart.type}`
        var count = {}
        for (var ov of this.data.onchart) {
            if (count[ov.type] === undefined) {
                count[ov.type] = 0
            }
            let i = count[ov.type]++
            ov.id = `onchart.${ov.type}${i}`
            if (!ov.name) ov.name = ov.type + ` ${i}`
            if (!ov.settings) ov.settings = {}

        }
        count = {}
        for (var ov of this.data.offchart) {
            if (count[ov.type] === undefined) {
                count[ov.type] = 0
            }
            let i = count[ov.type]++
            ov.id = `offchart.${ov.type}${i}`
            if (!ov.name) ov.name = ov.type + ` ${i}`
            if (!ov.settings) ov.settings = {}
        }
    }

    // Updates all overlays with given values.
    update_overlays(data, t) {
        for (var k in data) {
            if (k === 'price' || k === 'volume' ||
                k === 'candle') {
                continue
            }
            if (!Array.isArray(data[k])) {
                var val = [data[k]]
            } else {
                val = data[k]
            }
            if (!k.includes('.data')) k += '.data'
            this.merge(k, [[t, ...val]])
        }
    }

    // Returns array of objects matching query.
    // Object contains { parent, index, value }
    // TODO: query caching
    get_by_query(query, chuck) {

        let tuple = query.split('.')

        switch (tuple[0]) {
            case 'chart':
                var result = this.chart_as_piv(tuple)
                break
            case 'onchart':
            case 'offchart':
                result = this.query_search(query, tuple)
                break
            default:
                /* Should get('.') return also the chart? */
                /*let ch = this.chart_as_query([
                    'chart',
                    tuple[1]
                ])*/
                let on = this.query_search(query, [
                    'onchart',
                    tuple[0],
                    tuple[1]
                ])
                let off = this.query_search(query, [
                    'offchart',
                    tuple[0],
                    tuple[1]
                ])
                result = [/*ch[0],*/ ...on, ...off]
                break
        }

        return result.filter(x => !x.v.locked || chuck)
    }

    chart_as_piv(tuple) {
        let field = tuple[1]
        if (field) return [{
            p: this.data.chart,
            i: field,
            v: this.data.chart[field]
        }]
        else return [{
            p: this.data,
            i: 'chart',
            v: this.data.chart
        }]
    }

    query_search(query, tuple) {

        let side = tuple[0]
        let path = tuple[1] || ''
        let field = tuple[2]

        let arr = this.data[side].filter(
            x => x.id && x.name && x.settings && (
                 x.id === query ||
                 x.id.includes(path) ||
                 x.name === query ||
                 x.name.includes(path) ||
                 query.includes(x.settings.$uuid)
            ))

        if (field) {
            return arr.map(x => ({
                p: x,
                i: field,
                v: x[field]
            }))
        }

        return arr.map(x => ({
            p: this.data[side],
            i: undefined,
            v: x
        }))
    }

    merge_objects(obj, data, new_obj = {}) {

        // The only way to get Vue to update all stuff
        // reactively is to create a brand new object.
        // TODO: Is there a simpler approach?
        Object.assign(new_obj, obj.v)
        Object.assign(new_obj, data)
        this.tv.$set(obj.p, obj.i, new_obj)

    }

    // Merge overlapping time series
    merge_ts(obj, data) {

        // Assume that both arrays are pre-sorted

        if (!data.length) return obj.v

        let r1 = [obj.v[0][0], obj.v[obj.v.length - 1][0]]
        let r2 = [data[0][0],  data[data.length - 1][0]]

        // Overlap
        let o = [Math.max(r1[0],r2[0]), Math.min(r1[1],r2[1])]

        if (o[1] >= o[0]) {

            let { od, d1, d2 } = this.ts_overlap(obj.v, data, o)

            obj.v.splice(...d1)
            data.splice(...d2)

            // Dst === Overlap === Src
            if (!obj.v.length && !data.length) {
                this.tv.$set(obj.p, obj.i, od)
                return obj.v
            }

            // If src is totally contained in dst
            if (!data.length) { data = obj.v.splice(d1[0]) }

            // If dst is totally contained in src
            if (!obj.v.length) { obj.v = data.splice(d2[0]) }

            this.tv.$set(
                obj.p, obj.i, this.combine(obj.v, od, data)
            )

        } else {

            this.tv.$set(
                obj.p, obj.i, this.combine(obj.v, [], data)
            )

        }

        return obj.v

    }

    // TODO: review performance, move to worker
    ts_overlap(arr1, arr2, range) {

        const t1 = range[0]
        const t2 = range[1]

        let ts = {} // timestamp map

        let a1 = arr1.filter(x => x[0] >= t1 && x[0] <= t2)
        let a2 = arr2.filter(x => x[0] >= t1 && x[0] <= t2)

        // Indices of segments
        let id11 = arr1.indexOf(a1[0])
        let id12 = arr1.indexOf(a1[a1.length - 1])
        let id21 = arr2.indexOf(a2[0])
        let id22 = arr2.indexOf(a2[a2.length - 1])

        for (var i = 0; i < a1.length; i++) {
            ts[a1[i][0]] = a1[i]
        }

        for (var i = 0; i < a2.length; i++) {
            ts[a2[i][0]] = a2[i]
        }

        let ts_sorted = Object.keys(ts).sort()

        return {
            od: ts_sorted.map(x => ts[x]),
            d1: [id11, id12 - id11 + 1],
            d2: [id21, id22 - id21 + 1]
        }

    }

    // Combine parts together:
    // (destination, overlap, source)
    combine(dst, o, src) {

        function last(arr) { return arr[arr.length - 1][0] }

        if (!dst.length) { dst = o; o = [] }
        if (!src.length) { src = o; o = [] }

        // The overlap right in the middle
        if (src[0][0] >= dst[0][0] && last(src) <= last(dst)) {

            return Object.assign(dst, o)

        // The overlap is on the right
        } else if (last(src) > last(dst)) {

            // Psh(...) is faster but can overflow the stack
            if (o.length < 100000 && src.length < 100000) {
                dst.push(...o, ...src)
                return dst
            } else {
                return dst.concat(o, src)
            }

        // The overlap is on the left
        } else if (src[0][0] < dst[0][0]) {

            // Push(...) is faster but can overflow the stack
            if (o.length < 100000 && src.length < 100000) {
                src.push(...o, ...dst)
                return src
            } else {
                return src.concat(o, dst)
            }

        } else {  return []  }

    }

}
