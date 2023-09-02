import { NS } from '@ns'

export async function main(ns: NS) {
  let target = ns.args[0].toString() || 'home'
  let availableRam = ns.getServerMaxRam(target) - ns.getServerUsedRam(target)
  let threads = Math.floor(availableRam / 4.5)
  ns.exec('share.js', target, threads)

}