import { NS } from '@ns'
import { rooted_servers, run_script, run_script_with_fraction_threads } from '/helpers/servers'
import { lmt } from '/list_money_targets'
import { run_write_read } from '/helpers/utils'
import { hgw_continuous_best_target } from 'singularity/start_after_reset'

export async function main(ns: NS) {
    ns.disableLog('ALL')

    // Stop doing whatever we were doing
    ns.singularity.stopAction()

    // Kill all previous scripts
    run_script(ns, 'killall.js', 1, ns.getRunningScript()?.pid.toString() ?? '0')
    await ns.sleep(250)

    // Start some initial money gathering
    run_script(ns, 'hackall.js')
    await ns.sleep(250)

    // Prepare for a life of alt right activism
    run_script(ns, 'simple/gym_workout.js', 1, 'powerhouse gym', 'dex')
    while (ns.getPlayer().skills.dexterity < 10) await hack_most_money(ns)
    run_script(ns, 'simple/gym_workout.js', 1, 'powerhouse gym', 'agi')
    while (ns.getPlayer().skills.agility < 10) await hack_most_money(ns)
    ns.singularity.stopAction()

    // Start criming
    run_script(ns, 'simple/commit_crime.js', 1, 'Rob Store')
    
    // Wait for enough cash to open the first port
    while (ns.getPlayer().money <= 200e3) await hack_most_money(ns)
    run_script(ns, 'simple/purchase_tor.js')
    await ns.sleep(250)

    await wait_and_buy_program(ns, 500e3, 'BruteSSH.exe')
    await wait_and_buy_program(ns, 1.5e6, 'FTPCrack.exe')
    await wait_and_buy_program(ns, 5e6, 'relaySMTP.exe')
    
    // Wait to upgrade home RAM
    while (ns.getServerMaxRam('home') < 2**6) 
    {
        let predicate = await run_write_read(ns, 'simple/upg_home_ram.js', 1)
        if (predicate === 'true') break

        await hack_most_money(ns)
    }

    // Work for CSEC
    run_script(ns, 'connect.js', 1, 'CSEC')
    await ns.sleep(250)
    await ns.singularity.installBackdoor()
    run_script(ns, 'connect.js', 1, 'home')
    await ns.sleep(250)
    run_script(ns, 'simple/work_for_faction.js', 1, 'CyberSec', 'hacking')
    await ns.sleep(250)

    await hgw_continuous_best_target(ns)
    await wait_and_buy_program(ns, 30e6, 'HTTPWorm.exe', false)

    // Kill all scripts
    run_script(ns, 'killall.js', 1, ns.getRunningScript()?.pid.toString() ?? '0')
    await ns.sleep(250)

    // Start next script
    ns.tprintf('%s finished running, spawning next script', ns.getRunningScript()?.filename)
    ns.spawn('singularity/init_bitnode_part_2.js')
}

/** hacks whichever target earns us the most money per unit of time without using grow */
export async function hack_most_money(ns: NS) {
    let new_target = lmt(ns, true, true, true)[0].name
    run_script_with_fraction_threads(ns, 'simple/hack.js', 0.95, new_target)
    await ns.sleep(ns.getHackTime(new_target) + 150)
}

/** wait until we have enough money to buy program before buying it */
export async function wait_and_buy_program(ns: NS, money: number, program: string, hack: boolean = true) {
    while (ns.getPlayer().money < money) {
        if (hack) await hack_most_money(ns)
        else await ns.sleep(250)
    }
    run_script(ns, 'simple/purchase_program.js', 1, program)
    await ns.sleep(250)
    run_script(ns, 'hackall.js')
    await ns.sleep(250)
}