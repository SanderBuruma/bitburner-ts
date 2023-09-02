import { NS } from '@ns'

export async function main(ns: NS) {
  let target = ns.args[0].toString()
  ns.print(ns.args)
  while (true) await ns.grow(target)
}