export class TacticsMap {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.elevationStep = 3; // Visual height difference between levels
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
                    elevation: 0, // pixels (level * elevationStep)
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
    getDirections(r) {
        const isOdd = Math.abs(r) % 2 === 1;
        return isOdd ? [
            { dr: -1, dq: 1 },  // 0: NE
            { dr: 0, dq: 1 },   // 1: E
            { dr: 1, dq: 1 },   // 2: SE
            { dr: 1, dq: 0 },   // 3: SW
            { dr: 0, dq: -1 },  // 4: W
            { dr: -1, dq: 0 }   // 5: NW
        ] : [
            { dr: -1, dq: 0 },  // 0: NE
            { dr: 0, dq: 1 },   // 1: E
            { dr: 1, dq: 0 },   // 2: SE
            { dr: 1, dq: -1 },  // 3: SW
            { dr: 0, dq: -1 },  // 4: W
            { dr: -1, dq: -1 }  // 5: NW
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

    getEdgeStatus(r, q) {
        const cell = this.getCell(r, q);
        if (!cell) return {};
        
        const status = {};
        const directions = this.getDirections(r);
        const labels = ['NE', 'E', 'SE', 'SW', 'W', 'NW'];
        
        directions.forEach((d, i) => {
            const n = this.getCell(r + d.dr, q + d.dq);
            const label = labels[i];
            // Edge is impassable if: neighbor exists AND is impassable (excluding deep water), 
            // OR height difference is too great to climb (> 1).
            // We ignore map edges (where n is null) as players know they can't leave.
            if (n) {
                const isDeepWater = n.terrain && n.terrain.includes('water_deep');
                if ((n.impassable && !isDeepWater) || Math.abs((n.level || 0) - (cell.level || 0)) > 1) {
                    status[label] = true;
                } else {
                    status[label] = false;
                }
            } else {
                status[label] = false; // Ignore map edges
            }
        });
        return status;
    }

    getSlopeInfo(r, q) {
        const cell = this.getCell(r, q);
        if (!cell) return {};
        
        // Never create slopes for buildings/walls - they should always be cliffs
        const isBuilding = cell.terrain && (cell.terrain.includes('house') || cell.terrain.includes('wall') || cell.terrain.includes('tent'));
        if (isBuilding) return {};
        
        const slopes = {};
        const directions = this.getDirections(r);
        const labels = ['NE', 'E', 'SE', 'SW', 'W', 'NW'];
        
        directions.forEach((d, i) => {
            const n = this.getCell(r + d.dr, q + d.dq);
            const label = labels[i];
            if (n) {
                // Also check if neighbor is a building - don't create slopes to/from buildings
                const neighborIsBuilding = n.terrain && (n.terrain.includes('house') || n.terrain.includes('wall') || n.terrain.includes('tent'));
                if (neighborIsBuilding) return;
                
                const levelDiff = (n.level || 0) - (cell.level || 0);
                // Slope exists if height difference is exactly 1 (walkable)
                // Positive = neighbor is higher (uphill slope)
                // Negative = neighbor is lower (downhill slope)
                if (Math.abs(levelDiff) === 1) {
                    slopes[label] = levelDiff;
                }
            }
        });
        return slopes;
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
            houseDensity = 0.03,
            mirror = false,
            palette = null
        } = params;

        this.biome = palette || biome;
        this.params = params;

        let attempts = 0;
        let success = false;

        while (attempts < 5 && !success) {
            this.initialTerrainPass(layout);
            
            if (mirror) {
                this.mirrorGrid();
            }
            
            // Post-process for ice in snowy biomes
            if (this.biome === 'northern_snowy') {
                this.applyIce();
            }

            this.placeProps(forestDensity, houseDensity);
            
            // First smooth out any single-tile elevation islands
            this.smoothLevels();
            
            // For river/lake layouts, ensure no cliffs (max 1 level difference between neighbors)
            if (layout === 'river' || layout === 'lake_edge') {
                this.ensureGradualSlopes();
            }
            
            // Then ensure everything is reachable based on the smoothed levels
            this.ensureReachability();
            
            // Finally set the visual elevation properties
            this.smoothElevation();
            
            // Add terrain variety at elevation changes to make cliffs more visually clear
            this.varyCliffTerrain();
            
            // General connectivity check to ensure the map isn't totally segmented
            success = this.checkGeneralConnectivity();
            attempts++;
        }

        if (!success) {
            console.warn(`Map generation failed to find fully connected passable area for layout: ${layout}`);
        }
    }

    mirrorGrid() {
        for (let r = 0; r < this.height; r++) {
            this.grid[r].reverse();
            for (let q = 0; q < this.width; q++) {
                this.grid[r][q].q = q;
            }
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
        } else if (layout === 'road') {
            this.generateRoad();
        } else if (layout === 'army_camp') {
            this.generateArmyCamp();
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

    generateRoad() {
        // Grassy field with a mud road running through it
        // Road goes roughly from left to right with some gentle curves
        
        // First, fill with grass (already done by default)
        
        // Create a winding road path from left to right
        const roadCenterRow = Math.floor(this.height / 2);
        let currentRow = roadCenterRow;
        
        for (let q = 0; q < this.width; q++) {
            // Gentle random wandering
            if (Math.random() < 0.3) {
                currentRow += Math.random() < 0.5 ? -1 : 1;
                // Keep road in bounds
                currentRow = Math.max(2, Math.min(this.height - 3, currentRow));
            }
            
            // Road is 2-3 hexes wide
            const roadWidth = 2 + (q % 3 === 0 ? 1 : 0);
            const startRow = currentRow - Math.floor(roadWidth / 2);
            
            for (let r = startRow; r < startRow + roadWidth; r++) {
                const cell = this.getCell(r, q);
                if (cell) {
                    cell.terrain = 'mud_01';
                    cell.level = 0;
                }
            }
            
            // Add some worn grass edges
            const aboveRoad = this.getCell(startRow - 1, q);
            if (aboveRoad && Math.random() < 0.4) {
                aboveRoad.terrain = 'earth_cracked';
            }
            const belowRoad = this.getCell(startRow + roadWidth, q);
            if (belowRoad && Math.random() < 0.4) {
                belowRoad.terrain = 'earth_cracked';
            }
        }
        
        // Add some gentle elevation variation to the grass areas (not the road)
        for (let i = 0; i < 3; i++) {
            const r = Math.random() < 0.5 ? 
                Math.floor(Math.random() * (roadCenterRow - 3)) : 
                roadCenterRow + 2 + Math.floor(Math.random() * (this.height - roadCenterRow - 3));
            const q = Math.floor(Math.random() * this.width);
            this.createElevationBlob(r, q, 1, 2);
        }
    }

    generateArmyCamp() {
        // Start from open field and add broad mud lanes between tent rows.
        this.generatePlains();

        const centerR = Math.floor(this.height / 2);
        const centerQ = Math.floor(this.width / 2);
        const laneRows = [centerR - 2, centerR, centerR + 2];
        const laneCols = [centerQ - 2, centerQ + 1];

        for (let r = 0; r < this.height; r++) {
            for (let q = 0; q < this.width; q++) {
                const cell = this.grid[r][q];
                if (!cell) continue;
                const onLane = laneRows.includes(r) || laneCols.includes(q);
                if (onLane && Math.random() < 0.9) {
                    cell.terrain = Math.random() < 0.3 ? 'earth_cracked' : 'mud_01';
                    cell.level = 0;
                }
            }
        }

        const tentTerrain = this.params.tentTerrain || (this.params.campFaction === 'imperial' ? 'tent_white' : 'tent');
        const burningTerrain = tentTerrain === 'tent_white' ? 'tent_white_burning' : 'tent_burning';
        const tentCount = Math.max(4, Math.min(20, this.params.campTentCount || 10));
        const burningCount = Math.max(0, Math.min(tentCount, this.params.burningTentCount || 0));

        const candidates = [];
        for (let r = 1; r < this.height - 1; r++) {
            for (let q = 1; q < this.width - 1; q++) {
                const cell = this.grid[r][q];
                if (!cell || cell.terrain.includes('mud') || cell.terrain.includes('earth')) continue;
                candidates.push({ r, q });
            }
        }

        for (let i = candidates.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const t = candidates[i];
            candidates[i] = candidates[j];
            candidates[j] = t;
        }

        const placed = [];
        const minSeparation = 2;
        for (const pos of candidates) {
            if (placed.length >= tentCount) break;
            const tooClose = placed.some(p => Math.abs(p.r - pos.r) + Math.abs(p.q - pos.q) < minSeparation);
            if (tooClose) continue;
            const cell = this.grid[pos.r][pos.q];
            cell.terrain = placed.length < burningCount ? burningTerrain : tentTerrain;
            cell.impassable = true;
            cell.level = 0;
            placed.push(pos);
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
        const vertical = this.params.orientation === 'ns' || Math.random() > 0.5;
        // Wider valley: ridges take up 30% of the space on each side
        const ridgeWidth = Math.floor(this.width * 0.3); 

        if (vertical) {
            // North-South Pass
            for (let r = 0; r < this.height; r++) {
                for (let q = 0; q < this.width; q++) {
                    const cell = this.grid[r][q];
                    if (q < ridgeWidth) {
                        // Left ridge: Solid block of Height 3
                        cell.level = 3;
                        // Vary stone sprites
                        const variants = ['mountain_stone_01', 'mountain_stone_02', 'mountain_stone_03'];
                        cell.terrain = variants[Math.floor(Math.random() * variants.length)];
                    } else if (q >= this.width - ridgeWidth) {
                        // Right ridge: Solid block of Height 3
                        cell.level = 3;
                        const variants = ['mountain_stone_01', 'mountain_stone_02', 'mountain_stone_03'];
                        cell.terrain = variants[Math.floor(Math.random() * variants.length)];
                    } else {
                        // Valley: Height 0
                        cell.level = 0;
                        cell.terrain = 'mud_01'; // Dirt path
                    }
                }
            }
        } else {
            // East-West Pass
            const hRidgeWidth = Math.floor(this.height * 0.3);
            for (let r = 0; r < this.height; r++) {
            for (let q = 0; q < this.width; q++) {
                    const cell = this.grid[r][q];
                    if (r < hRidgeWidth) {
                        // Top ridge
                        cell.level = 3;
                        const variants = ['mountain_stone_01', 'mountain_stone_02', 'mountain_stone_03'];
                        cell.terrain = variants[Math.floor(Math.random() * variants.length)];
                    } else if (r >= this.height - hRidgeWidth) {
                        // Bottom ridge
                        cell.level = 3;
                        const variants = ['mountain_stone_01', 'mountain_stone_02', 'mountain_stone_03'];
                        cell.terrain = variants[Math.floor(Math.random() * variants.length)];
                    } else {
                        // Valley
                        cell.level = 0;
                        cell.terrain = 'mud_01';
                    }
                }
            }
        }

        // Add variation (random elevation blobs)
        for (let i = 0; i < 4; i++) {
            const r = Math.floor(Math.random() * this.height);
            const q = Math.floor(Math.random() * this.width);
            const cell = this.getCell(r, q);
            if (cell && cell.level > 0) { // Only vary the ridges
                const delta = Math.random() > 0.5 ? 1 : -1;
                this.createElevationBlob(r, q, cell.level + delta, 2);
            }
        }
    }

    getReachableSet(startR, startQ) {
        const reachable = new Set();
        const startCell = this.getCell(startR, startQ);
        if (!startCell || startCell.impassable) return reachable;

        const queue = [{ r: startR, q: startQ }];
        reachable.add(`${startR},${startQ}`);

        while (queue.length > 0) {
            const current = queue.shift();
            const neighbors = this.getNeighbors(current.r, current.q);
            for (const n of neighbors) {
                if (n.impassable) continue;
                
                // Climbing rule check
                const currentCell = this.getCell(current.r, current.q);
                const nLevel = (n.level !== undefined) ? n.level : 0;
                const cLevel = (currentCell.level !== undefined) ? currentCell.level : 0;
                if (Math.abs(nLevel - cLevel) > 1) continue;

                const key = `${n.r},${n.q}`;
                if (!reachable.has(key)) {
                    reachable.add(key);
                    queue.push({ r: n.r, q: n.q });
                }
            }
        }
        return reachable;
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
        if (startCell.terrain.includes('mountain') || startCell.terrain.includes('wall') || startCell.terrain.includes('water_deep') || startCell.terrain.includes('house') || startCell.terrain.includes('tent')) {
            startCell.terrain = this.getDefaultGrass();
        }

        let attempts = 0;
        const maxAttempts = 100; // Safety break

        while (attempts < maxAttempts) {
            const reachable = this.getReachableSet(startR, startQ);
            
            // Find all intended-to-be-passable cells that were NOT reached
            let nearestIsolated = null;
            let nearestToMain = null;
            let minDist = Infinity;

            for (let r = 0; r < this.height; r++) {
                for (let q = 0; q < this.width; q++) {
                    const cell = this.grid[r][q];
                    if (cell.impassable || reachable.has(`${r},${q}`)) continue;

                    // This is an isolated passable cell. Find its closest reachable cell.
                    for (const reachKey of reachable) {
                        const [rr, rq] = reachKey.split(',').map(Number);
                        const dist = this.getDistance(r, q, rr, rq);
                        if (dist < minDist) {
                            minDist = dist;
                            nearestIsolated = { r, q };
                            nearestToMain = { r: rr, q: rq };
                        }
                    }
                }
            }

            // If no isolated cells, we are done!
            if (!nearestIsolated) break;

            // Connect this isolated cell to the main area by fixing the path between them.
            // We only need to do this once per loop.
            const path = this.getLine(nearestIsolated.r, nearestIsolated.q, nearestToMain.r, nearestToMain.q);
            let lastLevel = this.getCell(nearestToMain.r, nearestToMain.q).level;
            
            for (const step of path) {
                const stepCell = this.getCell(step.r, step.q);
                if (!stepCell) continue;
                
                stepCell.impassable = false;
                // Smoothly adjust level if diff > 1
                if (Math.abs(stepCell.level - lastLevel) > 1) {
                    stepCell.level = lastLevel > stepCell.level ? lastLevel - 1 : lastLevel + 1;
                }
                // Clear blocking terrain on the ramp
                if (stepCell.terrain.includes('mountain') || stepCell.terrain.includes('wall') || stepCell.terrain.includes('house') || stepCell.terrain.includes('tent')) {
                    stepCell.terrain = this.getDefaultGrass();
                }
                if (stepCell.terrain.includes('water_deep')) {
                    stepCell.terrain = 'water_shallow_01'; 
                }
                lastLevel = stepCell.level;
            }
            
            attempts++;
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
        // River is at level 0 (lowest point), banks rise to level 1 (same as surrounding plain)
        // River (0) -> Bank (1) -> Plain (1) - all walkable slopes
        
        // First, set all terrain to plain at level 1 (the elevated plain)
        for (let r = 0; r < this.height; r++) {
            for (let q = 0; q < this.width; q++) {
                const cell = this.grid[r][q];
                if (cell && !cell.terrain.includes('house') && !cell.terrain.includes('wall') && !cell.terrain.includes('tent')) {
                    cell.level = 1;
                    cell.terrain = this.getDefaultGrass();
                }
            }
        }
        
        // Now carve the river at level 0
        let r = Math.floor(Math.random() * this.height);
        let q = 0;
        const riverCells = new Set();
        
        while (q < this.width) {
            const cell = this.getCell(r, q);
            if (cell) {
                this.setWater(r, q, true); // Deep water at level 0
                cell.level = 0; // River is lowest
                riverCells.add(`${r},${q}`);
            }
            
            // Mark shallow water banks
            const neighbors = this.getNeighbors(r, q);
            neighbors.forEach(n => { 
                if (Math.random() < 0.4) {
                    this.setWater(n.r, n.q, false); // Shallow water at level 0
                    n.level = 0; // River is lowest
                    riverCells.add(`${n.r},${n.q}`);
                }
            });
            
            q++;
            if (Math.random() < 0.3) r = Math.max(0, Math.min(this.height - 1, r + (Math.random() > 0.5 ? 1 : -1)));
        }
        
        // Create gradual banks around the river
        // River (0) -> Bank (1) -> Plain (1) - all walkable slopes
        const bankCells = new Set();
        riverCells.forEach(key => {
            const [r, q] = key.split(',').map(Number);
            const neighbors = this.getNeighbors(r, q);
            neighbors.forEach(n => {
                const nKey = `${n.r},${n.q}`;
                if (!riverCells.has(nKey)) {
                    bankCells.add(nKey);
                    // Banks are at level 1 (same as plain, walkable slope from level 0)
                    n.level = 1;
                    // Use sand, mud, or earth for bank terrain (not mountain stone)
                    if (!n.terrain.includes('house') && !n.terrain.includes('wall') && !n.terrain.includes('tent')) {
                        const bankTerrain = Math.random() < 0.4 ? 'sand_01' : 
                                          (Math.random() < 0.5 ? 'mud_01' : 'earth_cracked');
                        n.terrain = bankTerrain;
                    }
                }
            });
        });
        
        // All other cells remain at level 1 (the plain), matching the bank height
    }

    generateLake() {
        // Large body of water on one edge
        // Water at level 0, then sand, then bank (level 1-2) up to other terrain
        const edge = Math.floor(Math.random() * 4); // 0: Top, 1: Right, 2: Bottom, 3: Left
        const waterCells = new Set();
        const sandCells = new Set();
        
        for (let r = 0; r < this.height; r++) {
            for (let q = 0; q < this.width; q++) {
                let dist = 0;
                if (edge === 0) dist = r;
                if (edge === 1) dist = this.width - 1 - q;
                if (edge === 2) dist = this.height - 1 - r;
                if (edge === 3) dist = q;

                if (dist < 3) {
                    if (dist < 2) {
                        // Deep water at level 0
                        this.setWater(r, q, true);
                        waterCells.add(`${r},${q}`);
                    } else {
                        // Shallow water/sand transition at level 0
                        this.setWater(r, q, false);
                        const cell = this.getCell(r, q);
                        if (cell && Math.random() < 0.7) {
                            cell.terrain = 'sand_01';
                            sandCells.add(`${r},${q}`);
                        } else {
                            waterCells.add(`${r},${q}`);
                        }
                    }
                }
            }
        }
        
        // Create bank around the lake (sand/water area)
        const allWaterCells = new Set([...waterCells, ...sandCells]);
        const bankCells = new Set();
        
        // First tier: immediate neighbors become level 1 bank
        allWaterCells.forEach(key => {
            const [r, q] = key.split(',').map(Number);
            const neighbors = this.getNeighbors(r, q);
            neighbors.forEach(n => {
                const nKey = `${n.r},${n.q}`;
                if (!allWaterCells.has(nKey)) {
                    bankCells.add(nKey);
                    n.level = 1;
                    // Use sand for the immediate bank
                    if (!n.terrain.includes('house') && !n.terrain.includes('wall') && !n.terrain.includes('tent')) {
                        n.terrain = 'sand_01';
                    }
                }
            });
        });
        
        // Second tier: further neighbors become level 2 (gradual slope up)
        bankCells.forEach(key => {
            const [r, q] = key.split(',').map(Number);
            const neighbors = this.getNeighbors(r, q);
            neighbors.forEach(n => {
                const nKey = `${n.r},${n.q}`;
                if (!allWaterCells.has(nKey) && !bankCells.has(nKey)) {
                    // Second tier bank at level 2
                    if (n.level === 0 && !n.terrain.includes('house') && !n.terrain.includes('wall') && !n.terrain.includes('tent')) {
                        if (Math.random() < 0.7) {
                            n.level = 2;
                            // Transition from sand to earth/grass
                            if (Math.random() < 0.5) {
                                n.terrain = 'earth_cracked';
                            }
                        }
                    }
                }
            });
        });
    }

    setMountain(r, q, level = 2, impassable = true) {
        const cell = this.getCell(r, q);
        if (!cell) return;
        if (this.biome === 'northern_snowy' && Math.random() < 0.6) {
            cell.terrain = Math.random() > 0.5 ? 'mountain_snowy_01' : 'mountain_snowy_02';
        } else {
            // Vary between the 3 stone variants
            const variants = ['mountain_stone_01', 'mountain_stone_02', 'mountain_stone_03'];
            cell.terrain = variants[Math.floor(Math.random() * variants.length)];
        }
        cell.level = level;
        cell.impassable = impassable;
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

    smoothLevels() {
        // Conservative outlier removal: only change a cell's level if NO neighbors share it.
        // This ensures every hex "tends to share an elevation with at least one neighbor"
        // without collapsing the overall structure into a flat plain.
        const newLevels = Array.from({ length: this.height }, () => new Int32Array(this.width));
        
        for (let r = 0; r < this.height; r++) {
            for (let q = 0; q < this.width; q++) {
                const cell = this.grid[r][q];
                const neighbors = this.getNeighbors(r, q);
                
                const sameLevelNeighbors = neighbors.filter(n => n.level === cell.level);
                
                if (sameLevelNeighbors.length === 0 && neighbors.length > 0) {
                    // This is an "island" cell. Adoption: take the most common neighbor level.
                    const counts = {};
                    neighbors.forEach(n => {
                        counts[n.level] = (counts[n.level] || 0) + 1;
                    });
                    
                    let bestLevel = cell.level;
                    let maxCount = 0;
                    for (const lvl in counts) {
                        if (counts[lvl] > maxCount) {
                            maxCount = counts[lvl];
                            bestLevel = parseInt(lvl);
                        }
                    }
                    newLevels[r][q] = bestLevel;
                } else {
                    newLevels[r][q] = cell.level;
                }
            }
        }
        
        // Apply smoothed levels
        for (let r = 0; r < this.height; r++) {
            for (let q = 0; q < this.width; q++) {
                this.grid[r][q].level = newLevels[r][q];
            }
        }
    }

    ensureGradualSlopes() {
        // Ensure no cliffs (max 1 level difference) for river/lake layouts
        // This creates smooth slopes instead of cliffs
        let changed = true;
        let iterations = 0;
        while (changed && iterations < 10) {
            changed = false;
            for (let r = 0; r < this.height; r++) {
                for (let q = 0; q < this.width; q++) {
                    const cell = this.grid[r][q];
                    if (!cell) continue;
                    
                    const neighbors = this.getNeighbors(r, q);
                    for (const neighbor of neighbors) {
                        const levelDiff = Math.abs(cell.level - neighbor.level);
                        if (levelDiff > 1) {
                            // Too steep! Adjust to create a gradual slope
                            if (cell.level > neighbor.level) {
                                // Cell is higher - lower it to be 1 level above neighbor
                                cell.level = neighbor.level + 1;
                            } else {
                                // Neighbor is higher - raise cell to be 1 level below neighbor
                                cell.level = neighbor.level - 1;
                            }
                            changed = true;
                        }
                    }
                }
            }
            iterations++;
        }
    }

    smoothElevation() {
        // Elevation pixels = level * elevationStep for more distinct 3D look
        for (let r = 0; r < this.height; r++) {
            for (let q = 0; q < this.width; q++) {
                const cell = this.grid[r][q];
                cell.elevation = cell.level * this.elevationStep;
            }
        }
    }

    varyCliffTerrain() {
        // When two adjacent hexes have different elevation but the same terrain type,
        // change the higher one to rock/mud to make the cliff visually clear.
        // This prevents confusing cliffs between two identical grass/mud hexes.
        // Skip this for river/lake layouts to preserve bank terrain.
        const layout = this.params?.layout || 'plain';
        if (layout === 'river' || layout === 'lake_edge') {
            return; // Don't vary terrain for river/lake - banks should stay as sand/mud/earth
        }
        
        const grassTypes = ['grass_01', 'grass_02', 'grass_03'];
        const mudTypes = ['mud_01', 'earth_cracked', 'earth_rocky'];
        const rockTypes = ['mountain_01', 'mountain_02'];
        
        // Higher elevation alternatives based on biome
        const cliffAlternatives = {
            grass: ['mud_01', 'earth_rocky', 'earth_cracked'],
            mud: ['earth_rocky', 'sand_01', 'grass_01'],
            earth: ['mud_01', 'grass_01', 'sand_01']
        };
        
        for (let r = 0; r < this.height; r++) {
            for (let q = 0; q < this.width; q++) {
                const cell = this.grid[r][q];
                if (!cell || cell.impassable) continue;
                
                // Skip water and sand (river/lake terrain)
                if (cell.terrain.includes('water') || cell.terrain.includes('sand')) continue;
                
                // Skip non-base terrain
                const isGrass = grassTypes.includes(cell.terrain);
                const isMud = mudTypes.includes(cell.terrain);
                const isEarth = cell.terrain.startsWith('earth');
                if (!isGrass && !isMud && !isEarth) continue;
                
                const neighbors = this.getNeighbors(r, q);
                for (const neighbor of neighbors) {
                    if (!neighbor || neighbor.impassable) continue;
                    
                    // Skip water and sand neighbors
                    if (neighbor.terrain.includes('water') || neighbor.terrain.includes('sand')) continue;
                    
                    // Check if there's an elevation difference
                    const levelDiff = Math.abs(cell.level - neighbor.level);
                    if (levelDiff === 0) continue;
                    
                    // Only vary terrain for actual cliffs (level diff > 1), not slopes
                    if (levelDiff <= 1) continue;
                    
                    // Check if they have the same terrain type
                    const sameType = cell.terrain === neighbor.terrain ||
                        (isGrass && grassTypes.includes(neighbor.terrain)) ||
                        (isMud && mudTypes.includes(neighbor.terrain));
                    
                    if (sameType) {
                        // Change the higher cell to a rocky variant
                        const higherCell = cell.level > neighbor.level ? cell : neighbor;
                        
                        // Don't change if already varied
                        if (higherCell.terrain.includes('earth') || higherCell.terrain.includes('rock')) continue;
                        
                        // Pick a cliff alternative
                        const terrainType = grassTypes.includes(higherCell.terrain) ? 'grass' : 
                                          mudTypes.includes(higherCell.terrain) ? 'mud' : 'earth';
                        const alternatives = cliffAlternatives[terrainType] || ['earth_rocky'];
                        higherCell.terrain = alternatives[Math.floor(Math.random() * alternatives.length)];
                    }
                }
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

                // Living units block movement; corpses do not.
                if (n.unit && n.unit !== movingUnit && n.unit.hp > 0 && !n.unit.isGone) {
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
                const nLevel = (n.level !== undefined) ? n.level : 0;
                const cLevel = (current.level !== undefined) ? current.level : 0;
                const levelDiff = Math.abs(nLevel - cLevel);
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

