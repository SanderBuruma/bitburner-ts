import { root_servers } from 'utils.js'
import { NS } from '@ns'

export async function main(ns: NS) {

  let servers = root_servers(ns)

  for (let s of servers) {

    if (s === 'home') continue

    let scripts = ns.ls('home').filter(s=>s.slice(-3) == ".js")
    ns.scp(scripts, s, 'home')

  }
}