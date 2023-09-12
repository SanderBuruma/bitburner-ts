import { NS } from '@ns'

export async function main(ns: NS) {
  if (ns.args.length !== 2) throw new Error('Need two arguments: faction & work type (field, hacking or security)')
  const faction = ns.args[0]?.toString() ?? 'CyberSec'
  const work_type = ns.args[1]?.toString() ?? 'hacking'

  const check = ['hacking','security','field'].indexOf(work_type) !== -1
  if (!check) 
  {
    throw new Error('second argument needs to be workType: field, hacking or security')
  }

  ns.singularity.joinFaction(faction)
  await ns.sleep(250)
  ns.singularity.stopAction()

  if (work_type === 'hacking') {ns.singularity.workForFaction(faction, work_type, true); return}
  if (work_type === 'field') {ns.singularity.workForFaction(faction, work_type, true); return}
  if (work_type === 'security') {ns.singularity.workForFaction(faction, work_type, true); return}
  throw new Error('unknown error in ' + ns.getRunningScript()?.filename)
}