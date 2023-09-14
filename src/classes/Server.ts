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
    public get AtMinSec(): boolean { return this._minSec === this.Sec }

    public get PortsRequirement() { return this._portsReq }
    public get HackingRequirement() { return this._hackingReq }
    public get Rooted() { return this.ns.hasRootAccess(this.Name) }
    public get HackingChance() { return this.ns.hackAnalyzeChance(this.Name )}

    public get HackingFractionPerExecution() { return this.ns.hackAnalyze(this.Name) }
    public get GrowsPerHack() { return this.ns.growthAnalyze(this.Name, 1/(1-this.HackingFractionPerExecution))}
    public get WeakensPerGrowHack() { return this.GrowsPerHack/.8/12.5 + 4/25}
    public get HackThreadsForHalf() { return .5 / this.HackingFractionPerExecution}
    public get GrowThreadsForDouble() { return this.ns.growthAnalyze(this.Name, 2)}

    public get HackTime(): number { return this.ns.getHackTime(this.Name) }
    public get GrowTime(): number { return this.ns.getGrowTime(this.Name) }
    public get WeakenTime(): number { return this.ns.getWeakenTime(this.Name) }
   
    public get RunningScripts() { return this.ns.ps(this.Name)}

    public get StaticScore() { return this.MaxMoney * this.GrowthParam / this.MinSec / (this.HackingRequirement + 100)}
}