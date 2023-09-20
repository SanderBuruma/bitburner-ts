import { NS } from '@ns'
import { exe_command } from '/doc/getdoc';

export async function main(ns: NS) {
    connect_directly(ns, ns.args[0]?.toString() ?? 'CSEC')
}
export async function connect_directly(ns: NS, target: string) {
    let path = recur(ns, ['home'], target, 'home');
    let command = ('connect ' + path?.join('; connect '))
    ns.tprintf(command)
    if (!path) throw new Error('Couldn\'t find a path to ' + target)
    await exe_command(ns, eval('document'), command)
}

function recur(ns: NS, visited: string[], target: string, current: string): string[] | null {
    // If the current server is the target, return an array with just the target
    if (current === target) {
        return [current];
    }

    // Mark the current server as visited
    visited.push(current);

    // Get the list of servers connected to the current server
    const connectedServers = ns.scan(current);

    // Loop through each connected server
    for (let server of connectedServers) {
        if (!visited.includes(server)) {  // If the server hasn't been visited yet
            const pathFromHere = recur(ns, visited, target, server);  // Recursive call

            // If a path is found from the current server
            if (pathFromHere) {
                return [current, ...pathFromHere];  // Add the current server to the path and return
            }
        }
    }

    return null;  // No path found from the current server
}
