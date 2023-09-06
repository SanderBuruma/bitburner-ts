import { NS } from '@ns'
import { FactionResult } from './interfaces/FactionResult'
import { await_predicate, run_write_read } from './helpers/utils'

export async function main(ns: NS) {
    let check_time = Date.now()
    await await_predicate(ns, ()=>Date.now() - check_time > 1000, 5000)
    ns.tprint('Check! pid:' + ns.getRunningScript()?.pid)
    //let now = Date.now()
    //let factions: FactionResult[] = await run_write_read(ns, 'simple/work_with_a_faction.js', 1, 'factions_to_port')
    //ns.tprint({factions, time_passed: Date.now() - now})
}