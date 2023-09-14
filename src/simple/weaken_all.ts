import { get_server_available_ram, rooted_servers, run_script, run_script_with_fraction_threads, servers_with_ram, total_available_ram } from 'helpers/servers.js'
import { NS } from '@ns'
import { Server } from '/classes/Server'
import { log } from '/helpers/utils'
import { Colors } from '/helpers/colors'
import { ports_we_can_hack } from '/hackall'

export async function main(ns: NS) {
  if (weaken_all(ns)) {
    log(ns, Colors.Good() + 'Initiated weaken all versus all servers with ' + Colors.Highlight(ports_we_can_hack(ns).toString()) + ' ports or less which were not at minimum security')
  } else {
    log(ns, Colors.Warning() + 'Initiated weaken all versus some but not ALL servers with ' + Colors.Highlight(ports_we_can_hack(ns).toString()) + ' ports or less which were not at minimum security')
  }
}
export function weaken_all(ns: NS) {
  for (let s of rooted_servers(ns).filter(s=>!new Server(ns, s).AtMinSec))
  {
    let server = new Server(ns, s)
    const w_threads = Math.ceil((server.Sec - server.MinSec)/.05)
    if (total_available_ram(ns, 2) < w_threads * 2) return false
    run_script(ns, 'simple/weaken.js', w_threads, server.Name)
  }
  return true
}