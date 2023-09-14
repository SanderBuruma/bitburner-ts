import { NS } from '@ns'
import { log } from 'helpers/utils'
import { Colors } from 'helpers/colors'

export class Corporation {
    public Symbol: string
    public SnapshopSize: number
    private ns: NS
    private Snapshots: number[]

    constructor(ns: NS, symbol: string, snapshot_size = 20) {
       this.ns = ns 
       this.Symbol = symbol
       this.Snapshots = []
       this.SnapshopSize = snapshot_size
    }

    public get TotalStocks(): number { return this.ns.stock.getMaxShares(this.Symbol) }
    public get BidPrice(): number {
        return this.ns.stock.getBidPrice(this.Symbol)
    }
    public get AskPrice(): number {
        return this.ns.stock.getAskPrice(this.Symbol)
    }
    public get Spread(): number {
        return Math.round(1e3 * (this.AskPrice - this.BidPrice) / this.AskPrice) / 1e3
    }
    public get Capitalization(): number {
        return this.AskPrice * this.TotalStocks
    }
    public get OwnedStocks(): number {
        let position = this.ns.stock.getPosition(this.Symbol)
        return position[0]
    }
    public get RemainingStocks(): number {
        return this.TotalStocks - this.OwnedStocks
    }
    public get BoughtPrice(): number {
        let position = this.ns.stock.getPosition(this.Symbol)
        return position[1]
    }
    public get OurValue(): number {
        return this.OwnedStocks * this.BidPrice
    }
    public get DownTicks(): number {
        let count = 0
        for (let i = 1; i < this.Snapshots.length; i++) {
            let snapshot_m_1 = this.Snapshots[i-1]
            let snapshot_next = this.Snapshots[i]
            if (snapshot_m_1 <= snapshot_next) continue
            count++
        }
        return count
    }
    public get UpTicks(): number {
        let count = 0
        for (let i = 1; i < this.Snapshots.length; i++) {
            let snapshot_m_1 = this.Snapshots[i-1]
            let snapshot_next = this.Snapshots[i]
            if (snapshot_m_1 >= snapshot_next) continue
            count++
        }
        return count
    }
    public get LastTickWasUp(): boolean {
        let last_tick = this.Snapshots[this.Snapshots.length - 1]
        let second_to_last_tick = this.Snapshots[this.Snapshots.length - 2]
        if (
            second_to_last_tick < last_tick
        ) {
            return true
        } else {
            return false
        }
    }
    public get CurrentProfit(): number {
        return this.OwnedStocks * (this.BidPrice - this.BoughtPrice)
    }

    public Update() {
        this.Snapshots.push(this.AskPrice)
        if (this.Snapshots.length > this.SnapshopSize) this.Snapshots.shift()
    }
    public Sell(amount = 0): boolean {
        amount = amount > 0 && amount % 1 === 0 ? amount : this.OwnedStocks
        const boughtPrice = this.BoughtPrice
        const bidPrice = this.BidPrice
        const profit = (this.BidPrice - this.BoughtPrice) * amount
        let profit_colored: string
        if (profit > 0) {
            profit_colored = Colors.Good(this.ns.formatNumber(profit))
        } else {
            profit_colored = Colors.Bad(this.ns.formatNumber(profit))
        }
        let result = this.ns.stock.sellStock(this.Symbol, amount)
        let color_buy_price = Colors.Highlight(this.ns.formatNumber(amount * bidPrice - 2e5))
        if (result) {
            log(this.ns, `selling ${Colors.Highlight(this.Symbol.padEnd(5, '-'))} for ${color_buy_price} and ${profit_colored} profit`)
            return true
        }
        return false
    }
    public Buy(amount = 0): boolean {
        amount = amount > 0 && amount % 1 === 0? amount : Math.floor(1e9/this.AskPrice)
        if (this.RemainingStocks < amount) amount = this.RemainingStocks
        if (this.ns.stock.buyStock(this.Symbol, amount > 0 ? amount : this.OwnedStocks))
        {
            return true
        }
        return false
    }
}