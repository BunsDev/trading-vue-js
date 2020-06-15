import Const from '../../stuff/constants.js'
import Utils from '../../stuff/utils.js'
import math from '../../stuff/math.js'

import layout_fn from './layout_fn.js'
import log_scale from './log_scale.js'

const { TIMESCALES, $SCALES, WEEK, MONTH, YEAR } = Const
const MAX_INT = Number.MAX_SAFE_INTEGER


// master_grid - ref to the master grid
function GridMaker(id, params, master_grid = null) {


    let {
        sub, interval, range, ctx, $p, layers_meta, height, y_t, ti_map,
        grid
    } = params

    var self = { ti_map }
    var lm = layers_meta[id]
    var y_range_fn = null
    var ls = grid.logScale

    if (lm && Object.keys(lm).length) {
        // Gets last y_range fn()
        let yrs = Object.values(lm).filter(x => x.y_range)
        if (yrs.length) y_range_fn = yrs[yrs.length - 1].y_range
    }

    // Calc vertical ($/₿) range
    function calc_$range() {
        if (!master_grid) {
            // $ candlestick range
            var hi = Math.max(...sub.map(x => x[2]))
            var lo = Math.min(...sub.map(x => x[3]))

        } else {
            // Offchart indicator range
            const dim = sub[0] ? sub[0].length : 0
            let arr = []
            for (var i = 1; i < dim; i++) {
                arr.push(...sub.map(x => x[i])
                    .filter(x => typeof x !== 'string'))
            }
            hi = Math.max(...arr)
            lo = Math.min(...arr)

            if (y_range_fn) { [hi, lo] = y_range_fn(hi, lo) }
        }

        // Fixed y-range in non-auto mode
        if (y_t && !y_t.auto && y_t.range) {
            self.$_hi = y_t.range[0]
            self.$_lo = y_t.range[1]
        } else {
            if (!ls) {
                self.$_hi = hi + (hi - lo) * $p.config.EXPAND
                self.$_lo = lo - (hi - lo) * $p.config.EXPAND
            } else {
                self.$_hi = hi
                self.$_lo = lo
                log_scale.expand(self, height)
            }

            if (self.$_hi === self.$_lo) {
                if (!ls) {
                    self.$_hi *= 1.05  // Expand if height range === 0
                    self.$_lo *= 0.95
                } else {
                    log_scale.expand(self, height)
                }
            }
        }

    }

    function calc_sidebar() {

        if (sub.length < 2) {
            self.prec = 0
            self.sb = $p.config.SBMIN
            return
        }

        // TODO: improve sidebar width calculation
        // at transition point, when one precision is
        // replaced with another

        // Gets formated levels (their lengths),
        // calculates max and measures the sidebar length
        // from it:

        self.prec = calc_precision(sub)
        let subn = sub.filter(x => typeof x[1] === 'number')
        let lens = subn.map(x => x[1].toFixed(self.prec).length)
        lens.push(self.$_hi.toFixed(self.prec).length)
        lens.push(self.$_lo.toFixed(self.prec).length)
        let str = '0'.repeat(Math.max(...lens)) + '    '
        self.sb = ctx.measureText(str).width
        self.sb = Math.max(Math.floor(self.sb), $p.config.SBMIN)

    }

    // Calculate $ precision for the Y-axis
    function calc_precision(data) {

        var max_r = 0, max_l = 0

        // Get max lengths of integer and fractional parts
        data.forEach(x => {
            var str = x[1].toString()
            if (x[1] < 0.000001) {
                // Parsing the exponential form. Gosh this
                // smells trickily
                var [ls, rs] = str.split('e-')
                var [l, r] = ls.split('.')
                if (!r) r = ''
                r = { length: r.length + parseInt(rs) || 0 }
            } else {
                var [l, r] = str.split('.')
            }
            if (r && r.length > max_r) {
                max_r = r.length
            }
            if (l && l.length > max_l) {
                max_l = l.length
            }
        })

        // Select precision scheme depending
        // on the left and right part lengths
        //
        let even = max_r - max_r % 2 + 2

        if (max_l === 1) {
            return Math.min(8, Math.max(2, even))
        }
        if (max_l <= 2) {
            return Math.min(4, Math.max(2, even))
        }

        return 2

    }

    function calc_positions() {

        if (sub.length < 2) return

        let dt = range[1] - range[0]

        // A pixel space available to draw on (x-axis)
        self.spacex = $p.width - self.sb

        // Candle capacity
        let capacity = dt / interval
        self.px_step = self.spacex / capacity

        // px / time ratio
        let r = self.spacex / dt
        self.startx = (sub[0][0] - range[0]) * r

        // Candle Y-transform: (A = scale, B = shift)
        if (!grid.logScale) {
            self.A = - height / (self.$_hi - self.$_lo)
            self.B = - self.$_hi * self.A
        } else {
            self.A = - height / (math.log(self.$_hi) -
                       math.log(self.$_lo))
            self.B = - math.log(self.$_hi) * self.A
        }

    }

    // Select nearest good-loking t step (m is target scale)
    function time_step() {
        let k = ti_map.ib ? 60000 : 1
        let xrange = (range[1] - range[0]) * k
        let m = xrange * ($p.config.GRIDX / $p.width)
        let s = TIMESCALES
        return Utils.nearest_a(m, s)[1] / k
    }

    // Select nearest good-loking $ step (m is target scale)
    function dollar_step() {
        let yrange = self.$_hi - self.$_lo
        let m = yrange * ($p.config.GRIDY / height)
        let p = parseInt(yrange.toExponential().split('e')[1])
        let d = Math.pow(10, p)
        let s = $SCALES.map(x => x * d)

        // TODO: center the range (look at RSI for example,
        // it looks ugly when "80" is near the top)
        return Utils.strip(Utils.nearest_a(m, s)[1])
    }

    function dollar_mult() {
        let mult_hi = dollar_mult_hi()
        let mult_lo = dollar_mult_lo()
        return Math.max(mult_hi, mult_lo)
    }

    // Price step multiplier (for the log-scale mode)
    function dollar_mult_hi() {

        let h = Math.min(self.B, height)
        if (h < $p.config.GRIDY) return 1
        let n = h / $p.config.GRIDY // target grid N
        let yrange = self.$_hi
        if (self.$_lo > 0) {
            var yratio = self.$_hi / self.$_lo
        } else {
            yratio = self.$_hi / 1 // TODO: small values
        }
        let m = yrange * ($p.config.GRIDY / h)
        let p = parseInt(yrange.toExponential().split('e')[1])
        return Math.pow(yratio, 1/n)
    }

    function dollar_mult_lo() {

        let h = Math.min(height - self.B, height)
        if (h < $p.config.GRIDY) return 1
        let n = h / $p.config.GRIDY // target grid N
        let yrange = Math.abs(self.$_lo)
        if (self.$_hi < 0 && self.$_lo < 0) {
            var yratio = Math.abs(self.$_lo / self.$_hi)
        } else {
            yratio = Math.abs(self.$_lo) / 1
        }
        let m = yrange * ($p.config.GRIDY / h)
        let p = parseInt(yrange.toExponential().split('e')[1])
        return Math.pow(yratio, 1/n)
    }

    function grid_x() {

        // If this is a subgrid, no need to calc a timeline,
        // we just borrow it from the master_grid
        if (!master_grid) {

            self.t_step = time_step()
            self.xs = []
            const dt = range[1] - range[0]
            const r = self.spacex / dt

            /* TODO: remove the left-side glitch

            let year_0 = Utils.get_year(sub[0][0])
            for (var t0 = year_0; t0 < range[0]; t0 += self.t_step) {}

            let m0 = Utils.get_month(t0)*/

            for (var i = 0; i < sub.length; i++) {
                let p = sub[i]
                let prev = sub[i-1] || []
                let prev_xs = self.xs[self.xs.length - 1] || [0,[]]
                let x = Math.floor((p[0] - range[0]) * r)

                insert_line(prev, p, x)

                // Filtering lines that are too near
                let xs = self.xs[self.xs.length - 1] || [0, []]

                if (prev_xs === xs) continue

                if (xs[1][0] - prev_xs[1][0] < self.t_step * 0.8) {

                    // prev_xs is a higher "rank" label
                    if (xs[2] <= prev_xs[2]) {
                        self.xs.pop()
                    } else {
                        // Otherwise
                        self.xs.splice(self.xs.length - 2, 1)
                    }
                }
            }

            // TODO: fix grid extention for bigger timeframes
            if (interval < WEEK && r > 0) {
                extend_left(dt, r)
                extend_right(dt, r)
            }

        } else {

            self.t_step = master_grid.t_step
            self.px_step = master_grid.px_step
            self.startx = master_grid.startx
            self.xs = master_grid.xs

        }
    }

    function insert_line(prev, p, x, m0) {

        let prev_t = ti_map.ib ? ti_map.i2t(prev[0]) : prev[0]
        let p_t = ti_map.ib ? ti_map.i2t(p[0]) : p[0]

        // TODO: take this block =========> (see below)
        if ((prev[0] || interval === YEAR) &&
            Utils.get_year(p_t) !== Utils.get_year(prev_t)) {
            self.xs.push([x, p, YEAR]) // [px, [...], rank]
        }
        else if (prev[0] &&
            Utils.get_month(p_t) !== Utils.get_month(prev_t)) {
            self.xs.push([x, p, MONTH])
        }
        else if (p[0] % self.t_step === 0) {
            self.xs.push([x, p, interval])
        }
    }

    function extend_left(dt, r) {

        if (!self.xs.length || !isFinite(r)) return

        let t = self.xs[0][1][0]
        while (true) {
            t -= self.t_step
            let x = Math.floor((t  - range[0]) * r)
            if (x < 0) break
            // TODO: ==========> And insert it here somehow
            if (t % interval === 0) {
                self.xs.unshift([x,[t], interval])
            }
        }
    }

    function extend_right(dt, r) {

        if (!self.xs.length || !isFinite(r)) return

        let t = self.xs[self.xs.length - 1][1][0]
        while (true) {
            t += self.t_step
            let x = Math.floor((t  - range[0]) * r)
            if (x > self.spacex) break
            if (t % interval === 0) {
                self.xs.push([x,[t], interval])
            }
        }
    }

    function grid_y() {

        // Prevent duplicate levels
        let m = Math.pow(10, -self.prec)
        self.$_step = Math.max(m, dollar_step())
        self.ys = []

        let y1 = self.$_lo - self.$_lo % self.$_step

        for (var y$ = y1; y$ <= self.$_hi; y$ += self.$_step) {
            let y = Math.floor(y$ * self.A + self.B)
            if (y > height) continue
            self.ys.push([y, Utils.strip(y$)])
        }

    }

    function grid_y_log() {

        // TODO: Prevent duplicate levels, is this even
        // a problem here ?
        self.$_mult = dollar_mult()
        self.ys = []

        let v = Math.abs(sub[sub.length - 1][1] || 1)
        let y1 = search_start_pos(v)
        let y2 = search_start_neg(-v)
        let yp = -Infinity // Previous y value
        let n = height / $p.config.GRIDY // target grid N

        let q = 1 + (self.$_mult - 1) / 2

        // Over 0
        for (var y$ = y1; y$ > 0; y$ /= self.$_mult) {
            y$ = log_rounder(y$, q)
            let y = Math.floor(math.log(y$) * self.A + self.B)
            self.ys.push([y, Utils.strip(y$)])
            if (y > height) break
            if (y - yp < $p.config.GRIDY * 0.7) break
            if (self.ys.length > n + 1) break
            yp = y
        }

        // Under 0
        yp = Infinity
        for (var y$ = y2; y$ < 0; y$ /= self.$_mult) {
            y$ = log_rounder(y$, q)
            let y = Math.floor(math.log(y$) * self.A + self.B)
            if (yp - y < $p.config.GRIDY * 0.7) break
            self.ys.push([y, Utils.strip(y$)])
            if (y < 0) break
            if (self.ys.length > n * 3 + 1) break
            yp = y
        }

        // TODO: remove lines near to 0

    }

    // Search a start for the top grid so that
    // the fixed value always included
    function search_start_pos(value) {
        let N = height / $p.config.GRIDY // target grid N
        var y = Infinity, y$ = value, count = 0
        while (y > 0) {
            y = Math.floor(math.log(y$) * self.A + self.B)
            y$ *= self.$_mult
            if (count++ > N * 3) return 0 // Prevents deadloops
        }
        return y$
    }

    function search_start_neg(value) {
        let N = height / $p.config.GRIDY // target grid N
        var y = -Infinity, y$ = value, count = 0
        while (y < height) {
            y = Math.floor(math.log(y$) * self.A + self.B)
            y$ *= self.$_mult
            if (count++ > N * 3) break // Prevents deadloops
        }
        return y$
    }

    // Make log scale levels look great again
    function log_rounder(x, quality) {
        let s = Math.sign(x)
        x = Math.abs(x)
        if (x > 10) {
            for (var div = 10; div < MAX_INT; div *= 10) {
                let nice = Math.floor(x / div) * div
                if (x / nice > quality) {  // More than 10% off
                    break
                }
            }
            div /= 10
            return s * Math.floor(x / div) * div
        } else if (x < 1) {
            for (var ro = 10; ro >= 1; ro--) {
                let nice = Utils.round(x, ro)
                if (x / nice > quality) {  // More than 10% off
                    break
                }
            }
            return s * Utils.round(x, ro + 1)
        } else {
            return s * Math.floor(x)
        }
    }

    function apply_sizes() {
        self.width = $p.width - self.sb
        self.height = height
    }

    calc_$range()
    calc_sidebar()

    return {
        // First we need to calculate max sidebar width
        // (among all grids). Then we can actually make
        // them
        create: () => {
            calc_positions()
            grid_x()
            if (grid.logScale) {
                grid_y_log()
            } else {
                grid_y()
            }
            apply_sizes()

            // Link to the master grid (candlesticks)
            if (master_grid) {
                self.master_grid = master_grid
            }

            self.grid = grid // Grid params

            // Here we add some helpful functions for
            // plugin creators
            return layout_fn(self, range)

        },
        get_layout: () => self,
        set_sidebar: v => self.sb = v,
        get_sidebar: () => self.sb,
    }
}

export default GridMaker
