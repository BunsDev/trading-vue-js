# API Book

::: warning
This library is in alpha stage, API may change. This guide version is **0.3.5**
:::

![npm](https://img.shields.io/npm/v/trading-vue-js.svg?color=brightgreen&label=Current%20lib%20version)

## Props

| Prop | Type | Description |
|---|---|---|
| titleTxt | String | Chart title text  |
| id | String | HTML id of root div |
| width | Number | Chart width (px) |
| height | Number | Chart height (px) |
| colorTitle | String | Title text color |
| colorBack | String | Background color |
| colorGrid | String | Grid color |
| colorText | String | Text (labels) color |
| colorTextHL | String | Highlighted text color |
| colorScale | String | Scales border color |
| colorCross | String | Crosshair color |
| colorCandleUp | String | Green candle color |
| colorCandleDw | String | Red candle color |
| colorWickUp | String | Green wick color  |
| colorWickDw | String | Red wick color  |
| colorWickSm | String | Scaled down wick color |
| colorVolUp | String | Green volume color |
| colorVolDw | String | Red volume color |
| colorPanel | String | Value bars color |
| font | String | Full font string, e.g. "11px Arial..." |
| data | Object | Data object |
| overlays | Array | List of custom overlay classes |
| chartConfig | Object | Overwrites chart config values |
| legendButtons | Array | Array of legend buttons ids |


### Legend Button Types

| add | remove | display | up | down | settings |
|---|---|---|---|---|---|
|![](assets/README-0487d08a.png)|![](assets/README-6ce736c2.png)|![](assets/README-cbe4028c.png)|![](assets/README-bc4359ae.png)|![](assets/README-ed2c9def.png)| ![](assets/README-b0d2d797.png)|

## Methods

### resetChart()

Resets the chart to the default state. Use it if you need to reset the time range.

*Example:*

```HTML
<template>
    <trading-vue ref="tradingVue"></trading-vue>
</template>
<script>
export default {
    mounted() {
        this.$refs.tradingVue.resetChart()
    }
}
</script>
```

### setRange(t1, t2)

Sets custom time range.

* **Arguments**: t1 (Number) Left-bound of the range
* **Arguments**: t2 (Number) Right-bound of the range

*Example:*

```HTML
<template>
    <trading-vue ref="tradingVue"></trading-vue>
</template>
<script>
export default {
    mounted() {
        // Wait until chart is fully loaded
        this.$nextTick(() =>
            this.$refs.tradingVue.setRange(t1, t2)
        )
    }
}
</script>
```

### getRange()

Gets current timerange.

* **Returns**: [t1, t2] (Array) Current timerange

### goto(t)

Goto to a specific timestamp

* **Arguments**: t (Number) Target timestamp


## Events

### legend-button-click

Emitted when user clicks on the legend button. Event format:

| Prop | Type | Description |
|---|---|---|
| button  | String |  Button type, e.g. 'display' |
| dataIndex  | Number  | Data index in onchart/offchart array |
| grid  |  Number | Grid id (0 is the main grid) |
| overlay |  String |  Overlay id, e.g. EMA_0 |
| type  |  String  | Indicator type (onchart/offchart) |

*Example:*

```html
<trading-vue
    :legend-buttons="['display']"
    v-on:legend-button-click="on_button_click">
</trading-vue>
<script>
export default {
    methods: {
        on_button_click(event) {
            // ...
        }
    }
}
</script>
```

## Data structure

Data structure v1.1

```js
{
    "chart": [   // Mandatory
        "type": "<Candles|Spline>",
        "data": [
            [timestamp, open, high, low, close, volume],
            ...
        ],
        "settings": { } // Settings (depending on "type")
    ],
    "onchart": [ // Displayed ON the chart
        {
            "name": "<Indicator name>",
            "type": "<e.g. EMA, SMA>",
            "data": [
                [timestamp, ... ], // Arbitrary length
                ...
            ],
            "settings": { } // Arbitrary settings format
        },
        ...
    ],
    "offchart": [ // Displayed BELOW the chart
        {
            "name": "<Indicator name>",
            "type": "<e.g. RSI, Stoch>",
            "data": [
                [timestamp, ... ], // Arbitrary length
                ...
            ],
            "settings": { } // Arbitrary settings format
        },
        ...
    ]
}
```

<details><summary>Data structure v1.0</summary>
<p>

```js
{
    "ohlcv": [   // Mandatory
        [timestamp, open, high, low, close, volume],
        ...
    ],
    "onchart": [ // Displayed ON the chart
        {
            "name": "<Indicator name>",
            "type": "<e.g. EMA, SMA>",
            "data": [
                [timestamp, ... ], // Arbitrary length
                ...
            ],
            "settings": { } // Arbitrary settings format
        },
        ...
    ],
    "offchart": [ // Displayed BELOW the chart
        {
            "name": "<Indicator name>",
            "type": "<e.g. RSI, Stoch>",
            "data": [
                [timestamp, ... ], // Arbitrary length
                ...
            ],
            "settings": { } // Arbitrary settings format
        },
        ...
    ]
}
```

</p>
</details>

## Overlay api

Data for building overlays. Defined in `mixins/overlay.js`, accessed through overlay's `this.$props`.

*All properties reactive*

| Prop | Type | Description |
|---|---|---|
| id | String | Overlay unique id (within current grid) ,e.g 'EMA_1' |
| num | Number | Overlay unique num (within current grid) |
| interval | Number | Candlestick interval, ms (e.g. 1 min = 60000 ) |
| cursor* | Object | Crosshair position and selected values, see below |
| colors | Object | All colors from `TradingVue.vue` combined |
| layout** | Object | Layout API object, see below |
| sub | Array | Current subset of candlestick data |
| data | Array | Current subset of indicator data |
| settings | Object | Indicator's settings, defined in `data.json` |
| grid_id | Number | Current grid id |

### Cursor data*

| Field | Type | Description |
|---|---|---|
| x | Number | Current x position (px) |
| y | Number | Current y position (px) |
| t | Number | Current timestamp (ms) |
| y$ | Number | Current price level |
| grid_id | Number | Current grid id |
| locked | Boolean | *true* during scrolling, *false* otherwise |
| values | Object | Current indicator values in a specific format |

#### Values format

```js
values: {
    "<grid_id>": {
        "ohlcv": [ ... ] | undefined,
        "<overlay_id>": [ ... ],
        ...
    },
    ...
}
```

*Example:*

```js
{
    0: {
        ohlcv: [1553378400000,4051.3,4063.9,4051.3,4063.8,259.61602371],
        EMA_0: [1553378400000,4054.9315737970815],
        EMA_1: [1553378400000,4057.3817565994727]
    },
    1: {
        ohlcv: undefined,
        RSI_0: [1553378400000,53.148999912870806]
    }
}
```

### Layout API**

#### Layout object

Defined in `layout.js`, accessed through overlay's `this.$props.layout`.

| Field | Type | Description |
|---|---|---|
| $_hi | Number | Upper bound of price-range |
| $_lo | Number | Lower bound of price-range |
| $_step | Number | Grid price step |
| t_step | Number | Grid time step  |
| A | Number | Scale transform coefficient |
| B | Number | Offset transform coefficient |
| id | Number | Grid id |
| prec | Number | Sidebar precision (decimals after point) |
| height | Number | Grid height (px)  |
| width | Number | Grid width (without sidebar, px) |
| offset | Number | Grid offset from the top (px) |
| px_step | Number | Candlestick step (px) |
| sb |  Number | Sidebar width |
| spacex | Number | Drawing area width (px) |
| startx | Number | First candle position (px) |
| candles | Array | Candles subset |
| volume | Array | Volume bars positions and sizes |
| xs | Array | vertical grid lines `[[x, candle], ...]` |
| ys | Array | horizontal grid lines `[[y, price], ...]` |

#### Mapping functions

Defined in `layout_fn.js`, accessed through overlay's `this.$props.layout`.

#### $2screen($)

Returns y-coordinate for given price

* **Arguments**: price (Number)
* **Returns**: pixels (Number)

#### t2screen(t)

Returns x-coordinate for given timestamp

* **Arguments**: time (Number)
* **Returns**: pixels (Number)

#### screen2$(y)

Returns price for given y-coordinate

* **Arguments**: y (Number)
* **Returns**: price (Number)

#### screen2t(x)

Returns time for given x-coordinate

* **Arguments**: x (Number)
* **Returns**: time (Number)

#### t_magnet(t)

Returns x-coordinate of nearest candle for given time

* **Arguments**: time (Number)
* **Returns**: pixels (Number)

#### c_magnet(t)

Returns nearest candle for given time

* **Arguments**: time (Number)
* **Returns**: candle (Object)

```js
Candle = {
    x,  // c-coordinate (px)
    w,  // width (px)
    o,  // open (px)
    h,  // high (px)
    l,  // low (px)
    c,  // close (px)
    raw // Candle data e.g. [1553378400000, ...]
}
```
<br>

*Example:*

```js
const layout = this.$props.layout

ctx.beginPath()

for (var p of this.$props.data) {

    let x = layout.t2screen(p[0])
    let y = layout.$2screen(p[1])

    ctx.lineTo(x, y)

}

ctx.stroke()
```

### Overlay meta-methods

To change the default behaviour of an overlay, override this methods.

#### meta_info()

Defines plugin version and other useful information. *Optional*, required for publishing.

```js
meta_info() {
    return {
        author: 'Satoshi Smith',
        version: '1.0.0',
        contact: '<email>',      // (opt)
        github: '<GitHub Page>'  // (opt)
    }
})
```

#### draw(ctx)

Your custom drawing function. **Required**

* **Arguments**: ctx (Canvas context)

```js
draw(ctx) {
    ...
}
```

#### use_for()

* **Returns**: list of indicator types which this overlay can draw. **Required**
The best practice is to include a generic type first and then a specific, e.g.

```js
use_for() {
    return ['Spline', 'EMA', 'SMA']
}
```

#### data_colors()

* **Returns**: List of data colors in the same order as corresponding values. *Optional*

```js
data_colors() {
    return ['red', '#ff0000', '#ff000055']
}
```

#### y_range(hi, lo)

Custom y-range. *Optional*

* **Arguments**:
    - hi (Number) Upper bound of calculated y-range
    - lo (Number) Lower bound of calculated y-range
* **Returns**: New or transformed y-range. Use when you need to change the scaling behavior of y-axis, e.g.:

```js
y_range(hi, lo) {
    return [
        Math.max(hi, 70),
        Math.min(lo, 30)
    ]
}
```

#### legend(values)

Custom legend formatter. *Optional*

* **Arguments**: values (Array) Current cursor values
* **Returns**: Formated values array, e.g.

```js
legend(values) {
    return [
        {
            value: values[1].toFixed(0),
            color: 'green'
        },
        {
            value: values[2]
        }
    ]
}
```

<br>

#### mousemove(event)
*Optional*
* **Arguments**: event (Object) Vue mouse event

#### mouseout(event)
*Optional*
* **Arguments**: event (Object) Vue mouse event

#### mouseup(event)
*Optional*
* **Arguments**: event (Object) Vue mouse event

#### mousedown(event)
*Optional*
* **Arguments**: event (Object) Vue mouse event
