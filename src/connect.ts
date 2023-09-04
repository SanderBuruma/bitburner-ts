import { log } from 'helpers/utils.js'
import { NS } from '@ns'

export async function main(ns: NS) {
    let target = ns.args[0]?.toString() ?? 'foodnstuff';
    let path = recur(ns, ['home'], target, 'home');
    if (!path) throw new Error('Couldn\'t find a path to ' + target)
    ns.tprint(path)
    for (let s of path) {
        ns.tprint(s)
        ns.singularity.connect(s)
    }
    
    if (path) {
        log(ns, "connect " + path.join("; connect "));
        
    } else {
        log(ns, "No path found to the target.");
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
