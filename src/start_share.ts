import { NS } from '@ns'
import { get_server_available_ram, run_script } from 'helpers/servers'

export async function main(ns: NS) {
  let target = ns.args[0].toString() || 'home'
  let availableRam = get_server_available_ram(ns, target)
  let threads = Math.floor(availableRam / 4.5)
  run_script(ns, 'repeat/share.js', threads, target)

}