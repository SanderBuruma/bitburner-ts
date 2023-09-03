import { root_servers } from 'helpers/servers.js'
import { NS } from '@ns'

export async function main(ns: NS) {

  let servers = root_servers(ns)

  for (let s of servers) {

    if (s === 'home') continue

    let scripts = ns.ls('home').filter(s=>s.slice(-3) == ".js" && s.includes('batch/') || s.includes('repeat/'))
    ns.scp(scripts, s, 'home')

  }
}