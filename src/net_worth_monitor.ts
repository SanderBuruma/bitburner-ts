import { net_worth, log } from 'helpers/utils.js'
import { NS } from '@ns'

export async function main(ns: NS) {
  ns.disableLog('ALL')

  let last_moment = Date.now()
  while (true) {
    log(ns, ns.formatNumber(net_worth(ns)))
    while (Date.now() - last_moment < 60_000) await ns.sleep(100)
    last_moment += 60_000
  }

}