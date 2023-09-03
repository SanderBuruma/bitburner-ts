import { NS } from '@ns'
import { log, set_log_settings } from 'helpers/utils.js'

export async function main(ns: NS) {
    set_log_settings(ns, false, true)
    ns.ls(ns.getHostname(), ns.args[0].toString())
    .forEach(s=>{
        if (s.slice(-3) === '.js' && ns.rm(s)) {
            log(ns, 'Removed file: \'' + s + '\'')
        }
    })
}