import { NS } from '@ns'

export async function main(ns: NS) {
    connect_directly(ns, ns.args[0]?.toString() ?? 'foodnstuff')
}
export function connect_directly(ns: NS, target: string) {
    let path = recur(ns, ['home'], target, 'home');
    if (!path) throw new Error('Couldn\'t find a path to ' + target)
    for (let s of path) {
        ns.singularity.connect(s)
    }
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
