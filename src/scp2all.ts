import { rooted_servers } from 'helpers/servers.js'
import { NS } from '@ns'

export async function main(ns: NS) {

  let servers = rooted_servers(ns)

  for (let s of servers) {

    if (s === 'home') continue

    let scripts = ns.ls('home').filter(x=>x.slice(-3) == ".js" && x.includes('batch/') || x.includes('repeat/') || x.includes('simple/'))
    ns.scp(scripts, s, 'home')

  }
}