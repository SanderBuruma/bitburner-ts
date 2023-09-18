import { NS } from '@ns'

export async function main(ns: NS) {
  let target = ns.args[0].toString()
  await ns.grow(target)
}