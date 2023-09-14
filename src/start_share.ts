import { NS } from '@ns'
import { run_script } from 'helpers/servers'
import { Server } from './classes/Server'

export async function main(ns: NS) {
  let target = new Server(ns, ns.args[0].toString() || 'home')
  let threads = Math.floor(target.AvailableRam / 4.5)
  run_script(ns, 'repeat/share.js', threads, target.Name)
}