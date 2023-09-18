export class Colors {
    static Red: string = "\x1b[31m";
    static Green: string = "\x1b[32m";
    static Blue: string = "\x1b[34m";
    static Cyan: string = "\x1b[36m";
    static Magenta: string = "\x1b[35m";
    static Yellow: string = "\x1b[33m";
    static Black: string = "\x1b[30m";
    static White: string = "\x1b[37m";
    static Default: string = "\x1b[0m";
    static Orange: string = "\x1b[38;5;214m";

    /**@description returns a string with the color and continues it in default color after */
    static str(color: string, msg: string|number): string {
        return color + msg + this.Default
    }

    static R(msg: string|number)   { return this.str(Colors.Red, msg) }
    static G(msg: string|number)   { return this.str(Colors.Green, msg) }
    static Blu(msg: string|number) { return this.str(Colors.Blue, msg) }
    static C(msg: string|number)   { return this.str(Colors.Cyan, msg) }
    static M(msg: string|number)   { return this.str(Colors.Magenta, msg) }
    static Y(msg: string|number)   { return this.str(Colors.Yellow, msg) }
    static Bla(msg: string|number) { return this.str(Colors.Black, msg) }
    static W(msg: string|number)   { return this.str(Colors.White, msg) }
    static O(msg: string|number)   { return this.str(Colors.Orange, msg) }

    static Highlight(msg: string|number) {return this.W(msg)}
    static Good(msg: string|number =    'Success: ') {return this.G(msg)}
    static Bad(msg: string|number =     'Error: ') {return this.R(msg)}
    static Danger(msg: string|number =  'Danger: ') {return this.O(msg)}
    static Warning(msg: string|number = 'Warning: ') {return this.Y(msg)}
}
