import { NS } from '@ns'
import { await_predicate } from 'helpers/utils'

export async function main(ns: NS) {
    let check_time = Date.now()
    await await_predicate(ns, ()=>Date.now() - check_time > 1000, 5000)
    ns.tprint('Check! pid:' + ns.getRunningScript()?.pid)
}