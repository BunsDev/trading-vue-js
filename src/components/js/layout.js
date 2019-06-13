// Calculates all necessary s*it to build the chart
// Heights, widths, transforms, ... = everything
// Why such a mess you ask? Well, that's because
// one components size can depend on other component
// data formatting (e.g. grid width depends on sidebar precision)
// So it's better to calc all in one place.

import GridMaker from './grid_maker.js'

function Layout(params) {

    let {
        sub, offsub, interval, range, ctx, layers_meta, $props:$p,
        y_transforms: y_ts
    } = params

    // Splits space between main chart
    // and offchart indicator grids
    function grid_hs() {

        const n = offsub.length
        const off_h = (2 * Math.sqrt(n) / 7) / (n || 1)
        const height = $p.height - $p.config.BOTBAR

        // Offchart grid height
        const px = Math.floor(height * off_h)

        // Main grid height
        const m = height - px * n

        return [m].concat(Array(n).fill(px))

    }

    function t2screen(t) {
        const dt = range[1] - range[0]
        const r = self.spacex / dt
        return Math.floor((t - range[0]) * r)
    }

    function candles_n_vol() {

        self.candles = []
        self.volume = []

        let maxv = Math.max(...sub.map(x => x[5]))
        let vs = $p.config.VOLSCALE * $p.height / maxv
        var x1, x2, mid, prev = undefined

        let splitter = self.px_step > 5 ? 1 : 0

        for (var i = 0; i < sub.length; i++) {
            let p = sub[i]
            mid = t2screen(p[0])
            self.candles.push({
                x: mid,
                w: self.px_step * $p.config.CANDLEW,
                o: p[1] * self.A + self.B,
                h: p[2] * self.A + self.B,
                l: p[3] * self.A + self.B,
                c: p[4] * self.A + self.B,
                raw: p
            })
            // Clear volume bar if there is a time gap
            if (sub[i-1] && p[0] - sub[i-1][0] > interval) {
                prev = null
            }
            x1 = prev || Math.floor(mid - self.px_step * 0.5)
            x2 = Math.floor(mid + self.px_step * 0.5) - 0.5
            self.volume.push({
                x1: x1,
                x2: x2,
                h: p[5] * vs,
                green: p[4] > p[1],
                raw: p
            })
            prev = x2 + splitter
        }
    }

    // Main grid
    const hs = grid_hs()
    let specs = {
        sub, interval, range, ctx, $p, layers_meta, height: hs[0],
        y_t: y_ts[0]
    }
    let gms = [new GridMaker(0, specs)]

    // Sub grids
    for (var [i, { data }] of offsub.entries()) {
        specs.sub = data
        specs.height = hs[i + 1]
        specs.y_t = y_ts[i + 1]
        gms.push(new GridMaker(i + 1, specs, gms[0].get_layout()))
    }

    // Max sidebar among all grinds
    let sb = Math.max(...gms.map(x => x.get_sidebar()))

    let grids = [], offset = 0

    for (i = 0; i < gms.length; i++) {
        gms[i].set_sidebar(sb)
        grids.push(gms[i].create())
        grids[i].id = i
        grids[i].offset = offset
        offset += grids[i].height
    }

    let self = grids[0]

    candles_n_vol()

    return {
        grids: grids,
        botbar: {
            width: $p.width,
            height: $p.config.BOTBAR,
            offset: offset,
            xs: grids[0] ? grids[0].xs : []
        }
    }
}

export default Layout
