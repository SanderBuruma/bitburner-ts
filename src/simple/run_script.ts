import { run_script_with_fraction_threads } from 'helpers/servers.js'
import { NS } from '@ns'

export async function main(ns: NS) {
  let filename = ns.args[0]?.toString()
  let threads_fraction = parseFloat(ns.args[1]?.toString() ?? .01)
  run_script_with_fraction_threads(ns, filename, threads_fraction, ...ns.args.slice(2).map(x=>x.toString()))
}