import { NS } from '@ns'
import { FactionResult } from '../interfaces/FactionResult'
import { write_to_port } from '/helpers/utils'

export async function main(ns: NS) {
  let method = ns.args[0]?.toString() ?? 'invalid'
  let port_pid = ns.getRunningScript()?.pid ?? 0
  if (method === 'factions_to_port') {
    faction_to_port(ns, port_pid)
  } else if (method === 'work_with_faction') {
    await work_with_faction(ns)
  } else {
    throw new Error(ns.getRunningScript()?.filename + ' received invalid method argument')
  }
}

export async function work_with_faction(ns :NS) {
  let factions = available_factions(ns)
  for (let faction of factions) {
    ns.singularity.stopAction()
    await ns.sleep(500)
    ns.singularity.joinFaction(faction.name)
    await ns.sleep(500)
    ns.singularity.workForFaction(faction.name, 'hacking', true)
    break
  }
}

/** @description Gets all factions which the player can join */
export function available_factions(ns: NS): FactionResult[] {
  let factions: FactionResult[] = [{
    name: 'CyberSec',
    server: 'CSEC',
    hackingReq: ns.getServerRequiredHackingLevel('CSEC')
  }, {
    name: 'NiteSec',
    server: 'avmnite-02h',
    hackingReq: ns.getServerRequiredHackingLevel('avmnite-02h')
  }, {
    name: 'The Black Hand',
    server: 'I.I.I.I',
    hackingReq: ns.getServerRequiredHackingLevel('I.I.I.I')
  }, {
    name: 'BitRunners',
    server: 'run4theh111z',
    hackingReq: ns.getServerRequiredHackingLevel('run4theh111z')
  }].filter(x=>{ 
    return (ns.singularity.checkFactionInvitations().includes(x.name) || 
    ns.getPlayer().factions.includes(x.name)) &&
    ns.getHackingLevel() >= x.hackingReq &&
    ns.singularity.getAugmentationsFromFaction(x.name).filter(x=>ns.singularity.getOwnedAugmentations().indexOf(x) == -1)
  })
  return factions
}

export function faction_to_port(ns: NS, port_pid: number) {
  let factions = available_factions(ns)
  write_to_port(ns, factions)
}