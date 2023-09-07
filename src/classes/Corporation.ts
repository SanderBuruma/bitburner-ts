import { NS } from '@ns'
import { log } from '/helpers/utils'

export class Corporation {
    public symbol: string
    public snapshot_size: number
    private ns: NS
    private snapshots: number[]

    constructor(ns: NS, symbol: string, snapshot_size = 20) {
       this.ns = ns 
       this.symbol = symbol
       this.snapshots = []
       this.snapshot_size = snapshot_size
    }

    public get totalStocks(): number {
        return this.ns.stock.getMaxShares(this.symbol)
    }
    public get bidPrice(): number {
        return this.ns.stock.getBidPrice(this.symbol)
    }
    public get askPrice(): number {
        return this.ns.stock.getAskPrice(this.symbol)
    }
    public get priceSpread(): number {
        return Math.round(1e3 * (this.askPrice - this.bidPrice) / this.askPrice) / 1e3
    }
    public get capitalization(): number {
        return this.askPrice * this.totalStocks
    }
    public get ownedStocks(): number {
        let position = this.ns.stock.getPosition(this.symbol)
        return position[0]
    }
    public get remainingStocks(): number {
        return this.totalStocks - this.ownedStocks
    }
    public get boughtPrice(): number {
        let position = this.ns.stock.getPosition(this.symbol)
        return position[1]
    }
    public get ourValue(): number {
        return this.ownedStocks * this.bidPrice
    }
    public get downTicks(): number {
        let count = 0
        for (let i = 1; i < this.snapshots.length; i++) {
            let snapshot_m_1 = this.snapshots[i-1]
            let snapshot_next = this.snapshots[i]
            if (snapshot_m_1 <= snapshot_next) continue
            count++
        }
        return count
    }
    public get upTicks(): number {
        let count = 0
        for (let i = 1; i < this.snapshots.length; i++) {
            let snapshot_m_1 = this.snapshots[i-1]
            let snapshot_next = this.snapshots[i]
            if (snapshot_m_1 >= snapshot_next) continue
            count++
        }
        return count
    }
    public get lastTickWasUp(): boolean {
        let last_tick = this.snapshots[this.snapshots.length - 1]
        let second_to_last_tick = this.snapshots[this.snapshots.length - 2]
        if (
            second_to_last_tick < last_tick
        ) {
            return true
        } else {
            return false
        }
    }
    public get curProfit(): number {
        return this.ownedStocks * (this.bidPrice - this.boughtPrice)
    }

    public update() {
        this.snapshots.push(this.askPrice)
        if (this.snapshots.length > this.snapshot_size) this.snapshots.shift()
    }
    public sell(amount = 0): boolean {
        amount = amount > 0 && amount % 1 === 0 ? amount : this.ownedStocks
        let boughtPrice = this.boughtPrice
        let bidPrice = this.bidPrice
        let result = this.ns.stock.sellStock(this.symbol, amount)
        if (result) {
            log(this.ns, `selling ${this.symbol} for ${this.ns.formatNumber(amount * bidPrice - 2e5)} and ${this.ns.formatNumber(amount * (bidPrice - boughtPrice))} profit`)
            return true
        }
        return false
    }
    public buy(amount = 0): boolean {
        amount = amount > 0 && amount % 1 === 0? amount : Math.floor(1e9/this.askPrice)
        if (this.remainingStocks < amount) amount = this.remainingStocks
        if (this.ns.stock.buyStock(this.symbol, amount > 0 ? amount : this.ownedStocks))
        {
            // log(this.ns, `bought ${this.symbol}, we now have ${this.ns.formatNumber(this.ownedStocks * this.bidPrice)} worth of ${this.symbol}`)
            return true
        }
        return false
    }
}