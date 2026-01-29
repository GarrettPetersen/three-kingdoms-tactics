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

    getCellAtDirectionDistance(r, q, dirIndex, dist) {
        if (dirIndex === -1 || dist <= 0) return null;
        let currentR = r;
        let currentQ = q;
        for (let i = 0; i < dist; i++) {
            const directions = this.getDirections(currentR);
            const d = directions[dirIndex];
            currentR += d.dr;
            currentQ += d.dq;
        }
        return this.getCell(currentR, currentQ);
    }

    getCellByCube(x, y, z) {
        const r = z;
        const q = x + Math.floor(r / 2);
        return this.getCell(r, q);
    }

    generate(params = {}) {
        const { 
            seed = Math.random(), 
            biome = 'central', // 'central', 'northern', 'northern_snowy', 'southern'
            layout = 'plain',  // 'plain', 'mountain_pass', 'lake_edge', 'river', 'foothills', 'city_gate'
            forestDensity = 0.15, 
            mountainDensity = 0.1,
            riverDensity = 0.05,
            houseDensity = 0.03
        } = params;

        this.biome = biome;
        this.params = params;

        let attempts = 0;
        let success = false;

        while (attempts < 5 && !success) {
            this.initialTerrainPass(layout);
            this.smoothElevation();
            
            // Post-process for ice in snowy biomes
            if (this.biome === 'northern_snowy') {
                this.applyIce();
            }

            this.placeProps(forestDensity, houseDensity);
            
            // Post-process to ensure all passable tiles are actually reachable
            this.ensureReachability();

            // General connectivity check to ensure the map isn't totally segmented
            success = this.checkGeneralConnectivity();
            attempts++;
        }
    }

    initialTerrainPass(layout) {
        // Reset
        for (let r = 0; r < this.height; r++) {
            for (let q = 0; q < this.width; q++) {
                const cell = this.grid[r][q];
                cell.terrain = this.getDefaultGrass();
                cell.level = 0;
                cell.elevation = 0;
                cell.impassable = false;
            }
        }

        if (layout === 'river') {
            this.generateRiver();
        } else if (layout === 'lake_edge') {
            this.generateLake();
        } else if (layout === 'mountain_pass') {
            this.generateMountainPass();
        } else if (layout === 'foothills') {
            this.generateFoothills();
        } else if (layout === 'city_gate') {
            this.generateCityGate();
        } else if (layout === 'siege_walls') {
            this.generateSiegeWalls();
        } else {
            this.generatePlains();
        }
    }

    generateSiegeWalls() {
        // Wall all the way up the left side
        const wallQ = 1;
        for (let r = 0; r < this.height; r++) {
            for (let q = 0; q < this.width; q++) {
                const cell = this.grid[r][q];
                if (q === wallQ) {
                    cell.terrain = 'wall_01';
                    cell.impassable = true;
                } else if (q < wallQ) {
                    // Behind the wall
                    cell.terrain = 'mud_01';
                } else {
                    // Outside the wall
                    cell.terrain = this.getDefaultGrass();
                }
            }
        }
    }

    generateCityGate() {
        // Wall line across middle (vertical)
        const wallQ = Math.floor(this.width / 2);
        const gapStart = Math.floor(this.height / 2) - 1;
        const gapSize = 3;

        for (let r = 0; r < this.height; r++) {
            for (let q = 0; q < this.width; q++) {
                const cell = this.grid[r][q];
                if (q === wallQ) {
                    if (r < gapStart || r >= gapStart + gapSize) {
                        cell.terrain = 'wall_01';
                        cell.impassable = true;
                    } else {
                        cell.terrain = 'mud_01'; // The road through the gate
                    }
                } else if (q > wallQ) {
                    // Inside city: mud streets and houses
                    cell.terrain = 'mud_01';
                    if (Math.random() < 0.15 && (q !== wallQ + 1 || (r < gapStart || r >= gapStart + gapSize))) {
                        cell.terrain = 'house_01';
                        cell.impassable = true;
                    }
                } else {
                    // Outside: grass
                    cell.terrain = this.getDefaultGrass();
                }
            }
        }
    }

    getDefaultGrass() {
        const grassVariants = ['grass_01', 'grass_02', 'grass_flowers'];
        if (this.biome === 'northern_snowy') return 'snow_01';
        if (this.biome === 'southern') grassVariants.push('grass_03');
        return grassVariants[Math.floor(Math.random() * grassVariants.length)];
    }

    generatePlains() {
        // Mostly flat, small random elevation bumps
        for (let i = 0; i < 5; i++) {
            this.createElevationBlob(Math.floor(Math.random() * this.height), Math.floor(Math.random() * this.width), 1, 2);
        }
    }

    generateFoothills() {
        // Rolling hills
        for (let i = 0; i < 8; i++) {
            const r = Math.floor(Math.random() * this.height);
            const q = Math.floor(Math.random() * this.width);
            this.createElevationBlob(r, q, Math.floor(Math.random() * 2) + 1, 3);
        }
    }

    generateMountainPass() {
        // Mountains on top and bottom or left and right
        const vertical = this.params.orientation === 'ns' || Math.random() > 0.5;
        if (vertical) {
            // North-South Pass: Mountain ranges on left and right sides
            for (let r = 0; r < this.height; r++) {
                // Left mountains
                this.setMountain(r, 0);
                this.setMountain(r, 1);
                if (Math.random() < 0.6) this.setMountain(r, 2);
                
                // Right mountains
                this.setMountain(r, this.width - 1);
                this.setMountain(r, this.width - 2);
                if (Math.random() < 0.6) this.setMountain(r, this.width - 3);

                // Ensure a scalable slope on each side
                if (r === Math.floor(this.height / 2)) {
                    // Clear the row to ensure the slope is reachable from the center
                    for (let q = 1; q < 4; q++) {
                        const cell = this.getCell(r, q);
                        if (cell) {
                            cell.terrain = this.getDefaultGrass();
                            cell.impassable = false;
                            cell.level = Math.max(0, 2 - (q)); // Smooth descent
                        }
                    }
                    for (let q = this.width - 2; q > this.width - 5; q--) {
                        const cell = this.getCell(r, q);
                        if (cell) {
                            cell.terrain = this.getDefaultGrass();
                            cell.impassable = false;
                            cell.level = Math.max(0, 2 - (this.width - 1 - q)); // Smooth descent
                        }
                    }

                    // Also make one mountain cell on each side climbable but high
                    const leftHigh = this.getCell(r, 0);
                    const rightHigh = this.getCell(r, this.width - 1);
                    if (leftHigh) { leftHigh.impassable = false; leftHigh.level = 2; }
                    if (rightHigh) { rightHigh.impassable = false; rightHigh.level = 2; }
                }
            }
        } else {
            // East-West Pass: Mountain ranges on top and bottom
            for (let q = 0; q < this.width; q++) {
                // Top mountains
                this.setMountain(0, q);
                this.setMountain(1, q);
                if (Math.random() < 0.6) this.setMountain(2, q);
                
                // Bottom mountains
                this.setMountain(this.height - 1, q);
                this.setMountain(this.height - 2, q);
                if (Math.random() < 0.6) this.setMountain(this.height - 3, q);

                // Ensure a scalable slope
                if (q === Math.floor(this.width / 2)) {
                    for (let r = 1; r < 4; r++) {
                        const cell = this.getCell(r, q);
                        if (cell) {
                            cell.terrain = this.getDefaultGrass();
                            cell.impassable = false;
                            cell.level = Math.max(0, 2 - r);
                        }
                    }
                    for (let r = this.height - 2; r > this.height - 5; r--) {
                        const cell = this.getCell(r, q);
                        if (cell) {
                            cell.terrain = this.getDefaultGrass();
                            cell.impassable = false;
                            cell.level = Math.max(0, 2 - (this.height - 1 - r));
                        }
                    }
                    
                    const topHigh = this.getCell(0, q);
                    const bottomHigh = this.getCell(this.height - 1, q);
                    if (topHigh) { topHigh.impassable = false; topHigh.level = 2; }
                    if (bottomHigh) { bottomHigh.impassable = false; bottomHigh.level = 2; }
                }
            }
        }
    }

    ensureReachability() {
        // Find a guaranteed reachable starting point (the center of the map/valley)
        const startR = Math.floor(this.height / 2);
        const startQ = Math.floor(this.width / 2);
        const startCell = this.getCell(startR, startQ);
        if (!startCell) return;
        
        // Force start cell to be passable
        startCell.impassable = false;
        startCell.level = 0;

        // BFS to find all reachable cells
        const reachable = new Set();
        const queue = [{ r: startR, q: startQ }];
        reachable.add(`${startR},${startQ}`);

        while (queue.length > 0) {
            const current = queue.shift();
            const neighbors = this.getNeighbors(current.r, current.q);
            for (const n of neighbors) {
                if (n.impassable) continue;
                
                // Climbing rule check
                const currentCell = this.getCell(current.r, current.q);
                if (Math.abs(n.level - currentCell.level) > 1) continue;

                const key = `${n.r},${n.q}`;
                if (!reachable.has(key)) {
                    reachable.add(key);
                    queue.push({ r: n.r, q: n.q });
                }
            }
        }

        // Now find any intended-to-be-passable cells that were NOT reached
        // and create a path to them by modifying terrain/levels
        for (let r = 0; r < this.height; r++) {
            for (let q = 0; q < this.width; q++) {
                const cell = this.grid[r][q];
                if (cell.impassable) continue;
                
                const key = `${r},${q}`;
                if (!reachable.has(key)) {
                    // This cell is isolated. Let's force a path to it.
                    // Simple approach: find nearest reachable neighbor and flatten path
                    let nearestReachable = null;
                    let minDist = Infinity;
                    
                    for (const reachKey of reachable) {
                        const [rr, rq] = reachKey.split(',').map(Number);
                        const dist = this.getDistance(r, q, rr, rq);
                        if (dist < minDist) {
                            minDist = dist;
                            nearestReachable = { r: rr, q: rq };
                        }
                    }

                    if (nearestReachable) {
                        // Create a "corridor" of passable, level-adjusted cells
                        const path = this.getLine(r, q, nearestReachable.r, nearestReachable.q);
                        let lastLevel = this.getCell(nearestReachable.r, nearestReachable.q).level;
                        
                        for (const step of path) {
                            const stepCell = this.getCell(step.r, step.q);
                            if (!stepCell) continue;
                            
                            stepCell.impassable = false;
                            // Smoothly adjust level if diff > 1
                            if (Math.abs(stepCell.level - lastLevel) > 1) {
                                stepCell.level = lastLevel > stepCell.level ? lastLevel - 1 : lastLevel + 1;
                            }
                            if (stepCell.terrain.includes('mountain') || stepCell.terrain.includes('wall')) {
                                stepCell.terrain = this.getDefaultGrass();
                            }
                            lastLevel = stepCell.level;
                            reachable.add(`${step.r},${step.q}`);
                        }
                    }
                }
            }
        }
    }

    getLine(r1, q1, r2, q2) {
        const line = [];
        const dist = this.getDistance(r1, q1, r2, q2);
        if (dist === 0) return line;

        const from = this.offsetToCube(r1, q1);
        const to = this.offsetToCube(r2, q2);

        for (let i = 0; i <= dist; i++) {
            const t = i / dist;
            const q = from.x + (to.x - from.x) * t;
            const r = from.z + (to.z - from.z) * t;
            const s = -q - r;

            // Round cube coordinates
            let rq = Math.round(q);
            let rr = Math.round(r);
            let rs = Math.round(s);

            const q_diff = Math.abs(rq - q);
            const r_diff = Math.abs(rr - r);
            const s_diff = Math.abs(rs - s);

            if (q_diff > r_diff && q_diff > s_diff) {
                rq = -rr - rs;
            } else if (r_diff > s_diff) {
                rr = -rq - rs;
            }

            const finalR = rr;
            const finalQ = rq + Math.floor(rr / 2);
            line.push({ r: finalR, q: finalQ });
        }
        return line;
    }

    generateRiver() {
        // A winding river from one side to another
        let r = Math.floor(Math.random() * this.height);
        let q = 0;
        while (q < this.width) {
            this.setWater(r, q, true); // Deep
            const neighbors = this.getNeighbors(r, q);
            neighbors.forEach(n => { if (Math.random() < 0.4) this.setWater(n.r, n.q, false); }); // Shallow banks
            
            q++;
            if (Math.random() < 0.3) r = Math.max(0, Math.min(this.height - 1, r + (Math.random() > 0.5 ? 1 : -1)));
        }
    }

    generateLake() {
        // Large body of water on one edge
        const edge = Math.floor(Math.random() * 4); // 0: Top, 1: Right, 2: Bottom, 3: Left
        for (let r = 0; r < this.height; r++) {
            for (let q = 0; q < this.width; q++) {
                let dist = 0;
                if (edge === 0) dist = r;
                if (edge === 1) dist = this.width - 1 - q;
                if (edge === 2) dist = this.height - 1 - r;
                if (edge === 3) dist = q;

                if (dist < 3) {
                    this.setWater(r, q, dist < 2);
                }
            }
        }
    }

    setMountain(r, q) {
        const cell = this.getCell(r, q);
        if (!cell) return;
        if (this.biome === 'northern_snowy' && Math.random() < 0.6) {
            cell.terrain = Math.random() > 0.5 ? 'mountain_snowy_01' : 'mountain_snowy_02';
        } else {
            cell.terrain = 'mountain_stone_01';
        }
        cell.level = 2;
        cell.impassable = true;
    }

    setWater(r, q, deep = true) {
        const cell = this.getCell(r, q);
        if (!cell) return;
        cell.terrain = deep ? 'water_deep_01' : 'water_shallow_01';
        cell.level = 0;
        cell.impassable = deep;
    }

    createElevationBlob(centerR, centerQ, maxLevel, radius) {
        for (let r = centerR - radius; r <= centerR + radius; r++) {
            for (let q = centerQ - radius; q <= centerQ + radius; q++) {
                const cell = this.getCell(r, q);
                if (!cell) continue;
                const dist = this.getDistance(centerR, centerQ, r, q);
                if (dist <= radius) {
                    const level = Math.max(cell.level, Math.floor(maxLevel * (1 - dist / radius)));
                    cell.level = level;
                }
            }
        }
    }

    smoothElevation() {
        // Ensure no level diff > 1 between passable neighbors unless it's a cliff intended
        for (let r = 0; r < this.height; r++) {
            for (let q = 0; q < this.width; q++) {
                const cell = this.grid[r][q];
                cell.elevation = cell.level * 6;
            }
        }
    }

    applyIce() {
        for (let r = 0; r < this.height; r++) {
            for (let q = 0; q < this.width; q++) {
                const cell = this.grid[r][q];
                if (cell.terrain === 'water_shallow_01') {
                    cell.terrain = 'ice_01';
                    cell.impassable = false;
                } else if (cell.terrain === 'water_deep_01') {
                    // Deep water near ice also freezes
                    const neighbors = this.getNeighbors(r, q);
                    const nearShallow = neighbors.some(n => n.terrain === 'water_shallow_01' || n.terrain === 'ice_01');
                    if (nearShallow && Math.random() < 0.7) {
                        cell.terrain = 'ice_01';
                        cell.impassable = false;
                    }
                }
            }
        }
    }

    placeProps(forestDensity, houseDensity) {
        const biome = this.biome;
        for (let r = 0; r < this.height; r++) {
            for (let q = 0; q < this.width; q++) {
                const cell = this.grid[r][q];
                if (cell.impassable || cell.terrain.includes('water')) continue;

                const rand = Math.random();
                if (rand < houseDensity) {
                    cell.terrain = 'house_01';
                    cell.impassable = true;
                } else if (rand < houseDensity + forestDensity) {
                    let variants = ['forest_deciduous_01', 'forest_deciduous_02'];
                    if (biome === 'northern') variants = ['pine_forest_01', 'forest_deciduous_01'];
                    else if (biome === 'northern_snowy') variants = ['pine_forest_snow_01', 'pine_forest_01'];
                    else if (biome === 'southern') variants = ['jungle_dense_01', 'jungle_dense_02', 'jungle_palm_01', 'jungle_palm_02'];
                    
                    cell.terrain = variants[Math.floor(Math.random() * variants.length)];
                }
            }
        }
    }

    checkGeneralConnectivity() {
        // Find a passable tile to start
        let start = null;
        for (let r = 0; r < this.height && !start; r++) {
            for (let q = 0; q < this.width && !start; q++) {
                if (!this.grid[r][q].impassable) start = this.grid[r][q];
            }
        }
        if (!start) return false;

        const reachable = this.getReachableData(start.r, start.q, 999);
        let passableCount = 0;
        for (let r = 0; r < this.height; r++) {
            for (let q = 0; q < this.width; q++) {
                if (!this.grid[r][q].impassable) passableCount++;
            }
        }

        // If more than 60% of passable tiles are connected, it's probably a good map
        return reachable.size >= passableCount * 0.6;
    }

    // Dijkstra's for reachable tiles, returning a map of { "r,q": { cost, parent } }
    getReachableData(startR, startQ, range, movingUnit = null) {
        const startCell = this.getCell(startR, startQ);
        if (!startCell) return new Map();

        const data = new Map(); // key: "r,q", value: { cost, parent: "r,q" }
        const queue = [{ r: startR, q: startQ, cost: 0, level: startCell.level }];
        data.set(`${startR},${startQ}`, { cost: 0, parent: null });

        while (queue.length > 0) {
            // Sort by cost for Dijkstra
            queue.sort((a, b) => a.cost - b.cost);
            const current = queue.shift();

            if (current.cost >= range) continue;

            const neighbors = this.getNeighbors(current.r, current.q);
            neighbors.forEach(n => {
                if (n.impassable) return;

                // Friendly units can be passed through, but enemy units block entirely.
                if (n.unit && n.unit !== movingUnit) {
                    const movingFaction = movingUnit ? movingUnit.faction : null;
                    const neighborFaction = n.unit.faction;

                    let areFriendly = false;
                    if (movingFaction === 'player' || movingFaction === 'allied') {
                        if (neighborFaction === 'player' || neighborFaction === 'allied') areFriendly = true;
                    } else if (movingFaction === 'enemy') {
                        if (neighborFaction === 'enemy') areFriendly = true;
                    }

                    if (!areFriendly) return;
                }

                // Climbing rule: max 1 level difference
                const levelDiff = Math.abs(n.level - current.level);
                if (levelDiff > 1) return;

                // Difficult terrain costs 2, normal costs 1
                const isDifficult = n.terrain.includes('forest') || n.terrain.includes('water_shallow');
                const moveCost = isDifficult ? 2 : 1;
                const newCost = current.cost + moveCost;

                if (newCost > range) return;

                const key = `${n.r},${n.q}`;
                if (!data.has(key) || data.get(key).cost > newCost) {
                    data.set(key, { cost: newCost, parent: `${current.r},${current.q}` });
                    queue.push({ r: n.r, q: n.q, cost: newCost, level: n.level });
                }
            });
        }

        return data;
    }

    getPath(startR, startQ, targetR, targetQ, range, movingUnit = null) {
        const data = this.getReachableData(startR, startQ, range, movingUnit);
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

