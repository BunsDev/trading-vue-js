
<div align="center">
  <img width="318" heigth="256" src="https://raw.githubusercontent.com/C451/trading-vue-js/master/assets/README-c8a97eb7.png?raw=true" alt="trading-vue logo">
</div>

# TradingVue.js ![npm](https://img.shields.io/npm/v/trading-vue-js.svg?color=brightgreen&label=version) ![license](https://img.shields.io/badge/license-MIT-blue.svg) ![GRUGLIKE](https://img.shields.io/badge/GRUG-LIKE-yellow.svg) ![build](https://img.shields.io/badge/build-passing-brightgreen.svg) ![size](https://img.shields.io/github/size/C451/trading-vue-js/dist/trading-vue.min.js.svg) ![yes](https://img.shields.io/badge/by%20trader-for%20traders-lightgray.svg)


**TradingVue.js** is a hackable charting lib for traders. You can draw literally ANYTHING on top of candlestick charts.

## Why?

I've been using [TradingView.com](https://www.tradingview.com) for several years and oh boy, I like this service.
But when it came to writing custom trading software there was no charting library with the same level of usability, not even near. There **WAS** no lib.

<br>

<div align="center">
    <img width="780" heigth="446" src="https://github.com/C451/trading-vue-js/blob/master/assets/README-db7bd751.gif?raw=true" alt="White preview">
</div>

<br>

## Features

* Scrolling & zoomming as we all like
* Simple API for making new overlays
* No need for fancy math!
* One overlay === one .vue file (or .js)
* Fully reactive
* Fully responsive
* Customizable colors and fonts

## Demo & Docs

#### [Demo | click your 🐁 ](https://c451.github.io/trading-vue-demo/)

## Install

**NPM**
```
npm i trading-vue-js -S
```
**In browser**

```
<script src="trading-vue.min.js"></script>
```

## How to use

Minimal working example:

```html
<template>
<trading-vue :data="this.$data"></trading-vue>
</template>
<script>

import TradingVue from 'trading-vue-js'

export default {
    name: 'app',
    components: { TradingVue },
    data() {
        return {
            ohlcv: [
                [ 1551128400000, 33,  37.1, 14,  14,  196 ],
                [ 1551132000000, 13.7, 30, 6.6,  30,  206 ],
                [ 1551135600000, 29.9, 33, 21.3, 21.8, 74 ],
                [ 1551139200000, 21.7, 25.9, 18, 24,  140 ],
                [ 1551142800000, 24.1, 24.1, 24, 24.1, 29 ],
            ]
        }
    }
}

</script>
```

## Data structure

PRO TIP: **ohlcv** is mandatory if you want to see something other than a white screen

```js
{
    "ohlcv": [
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
            "type": "<e.g. EMA, SMA>",
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
The process of adding a new indicator is simple. First you define your own data format (should be timestamped though) and display settings. For example, EMA data might look like this:

 ```json
 {
     "name": "EMA, 25",
     "type": "EMA",
     "data": [
         [ 1551128400000, 3091 ],
         [ 1551132000000, 3112 ],
         [ 1551135600000, 3105 ]
     ],
     "settings": {
         "color": "#42b28a"
     }
 },

 ```

## Example of a simple overlay class

And then you make a new overlay class to display that data on the grid:

```js
import Overlay from '../../mixins/overlay.js'

export default {
    name: 'EMA',
    mixins: [Overlay],
    methods: {
        draw(ctx) {
            const layout = this.$props.layout
            ctx.strokeStyle = this.color
            ctx.beginPath()
            for (var p of this.$props.data) {
                // t2screen & $2screen - special functions that
                // map your data coordinates to grid coordinates
                let x = layout.t2screen(p[0])
                let y = layout.$2screen(p[1])
                ctx.lineTo(x, y)
            }
            ctx.stroke()
        },
        use_for() { return ['EMA'] },
        data_colors() { return [this.color] }
    },
    computed: {
        color() {
            return this.$props.settings.color
        }
    }
}
```

That's why I said you can draw ANYTHING. Stay with me, I will prove this bold statement to you:

## Grin

<div align="center">
  <img src="https://github.com/C451/trading-vue-js/blob/master/assets/README-0027a833.png?raw=true" alt="trading-vue logo">
</div>

#### [ Code | click your 🐁 ](https://gist.github.com/C451/eb3620a44c2fc4bd3112406c7426c70c)


## Roadmap

* Docs
* Solve known issues (search for "TODO: IMPORTANT")
* Performance improvements
* Add more built-in overlays
* Add toolbar (drawing tools)
* Custom loayout / layout persistence
* Fix and improve mobile version
* **Version 1.0.0 here**

## Contribution

In progress
