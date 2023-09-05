import { NS } from '@ns'
import { FactionResult } from './interfaces/FactionResult'
import { run_write_read } from './helpers/utils'

export async function main(ns: NS) {
    let now = Date.now()
    let factions: FactionResult[] = await run_write_read(ns, 'simple/work_with_a_faction.js', 1, 'factions_to_port')
    ns.tprint({factions, time_passed: Date.now() - now})
}