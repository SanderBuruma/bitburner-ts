import { NS } from '@ns'

export async function main(ns: NS) {
  let target: string = ns.args[0]?.toString()
  if (!target) throw new Error('No target provided')

  while (true) {
    await ns.hack(target)
  }
}