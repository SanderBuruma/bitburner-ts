import { log, kill_previous } from 'helpers/utils.js'
import { NS } from '@ns'
import { Colors } from 'helpers/colors'

export async function main(ns: NS) {
  ns.disableLog('ALL')

  if (ns.args.indexOf('--info') !== -1) info(ns)
  else if (ns.args.indexOf('--run') !== -1) {
    kill_previous(ns)
    await activate(ns)
  }
  else if (ns.args.indexOf('--members') !== -1) await members_info(ns)
  else if (ns.args.indexOf('--tasks') !== -1) await tasks_info(ns)
  else ns.tprintf('No --info, --members, --tasks or --run argument provided')
}

export async function activate(ns: NS) {

  // gang member names
  const maleCatholicNames = ["Peter", "Andrew", "James", "Paul", "John", "Michael", "Matthew", "Anthony", "Mark", "Joseph", "Jude", "Christopher", "Thomas", "Simon", "Gabriel", "Vincent", "Nicholas", "Dominic", "Francis", "Stephen", "Philip", "Patrick", "Martin", "Raymond", "Clement", "David", "Isaac", "Justin", "Robert", "Raphael", "George", "Daniel", "Sebastian", "Adrian", "Benedict", "Samuel", "Elijah", "Jacob", "Benjamin", "Aaron", "Gregory", "Dennis", "Jeremy", "Alexander", "Damian", "Josephus", "Bartholomew", "Fabian"];

  while (true) {
    // refresh members
    let gang_info = ns.gang.getGangInformation()
    let members = ns.gang.getMemberNames().map(m => ns.gang.getMemberInformation(m))
    let power = gang_info.power


    let other_gang_info = ns.gang.getOtherGangInformation()
    let sortedGangs = Object.entries(other_gang_info).sort((a, b) => b[1].power - a[1].power);
    let strongest_enemy_gang = sortedGangs[1][1];

    // Reassign Member Roles
    for (let m of members) {
      if (m.str < 8000 && m.task != 'Train Combat') {
        ns.gang.setMemberTask(m.name, 'Train Combat')
        log(ns, Colors.Highlight(m.name) + ' went to Train Combat')
        
      } else if (m.str >= 8000 && strongest_enemy_gang.power > power/2 && m.task != 'Territory Warfare') {
        ns.gang.setMemberTask(m.name, 'Territory Warfare')
        log(ns, Colors.Highlight(m.name) + ' went to Territory Warfare')

      } else if (m.str >= 8000 && strongest_enemy_gang.power < power/1.5 && m.task != 'Human Trafficking') {
        ns.gang.setMemberTask(m.name, 'Human Trafficking')
        log(ns, Colors.Highlight(m.name) + ' went to Smuggle Christians out of Saracen lands')
      }
    }

    // Ascend gang members
    for (let m of members) {
      let str = ""
      let name = m?.name ?? 'unknown'
      try {
        let str = ns.gang.getAscensionResult(name)
        if (!str) continue
      } catch {
        str = '1'
      }
      let str2 = parseFloat(str)
      if (str2 > 4 / 3 && m.task == 'Train Combat') {
        if (ns.gang.ascendMember(m.name)) {
          log(ns, `Ascending ${Colors.Good(m.name)} at str_exp:${ns.formatNumber(m.str_exp)}`)
        } else {
          log(ns, Colors.Bad() + `${m.name} ascension failed`)
        }
      }
    }

    // Get new member
    if (ns.gang.canRecruitMember()) {
      let newName = maleCatholicNames[members.length]
      if (!ns.gang.recruitMember(newName)) {
        throw new Error('Couldn\'t recruit ' + newName)
      } else {
        log(ns, Colors.Highlight(newName) + ' has been recruited!')
        members = ns.gang.getMemberNames().map(m => ns.gang.getMemberInformation(m))
      }
    }

    // Buy equipment

    // Toggle territory warfare
    if (!gang_info.territoryWarfareEngaged && strongest_enemy_gang.power < power/1.4) {
      // If the most powerful gang is twice as weak, turn on territory warfare.
      ns.gang.setTerritoryWarfare(true)
      log(ns, Colors.Good() + 'Turned on gang warfare, enemy power:' + ns.formatNumber(strongest_enemy_gang.power) + ' vs us:' + ns.formatNumber(power))
    } else if (gang_info.territoryWarfareEngaged && strongest_enemy_gang.power > power) {
      // If the most powerful gang is getting equally strong, turn on territory warfare.
      ns.gang.setTerritoryWarfare(false)
      log(ns, Colors.Bad() + 'Turned off gang warfare, enemy power:' + ns.formatNumber(strongest_enemy_gang.power) + ' vs us:' + ns.formatNumber(power))
    }

    // Loop only once per second
    await ns.sleep(1e4)
  }
}

export function info(ns: NS) {
  prnt(ns, ns.gang.getGangInformation())
  prnt(ns, ns.gang.getOtherGangInformation())
  members_info(ns)
  tasks_info(ns)
}

export function tasks_info(ns: NS) {

  for (let t of ns.gang.getTaskNames()) {
    ns.tprintf(`\nTask: ${t}`)
    prnt(ns, ns.gang.getTaskStats(t))
  }
}

export function members_info(ns: NS) {
  prnt(ns, ns.gang.getGangInformation())
  prnt(ns, ns.gang.getMemberNames())
  for (let m of ns.gang.getMemberNames()) {
    if (ns.args.indexOf(m) == -1) {
      continue
    }
    ns.tprintf(`\nMember: ${m}`)
    prnt(ns, ns.gang.getMemberInformation(m))
    prnt(ns, ns.gang.getAscensionResult(m) ?? {msg: "Couldn't get result for " + m})
  }
}

export function prnt(ns: NS, obj: object) {
  if (obj)
    ns.tprintf(JSON.stringify(obj, null, 2))
}