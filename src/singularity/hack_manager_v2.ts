import { NS } from '@ns'
import { hack_grow_weaken_ratios, log, set_log_settings } from '/helpers/utils'
import { Colors } from '/helpers/colors'
import { rooted_servers, run_script, total_max_ram } from '/helpers/servers'
import { Server } from '/classes/Server'

class QueItem {
    private ns: NS
    target: string
    type: "h"|"g"|"w"
    threads: number
    finishTime: number
    multiplier: number
    constructor(ns: NS, target: string, type:"h"|"g"|"w", threads: number, multiplier: number) {
        this.ns = ns
        this.target = target
        this.type = type
        this.threads = threads
        this.multiplier = multiplier
        if (type === "h") this.finishTime = ns.getHackTime(target) + Date.now()
        else if (type === "w") this.finishTime = ns.getWeakenTime(target) + Date.now()
        else this.finishTime = ns.getGrowTime(target) + Date.now()
    }
}

export async function main(ns: NS) {
    set_log_settings(ns, true, false, false)
    let this_filename = ns.getRunningScript()?.filename??''
    let max_ram_fraction = parseFloat(ns.args[0]?.toString() ?? '.5')
    ns.print({max_ram_fraction})

    let que: QueItem[] = []
    let target = new Server(ns, 'n00dles')
    const timing_lenience = 150

    let nextWeaken = Date.now()
    let timing_mismatch_tracker = 0
    while (true) {
        await ns.sleep(1)
        let last_moment = Date.now()
        let multiplier = 1.5

        // Select new target and adjust timing_fraction if needed
        let tm_ram = total_max_ram(ns)
        let new_target = 
        rooted_servers(ns)
        .filter(s=>
            s.AtMinSec && 
            (s.HackingRequirement * 2 < ns.getPlayer().skills.hacking || s.HackingRequirement < 50) &&
            s.HWGWCycleRamForDouble < tm_ram)
        .sort((a,b)=>b.StaticScore-a.StaticScore)[0]
        if (
            new_target.StaticScore / 1.5 > target.StaticScore
        ) {
            target = new_target
            ns.print('New target: ' + Colors.Highlight(new_target.Name))
        }
        let timing_factor = Math.min(86.86, Math.max(.95, .8 * tm_ram / new_target.HWGWCycleRamForDouble))

        // Prepare que information and filter out old que items
        que = que.filter(i=>i.finishTime > Date.now()).sort((a,b)=>a.finishTime - b.finishTime)
        const weaken_que=que.filter(i=>i.type === "w")
        const grow_que = que.filter(i=>i.type === "g")
        const hack_que = que.filter(i=>i.type === "h")

        // If we're due to launch another weaken
        if (nextWeaken <= Date.now()) 
        {
            let hgw_rs = hack_grow_weaken_ratios(ns, target.Name, multiplier)
            let weaken_threads = Math.ceil(hgw_rs.hack_threads / 16 + hgw_rs.grow_threads / 8)
            let server = new Server(ns, target.Name)
            if (!server.AtMinSec) {
                weaken_threads = Math.ceil(weaken_threads + (server.Sec-server.MinSec)/.05)
            }
            nextWeaken = Math.floor(Date.now() + target.WeakenTime / timing_factor)
            run_script(ns, 'simple/weaken.js', weaken_threads, target.Name, this_filename) 
            if (server.AtMinSec) que.push(new QueItem(ns, target.Name, "w", weaken_threads, multiplier))
        }

        // Launch grow scripts if due
        const next_weaken = weaken_que[0]
        let next_weaken_server = new Server(ns, next_weaken?.target??'n00dles')
        let now = Date.now()
        if 
        (
            next_weaken && 
            next_weaken.finishTime - timing_lenience / 2 - next_weaken_server.GrowTime < now && 
            next_weaken_server.AtMinSec &&
            Date.now() - last_moment < timing_lenience / 10) 
        {
            // Remove old item
            let index = que.findIndex(x=>x.finishTime === next_weaken.finishTime && x.type === next_weaken.type)
            if (que.splice(index, 1).length === 0){
                throw new Error('Couldn\'t find the index we were looking for')
            }

            let hgw_rs = hack_grow_weaken_ratios(ns, next_weaken.target, next_weaken.multiplier)
            let grow_threads = Math.ceil(hgw_rs.grow_threads*1.2)
            run_script(ns, 'simple/grow.js', grow_threads, next_weaken.target, this_filename) 
            que.push(new QueItem(ns, next_weaken.target, "g", grow_threads, next_weaken.multiplier))
        }

        // Launch hack scripts if due
        const next_grow = grow_que[0]
        let next_grow_server = new Server(ns, next_grow?.target ??'n00dles')
        now = Date.now()
        if 
        (
            next_grow && 
            next_grow.finishTime - timing_lenience / 2 - next_grow_server.HackTime < now && 
            next_grow_server.AtMinSec && next_grow_server.Money / next_grow_server.MaxMoney > .5 &&
            Date.now() - last_moment < timing_lenience / 10
        ) 
        {
            // Remove old item
            let index = que.findIndex(x=>x.finishTime === next_grow.finishTime && x.type === next_grow.type)
            if (que.splice(index, 1).length === 0){
                throw new Error('Couldn\'t find the index we were looking for')
            }

            let hgw_rs = hack_grow_weaken_ratios(ns, next_grow.target, next_grow.multiplier)
            let hack_threads = Math.ceil(hgw_rs.hack_threads)

            let i = {growHackFTdiff: (now + next_grow_server.HackTime)-next_grow.finishTime, growfinishtime_lessthan_hackfinishtime: true}
            i.growfinishtime_lessthan_hackfinishtime = i.growHackFTdiff > 0
            if (i.growfinishtime_lessthan_hackfinishtime) {
                // by dividing by 1.1 the highest score ever reachable is 10 if the timing is always mismatched
                timing_mismatch_tracker += 1
                if (timing_mismatch_tracker > 5) {
                    ns.tprintf(JSON.stringify({timing_mismatch_tracker: ns.formatNumber(timing_mismatch_tracker), target: target.Name, timing_factor}, null, 2))
                }
                else if (timing_mismatch_tracker > 2) {
                    ns.printf(JSON.stringify({timing_mismatch_tracker: ns.formatNumber(timing_mismatch_tracker), target: target.Name, timing_factor}, null, 2))
                }
            } else {
                run_script(ns, 'simple/hack.js', hack_threads, next_grow.target, this_filename) 
                que.push(new QueItem(ns, next_grow.target, "h", hack_threads, next_grow.multiplier))
            }
            timing_mismatch_tracker /= 1.1
        }
        
        // Report on hack
        const next_hack = hack_que[0]
        if (next_hack && next_hack.finishTime - 50 < Date.now()) 
        {
            // Remove old item
            let index = que.findIndex(x=>x.finishTime === next_hack.finishTime && x.type === next_hack.type)
            if (que.splice(index, 1).length === 0){
                throw new Error('Couldn\'t find the index we were looking for')
            }
        }

    }
}