import { NS } from '@ns'

export class Server {
    private _name: string
    private ns: NS
    private _maxRam: number
    private _maxMoney: number
    private _minSec: number
    private _growthParam: number
    private _hackingReq: number
    private _portsReq: number

    constructor(ns: NS, name: string) {
        this.ns = ns
        this._name = name
        this._maxRam = ns.getServerMaxRam(name)
        this._maxMoney = ns.getServerMaxMoney(name)
        this._minSec = ns.getServerMinSecurityLevel(name)
        this._growthParam = ns.getServerGrowth(name)
        this._portsReq = this.ns.getServerNumPortsRequired(this.Name)
        this._hackingReq = this.ns.getServerRequiredHackingLevel(this.Name)
    }

    public toString() { return this.Name }
    public HasFile(file: string) { return this.ns.fileExists(file, this.Name)}

    public get Name() { return this._name }

    public get AvailableRam() { return this._maxRam - this.UsedRam }
    public get UsedRam() { return this.ns.getServerUsedRam(this.Name) }
    public get MaxRam() { return this._maxRam }

    public get Files() { return this.ns.ls(this.Name) }

    public get Money() { return this.ns.getServerMoneyAvailable(this.Name) }
    public get MaxMoney() { return this._maxMoney }
    public get GrowthParam() { return this._growthParam }

    public get Sec() { return this.ns.getServerSecurityLevel(this.Name) }
    public get MinSec() { return this._minSec }
    public get AtMinSec(): boolean { return this._minSec * 1.2 >= this.Sec }

    public get PortsRequirement() { return this._portsReq }
    public get HackingRequirement() { return this._hackingReq }
    public get Rooted() { return this.ns.hasRootAccess(this.Name) }

    public get HackingFractionPerExecution() { return this.ns.hackAnalyze(this.Name) }
    public get GrowsPerHackForDouble() { return Math.max(0.5, this.ns.growthAnalyze(this.Name, 2))} // the minimum value of .5 ensures that there won't be insane numbers of hack threads
    public get WeakensPerGrowHackForDouble() { return this.GrowsPerHackForDouble/.8/12.5 + 4/25}
    public get HackThreadsForHalf() { return .5 / this.HackingFractionPerExecution}
    /** how much ram one cycle of HWGW will take on average over the duraton of 1 weaken timing */
    public get HWGWCycleRamForDouble() { return 1.7 * (
        this.GrowsPerHackForDouble * .8 + 
        this.WeakensPerGrowHackForDouble + 
        this.HackThreadsForHalf/4
    )}

    public get HackTime(): number { return this.ns.getHackTime(this.Name) }
    public get GrowTime(): number { return this.HackTime * 3.2 }
    public get WeakenTime(): number { return this.HackTime * 4 }
   
    public get RunningScripts() { return this.ns.ps(this.Name)}

    /** From source code */
    public get HackingChance(): number {
        const hackDifficulty = this.Sec ?? 100;
        const requiredHackingSkill = this.HackingRequirement ?? 1e9;
        // Unrooted or unhackable server
        if (!this.Rooted || hackDifficulty >= 100) return 0;
        const hackFactor = 1.75;
        const difficultyMult = (100 - hackDifficulty) / 100;
        const skillMult = hackFactor * this.ns.getPlayer().skills.hacking;
        const skillChance = (skillMult - requiredHackingSkill) / skillMult;
        const chance =
            skillChance *
            difficultyMult *
            this.ns.getPlayer().mults.hacking_chance
            * 1 + (Math.pow(this.ns.getPlayer().skills.intelligence, 0.8)) / 600;
        return Math.min(1, Math.max(chance, 0));
    }


    /** The score when this server is the target of a continuous hgw script */
    public get StaticScore() { 
        if (['n00dles', 'foodnstuff'].includes(this.Name)) return 0
        return this.MaxMoney * this.GrowthParam / 50 * (100-this.MinSec) / (this.HackingRequirement + 100)
    }
    /** The score when this server is the target of an early game hacking script, which does not use grow */
    public get NoGrowScore() { 
        if (['n00dles'].includes(this.Name)) return 0
        return this.Money * (100-this.Sec) * this.HackingChance / (this.HackingRequirement + 100)
    }
}