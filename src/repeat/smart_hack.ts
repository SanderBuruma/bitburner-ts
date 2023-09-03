import { NS } from '@ns'

export async function main(ns: NS) {
  ns.disableLog('sleep')

  let target: string = ns.args[0]?.toString()
  if (!target) throw new Error('No target provided')

  let smart: boolean = ns.args[1] ? true : false

  while (true) {
    if (smart && ns.getServerMaxMoney(target) <= ns.getServerMoneyAvailable(target) * .95) {
      await ns.sleep(1000)
      continue
    }
    await ns.hack(target)
  }
}