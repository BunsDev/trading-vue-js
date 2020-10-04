
// Web-worker

import se from './script_engine.js'
import Utils from '../stuff/utils.js'
import * as u from './script_utils.js'
import { DatasetWW } from './dataset.js'

var data_requested = false

// DC => WW

self.onmessage = async e => {
    //console.log('Worker got:', e.data.type)
    switch(e.data.type) {

        case 'update-dc-settings':

            se.sett = e.data.data

            break

        case 'exec-script':

            var req = se.data_required(e.data.data.s)
            if (req && !data_requested) {
                data_requested = true
                self.postMessage({
                    type: 'request-data', data: req
                })
            }
            se.tf = e.data.data.tf
            se.range = e.data.data.range
            se.queue.push(e.data.data.s)
            se.exec_all()

            break

        case 'exec-all-scripts':

            var req = se.data_required(e.data.data.s)
            if (req && !data_requested) {
                data_requested = true
                self.postMessage({
                    type: 'request-data', data: req
                })
            }

            se.tf = e.data.data.tf
            se.range = e.data.data.range
            se.exec_all()

            break

        case 'upload-data':
            self.postMessage({ type: 'data-uploaded' })

            await Utils.pause(1)

            for (var id in e.data.data) {
                let data = e.data.data[id]
                se.data[id] = new DatasetWW(id, data)
            }

            data_requested = false
            se.exec_all()

            break

        case 'upload-module':

            let lib = u.make_module_lib(e.data.data)
            se.mods[e.data.data.id] = new (
                new Function(
                    'mod', 'se', 'lib',
                    u.f_body(e.data.data.main)
                )
            )(e.data.data.id, se, lib)

            break

        case 'module-event':
            // TODO: this
            break

        case 'update-data':

            if (e.data.data.ohlcv) {
                // TODO: for datasets
                se.update(e.data.data.ohlcv)

            }

            break

        case 'dataset-op':

            await Utils.pause(1)

            if (e.data.data.id in se.data) {
                se.data[e.data.data.id].op(e.data.data)
            }

            break

        case 'update-ov-settings':

            se.tf = e.data.data.tf
            se.range = e.data.data.range
            se.exec_sel(e.data.data.delta)

            break

        case 'remove-scripts':

            se.remove_scripts(e.data.data)

            break
    }

}

// WW => DC

se.send = (type, data) => {

    switch(type) {

        case 'overlay-data':
        case 'overlay-update':
        case 'engine-state':
        case 'modify-overlay':
        case 'module-data':

            self.postMessage({type, data})

            break

    }

}
