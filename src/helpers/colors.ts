export class Colors {
    static red: string = "\x1b[31m";
    static green: string = "\x1b[32m";
    static blue: string = "\x1b[34m";
    static cyan: string = "\x1b[36m";
    static magenta: string = "\x1b[35m";
    static yellow: string = "\x1b[33m";
    static black: string = "\x1b[30m";
    static white: string = "\x1b[37m";
    static def: string = "\x1b[0m";
    static orange: string = "\x1b[38;5;214m";

    /**@description returns a string with the color and continues it in default color after */
    static str(color: string, msg: string): string {
        return color + msg + this.def
    }

    static r(msg: string)   { return this.str(Colors.red, msg) }
    static g(msg: string)   { return this.str(Colors.green, msg) }
    static blu(msg: string) { return this.str(Colors.blue, msg) }
    static c(msg: string)   { return this.str(Colors.cyan, msg) }
    static m(msg: string)   { return this.str(Colors.magenta, msg) }
    static y(msg: string)   { return this.str(Colors.yellow, msg) }
    static bla(msg: string) { return this.str(Colors.black, msg) }
    static w(msg: string)   { return this.str(Colors.white, msg) }
    static o(msg: string)   { return this.str(Colors.orange, msg) }

    static highlight(msg: string) {return this.w(msg)}
    static good(msg: string) {return this.g(msg)}
    static bad(msg: string) {return this.r(msg)}
    static danger(msg: string = 'Danger: ') {return this.o(msg)}
    static warning(msg: string = 'Warning: ') {return this.y(msg)}
}
