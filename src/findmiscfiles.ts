import { scan_all } from 'helpers/servers.js'
import { NS } from '@ns'

export async function main(ns: NS) {
  let servers = scan_all(ns)
  for (let s of servers) {
    let files = s.Files
    .filter(s=>s.slice(-3) != '.js')
    .filter(s=>s.slice(-4) != '.lit')

    if (files.length < 1) continue

    ns.tprintf(JSON.stringify({server:s.Name, files}, null, 2))
  }
}