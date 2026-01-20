export class TacticsMap {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.grid = [];
        this.initialize();
    }

    initialize() {
        this.grid = [];
        for (let r = 0; r < this.height; r++) {
            const row = [];
            for (let q = 0; q < this.width; q++) {
                row.push({
                    r, q,
                    terrain: 'grass_01',
                    level: 0, // discrete level (0, 1, 2...)
                    elevation: 0, // pixels (level * 6)
                    unit: null,
                    impassable: false
                });
            }
            this.grid.push(row);
        }
    }

    getCell(r, q) {
        if (r < 0 || r >= this.height || q < 0 || q >= this.width) return null;
        return this.grid[r][q];
    }

    // Convert offset to cube coordinates
    // Using Math.floor(r/2) ensures it works correctly for both positive and negative rows
    offsetToCube(r, q) {
        const q_cube = q - Math.floor(r / 2);
        const r_cube = r;
        const s_cube = -q_cube - r_cube;
        // Map to x, y, z for dot product calculations (x=q, y=s, z=r)
        return { x: q_cube, y: s_cube, z: r_cube };
    }

    getDistance(r1, q1, r2, q2) {
        const a = this.offsetToCube(r1, q1);
        const b = this.offsetToCube(r2, q2);
        return (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.z - b.z)) / 2;
    }

    // Hex neighbor logic for "pointy-top" hexes with odd-row offset (Odd rows shifted right)
    // We define 6 consistent physical directions: 
    // 0: UR (Up-Right), 1: R (Right), 2: DR (Down-Right), 3: DL (Down-Left), 4: L (Left), 5: UL (Up-Left)
    getDirections(r) {
        const isOdd = Math.abs(r) % 2 === 1;
        return isOdd ? [
            { dr: -1, dq: 1 },  // 0: UR
            { dr: 0, dq: 1 },   // 1: R
            { dr: 1, dq: 1 },   // 2: DR
            { dr: 1, dq: 0 },   // 3: DL
            { dr: 0, dq: -1 },  // 4: L
            { dr: -1, dq: 0 }   // 5: UL
        ] : [
            { dr: -1, dq: 0 },  // 0: UR
            { dr: 0, dq: 1 },   // 1: R
            { dr: 1, dq: 0 },   // 2: DR
            { dr: 1, dq: -1 },  // 3: DL
            { dr: 0, dq: -1 },  // 4: L
            { dr: -1, dq: -1 }  // 5: UL
        ];
    }

    getNeighbors(r, q) {
        const neighbors = [];
        const directions = this.getDirections(r);

        directions.forEach(d => {
            const neighbor = this.getCell(r + d.dr, q + d.dq);
            if (neighbor) neighbors.push(neighbor);
        });

        return neighbors;
    }

    getDirectionIndex(fromR, fromQ, toR, toQ) {
        const directions = this.getDirections(fromR);
        // Check distance 1 neighbors
        for (let i = 0; i < directions.length; i++) {
            if (fromR + directions[i].dr === toR && fromQ + directions[i].dq === toQ) {
                return i;
            }
        }
        // Check distance 2 (axial)
        for (let i = 0; i < directions.length; i++) {
            const d1 = directions[i];
            const r1 = fromR + d1.dr;
            const q1 = fromQ + d1.dq;
            const directions2 = this.getDirections(r1);
            const d2 = directions2[i]; // Use same index for consistent physical direction
            if (r1 + d2.dr === toR && q1 + d2.dq === toQ) {
                return i;
            }
        }
        
        // Non-axial distance 2 or further: find closest physical direction
        const fromPos = this.offsetToCube(fromR, fromQ);
        const toPos = this.offsetToCube(toR, toQ);
        const dx = toPos.x - fromPos.x;
        const dy = toPos.y - fromPos.y;
        const dz = toPos.z - fromPos.z;

        let bestDir = -1;
        let maxDot = -Infinity;

        // Correct cube unit vectors for each direction index (0-5)
        // Order: UR, R, DR, DL, L, UL
        const cubeDirs = [
            { x: 1, y: 0, z: -1 },  // 0: UR
            { x: 1, y: -1, z: 0 },  // 1: R
            { x: 0, y: -1, z: 1 },  // 2: DR
            { x: -1, y: 0, z: 1 },  // 3: DL
            { x: -1, y: 1, z: 0 },  // 4: L
            { x: 0, y: 1, z: -1 }   // 5: UL
        ];

        for (let i = 0; i < cubeDirs.length; i++) {
            const dot = dx * cubeDirs[i].x + dy * cubeDirs[i].y + dz * cubeDirs[i].z;
            // Add a tiny bit of jitter to avoid perfect ties preferring index 0
            const score = dot;
            if (score > maxDot) {
                maxDot = score;
                bestDir = i;
            }
        }
        return bestDir;
    }

    getNeighborInDirection(r, q, dirIndex) {
        if (dirIndex === -1) return null;
        const directions = this.getDirections(r);
        const d = directions[dirIndex];
        return this.getCell(r + d.dr, q + d.dq);
    }

    generate(params = {}) {
        const { 
            seed = Math.random(), 
            forestDensity = 0.15, 
            mountainDensity = 0.1,
            riverDensity = 0.05,
            houseDensity = 0.03
        } = params;

        // Simple procedural generation
        for (let r = 0; r < this.height; r++) {
            for (let q = 0; q < this.width; q++) {
                const cell = this.grid[r][q];
                const rand = Math.random();

                if (rand < mountainDensity) {
                    cell.terrain = 'mountain_stone_01';
                    cell.level = 2 + Math.floor(Math.random() * 2);
                    cell.impassable = true; // Mountains are walls
                } else if (rand < mountainDensity + forestDensity) {
                    const variants = ['forest_01', 'forest_02', 'forest_03'];
                    cell.terrain = variants[Math.floor(Math.random() * variants.length)];
                    cell.level = 1;
                } else if (rand < mountainDensity + forestDensity + riverDensity) {
                    // Decide between shallow and deep water
                    if (Math.random() < 0.4) {
                        cell.terrain = 'water_shallow_01';
                        cell.level = 0;
                        cell.impassable = false;
                    } else {
                        cell.terrain = 'water_deep_01';
                        cell.level = 0;
                        cell.impassable = true;
                    }
                } else if (rand < mountainDensity + forestDensity + riverDensity + houseDensity) {
                    cell.terrain = 'house_01';
                    cell.level = 0;
                    cell.impassable = true;
                } else {
                    const grassVariants = ['grass_01', 'grass_02', 'grass_flowers'];
                    cell.terrain = grassVariants[Math.floor(Math.random() * grassVariants.length)];
                    cell.level = 0;
                }
                
                cell.elevation = cell.level * 6;
            }
        }
    }

    // Dijkstra's for reachable tiles, returning a map of { "r,q": { cost, parent } }
    getReachableData(startR, startQ, range) {
        const startCell = this.getCell(startR, startQ);
        if (!startCell) return new Map();

        const data = new Map(); // key: "r,q", value: { cost, parent: "r,q" }
        const queue = [{ r: startR, q: startQ, cost: 0, level: startCell.level }];
        data.set(`${startR},${startQ}`, { cost: 0, parent: null });

        while (queue.length > 0) {
            // Sort by cost for Dijkstra (though uniform cost here makes it BFS-like)
            queue.sort((a, b) => a.cost - b.cost);
            const current = queue.shift();

            if (current.cost >= range) continue;

            const neighbors = this.getNeighbors(current.r, current.q);
            neighbors.forEach(n => {
                if (n.impassable || (n.unit && (n.r !== startR || n.q !== startQ))) return;

                // Climbing rule: max 1 level difference
                const levelDiff = Math.abs(n.level - current.level);
                if (levelDiff > 1) return;

                const newCost = current.cost + 1;
                const key = `${n.r},${n.q}`;

                if (!data.has(key) || data.get(key).cost > newCost) {
                    data.set(key, { cost: newCost, parent: `${current.r},${current.q}` });
                    queue.push({ r: n.r, q: n.q, cost: newCost, level: n.level });
                }
            });
        }

        return data;
    }

    getPath(startR, startQ, targetR, targetQ, range) {
        const data = this.getReachableData(startR, startQ, range);
        const targetKey = `${targetR},${targetQ}`;
        
        if (!data.has(targetKey)) return null;

        const path = [];
        let current = targetKey;
        while (current) {
            const [r, q] = current.split(',').map(Number);
            path.unshift({ r, q });
            current = data.get(current).parent;
        }
        return path;
    }
}

