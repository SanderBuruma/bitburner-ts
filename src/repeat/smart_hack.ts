import { NS } from '@ns'

export async function main(ns: NS) {
  ns.disableLog('sleep')

  let target: string = ns.args[0]?.toString() ?? 'foodnstuff'
  if (!target) throw new Error('No target provided')

  while (true) {
    while (ns.getServerMaxMoney(target) <= ns.getServerMoneyAvailable(target) * .95) {
      await ns.sleep(1000)
    }
    await ns.hack(target)
  }
}