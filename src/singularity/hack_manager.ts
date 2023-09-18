import { NS } from '@ns'
import { hack_grow_weaken_ratios, log, set_log_settings } from '/helpers/utils'
import { Colors } from '/helpers/colors'
import { run_script } from '/helpers/servers'
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
    set_log_settings(ns, true, false)

    let que: QueItem[] = []
    if (ns.args.length !== 3) log(ns, Colors.Warning()+"We need 3 parameters, target, timingFactor and multiplier. Selecting defaults instead for the missing parameters")
    let target = ns.args[0]?.toString() ?? "foodnstuff"
    let timing_factor = parseFloat(ns.args[1]?.toString() ?? "1.54")
    let multiplier = parseFloat(ns.args[2]?.toString() ?? "1.20")
    const timing_lenience = 150

    let nextWeaken = Date.now()
    while (true) {
        // Wait
        await ns.sleep(1)
        let last_moment = Date.now()

        // Prepare que information and filter out old que items
        que = que.filter(i=>i.finishTime > Date.now()).sort((a,b)=>a.finishTime - b.finishTime)
        const weaken_que = que.filter(i=>i.type === "w")
        const grow_que = que.filter(i=>i.type === "g")
        const hack_que = que.filter(i=>i.type === "h")

        // If we're due to launch another weaken
        if (nextWeaken <= Date.now()) 
        {
            let hgw_rs = hack_grow_weaken_ratios(ns, target, multiplier)
            let weaken_threads = Math.ceil(hgw_rs.hack_threads / 16 + hgw_rs.grow_threads / 8)
            let server = new Server(ns, target)
            if (!server.AtMinSec) {
                weaken_threads = Math.ceil(weaken_threads + (server.Sec-server.MinSec)/.05)
            }
            nextWeaken = Math.floor(Date.now() + ns.getWeakenTime(target) / timing_factor)
            run_script(ns, 'simple/weaken.js', weaken_threads, target) 
            if (server.AtMinSec) que.push(new QueItem(ns, target, "w", weaken_threads, multiplier))
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
            run_script(ns, 'simple/grow.js', grow_threads, next_weaken.target) 
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
                ns.printf(JSON.stringify(i, null, 2))
            } else {
                run_script(ns, 'simple/hack.js', hack_threads, next_grow.target) 
                que.push(new QueItem(ns, next_grow.target, "h", hack_threads, next_grow.multiplier))
            }
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

        // ns.clearLog()
        // if (Date.now() - last_moment < timing_lenience / 4) 
        // ns.print('ms passed: ' + Colors.Highlight(Date.now() - last_moment))

        // Update target
        // Update timingFactor if necessary
        // Update multiplier
    }
}