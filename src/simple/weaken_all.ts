import { get_server_available_ram, rooted_servers, run_script, run_script_with_fraction_threads, servers_with_ram } from 'helpers/servers.js'
import { NS } from '@ns'

export async function main(ns: NS) {
  run_script_with_fraction_threads(
    ns, 
    'repeat/weaken.js', 
    parseFloat(ns.args[0]?.toString() ?? '.5'),
    ns.args[1]?.toString() ?? 'foodnstuff'
  )
}