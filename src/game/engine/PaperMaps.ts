import * as THREE from 'three';
import { MapId, Vector3D } from '../../types/game';
import { MAPS } from '../constants';
import { PaperWeaponsBuilder } from './PaperWeapons';

export interface CollisionBox {
  min: Vector3D;
  max: Vector3D;
}

export interface MapData {
  sceneGroup: THREE.Group;
  spawnsRed: Vector3D[];
  spawnsBlue: Vector3D[];
  collisionBoxes: CollisionBox[];
  waypoints: Vector3D[];
}

export class PaperMapsBuilder {
  public static buildMap(mapId: MapId): MapData {
    const sceneGroup = new THREE.Group();
    const collisionBoxes: CollisionBox[] = [];
    const waypoints: Vector3D[] = [];
    const spawnsRed: Vector3D[] = [];
    const spawnsBlue: Vector3D[] = [];

    const mapInfo = MAPS[mapId] || MAPS.paper_city;

    // Shared Materials
    const cardboardMat = PaperWeaponsBuilder.createPaperMaterial('#d4a373', 0.95);
    const paperWhiteMat = PaperWeaponsBuilder.createPaperMaterial('#f8fafc');
    const tapeMat = PaperWeaponsBuilder.createPaperMaterial('#fef08a');
    const roofRedMat = PaperWeaponsBuilder.createPaperMaterial('#ef4444');
    const roofBlueMat = PaperWeaponsBuilder.createPaperMaterial('#3b82f6');
    const woodMat = PaperWeaponsBuilder.createPaperMaterial('#b45309');
    const greenMat = PaperWeaponsBuilder.createPaperMaterial('#22c55e');
    const darkGrayMat = PaperWeaponsBuilder.createPaperMaterial('#334155');

    // Helper: add an obstacle box and register collision
    const addBox = (
      x: number, y: number, z: number,
      w: number, h: number, d: number,
      mat: THREE.Material,
      castShadow = true,
      hasCollision = true
    ) => {
      const geom = new THREE.BoxGeometry(w, h, d);
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(x, y + h / 2, z);
      mesh.castShadow = castShadow;
      mesh.receiveShadow = true;
      sceneGroup.add(mesh);

      if (hasCollision) {
        collisionBoxes.push({
          min: { x: x - w / 2, y: y, z: z - d / 2 },
          max: { x: x + w / 2, y: y + h, z: z + d / 2 }
        });
      }
      return mesh;
    };

    // Helper: add paper crate with tape
    const addPaperCrate = (x: number, z: number, size = 1.8, y = 0) => {
      addBox(x, y, z, size, size, size, cardboardMat);
      // Tape strips across box
      const tapeGeom = new THREE.BoxGeometry(size * 1.02, size * 0.15, size * 1.02);
      const tape = new THREE.Mesh(tapeGeom, tapeMat);
      tape.position.set(x, y + size / 2, z);
      sceneGroup.add(tape);
    };

    if (mapId === 'paper_city') {
      // --- GROUND ---
      const groundSize = 90;
      const groundMat = PaperWeaponsBuilder.createPaperMaterial('#475569');
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(groundSize, groundSize), groundMat);
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      sceneGroup.add(ground);

      // Sidewalks & Road Markings
      const sidewalkMat = PaperWeaponsBuilder.createPaperMaterial('#cbd5e1');
      const sw1 = new THREE.Mesh(new THREE.PlaneGeometry(86, 12), sidewalkMat);
      sw1.rotation.x = -Math.PI / 2;
      sw1.position.set(0, 0.02, 18);
      sceneGroup.add(sw1);

      const sw2 = new THREE.Mesh(new THREE.PlaneGeometry(86, 12), sidewalkMat);
      sw2.rotation.x = -Math.PI / 2;
      sw2.position.set(0, 0.02, -18);
      sceneGroup.add(sw2);

      // Outer boundary walls (tall paper barriers)
      addBox(0, 0, 42, 84, 5, 2, cardboardMat);
      addBox(0, 0, -42, 84, 5, 2, cardboardMat);
      addBox(42, 0, 0, 2, 5, 84, cardboardMat);
      addBox(-42, 0, 0, 2, 5, 84, cardboardMat);

      // Houses / Buildings
      const buildHouse = (x: number, z: number, w: number, h: number, d: number, wallMat: THREE.Material, rMat: THREE.Material) => {
        addBox(x, 0, z, w, h, d, wallMat);
        // Folded Roof
        const roofGeom = new THREE.ConeGeometry(w * 0.7, h * 0.45, 4);
        roofGeom.rotateY(Math.PI / 4);
        const roof = new THREE.Mesh(roofGeom, rMat);
        roof.position.set(x, h + (h * 0.45) / 2, z);
        roof.castShadow = true;
        sceneGroup.add(roof);
      };

      // City Buildings
      buildHouse(-24, -28, 10, 7, 12, paperWhiteMat, roofRedMat);
      buildHouse(-6, -28, 12, 8, 12, cardboardMat, roofBlueMat);
      buildHouse(14, -28, 10, 6, 12, PaperWeaponsBuilder.createPaperMaterial('#fed7aa'), roofRedMat);
      buildHouse(28, -28, 9, 8, 12, paperWhiteMat, roofBlueMat);

      buildHouse(-24, 28, 10, 8, 12, paperWhiteMat, roofBlueMat);
      buildHouse(-6, 28, 12, 7, 12, PaperWeaponsBuilder.createPaperMaterial('#fed7aa'), roofRedMat);
      buildHouse(14, 28, 10, 8, 12, cardboardMat, roofBlueMat);
      buildHouse(28, 28, 9, 6, 12, paperWhiteMat, roofRedMat);

      // Center Plaza structure (Origami Gazebo / Clock Tower)
      addBox(0, 0, 0, 6, 8, 6, cardboardMat);
      const towerRoof = new THREE.Mesh(new THREE.ConeGeometry(4.8, 3, 4), roofRedMat);
      towerRoof.position.set(0, 9.5, 0);
      towerRoof.rotation.y = Math.PI / 4;
      sceneGroup.add(towerRoof);

      // Folded Paper Cars on streets
      const buildPaperCar = (x: number, z: number, rotY: number, colorHex: string) => {
        const carMat = PaperWeaponsBuilder.createPaperMaterial(colorHex);
        const carBody = addBox(x, 0.3, z, 3.8, 1.3, 2.2, carMat);
        carBody.rotation.y = rotY;
        // Wheels
        const wheelGeom = new THREE.CylinderGeometry(0.35, 0.35, 0.2, 8);
        wheelGeom.rotateX(Math.PI / 2);
        [-1.2, 1.2].forEach(wx => {
          [-1.1, 1.1].forEach(wz => {
            const wheel = new THREE.Mesh(wheelGeom, darkGrayMat);
            wheel.position.set(x + wx, 0.35, z + wz);
            sceneGroup.add(wheel);
          });
        });
      };

      buildPaperCar(-14, 0, 0, '#ef4444');
      buildPaperCar(14, 0, 0.2, '#3b82f6');
      buildPaperCar(-2, -6, 1.4, '#eab308');

      // Cover Crates in streets
      addPaperCrate(-8, -4, 1.8);
      addPaperCrate(-8, -2, 1.8);
      addPaperCrate(8, 4, 1.8);
      addPaperCrate(8, 6, 1.8);
      addPaperCrate(-18, 10, 2.2);
      addPaperCrate(18, -10, 2.2);
      addPaperCrate(0, 8, 1.6);
      addPaperCrate(0, -8, 1.6);

      // Team Spawns (Red West, Blue East)
      spawnsRed.push({ x: -34, y: 0.1, z: 0 }, { x: -32, y: 0.1, z: 6 }, { x: -32, y: 0.1, z: -6 }, { x: -30, y: 0.1, z: 12 }, { x: -30, y: 0.1, z: -12 }, { x: -28, y: 0.1, z: 0 });
      spawnsBlue.push({ x: 34, y: 0.1, z: 0 }, { x: 32, y: 0.1, z: 6 }, { x: 32, y: 0.1, z: -6 }, { x: 30, y: 0.1, z: 12 }, { x: 30, y: 0.1, z: -12 }, { x: 28, y: 0.1, z: 0 });

      // Bot Waypoints
      [
        { x: -30, y: 0, z: 0 }, { x: -20, y: 0, z: -10 }, { x: -20, y: 0, z: 10 },
        { x: -10, y: 0, z: 0 }, { x: 0, y: 0, z: -12 }, { x: 0, y: 0, z: 12 },
        { x: 10, y: 0, z: 0 }, { x: 20, y: 0, z: -10 }, { x: 20, y: 0, z: 10 },
        { x: 30, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, { x: -14, y: 0, z: 5 }, { x: 14, y: 0, z: -5 }
      ].forEach(pt => waypoints.push(pt));

    } else if (mapId === 'paper_factory') {
      // --- PAPER FACTORY MAP ---
      const groundSize = 95;
      const groundMat = PaperWeaponsBuilder.createPaperMaterial('#57534e');
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(groundSize, groundSize), groundMat);
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      sceneGroup.add(ground);

      // Boundaries
      addBox(0, 0, 44, 88, 7, 2, cardboardMat);
      addBox(0, 0, -44, 88, 7, 2, cardboardMat);
      addBox(44, 0, 0, 2, 7, 88, cardboardMat);
      addBox(-44, 0, 0, 2, 7, 88, cardboardMat);

      // Giant Stacks of Paper Rolls (Cylinders)
      const rollMat = PaperWeaponsBuilder.createPaperMaterial('#f8fafc');
      const addPaperRoll = (x: number, z: number, r = 2, h = 5) => {
        const rollGeom = new THREE.CylinderGeometry(r, r, h, 12);
        const roll = new THREE.Mesh(rollGeom, rollMat);
        roll.position.set(x, h / 2, z);
        roll.castShadow = true;
        sceneGroup.add(roll);
        collisionBoxes.push({
          min: { x: x - r, y: 0, z: z - r },
          max: { x: x + r, y: h, z: z + r }
        });
      };

      addPaperRoll(-16, -18, 2.2, 6);
      addPaperRoll(-12, -18, 2.2, 6);
      addPaperRoll(-14, -14, 2.2, 5);

      addPaperRoll(16, 18, 2.2, 6);
      addPaperRoll(12, 18, 2.2, 6);
      addPaperRoll(14, 14, 2.2, 5);

      // Elevated Catwalks & Platforms
      addBox(0, 2.5, 0, 16, 0.4, 14, woodMat); // Central raised platform
      // Ramps / Stairs to platform
      addBox(-11, 1.25, 0, 6, 0.4, 4, woodMat);
      addBox(11, 1.25, 0, 6, 0.4, 4, woodMat);

      // Conveyor Belts (long paper sheets with rollers)
      addBox(-20, 0.8, 12, 28, 0.6, 2.8, darkGrayMat);
      addBox(20, 0.8, -12, 28, 0.6, 2.8, darkGrayMat);

      // Warehouse Dividing Walls & Rooms
      addBox(-24, 0, -2, 2, 6, 24, cardboardMat);
      addBox(24, 0, 2, 2, 6, 24, cardboardMat);
      addBox(0, 0, -26, 32, 6, 2, cardboardMat);
      addBox(0, 0, 26, 32, 6, 2, cardboardMat);

      // Dense Cover Crates
      addPaperCrate(-5, -5, 2.2);
      addPaperCrate(5, 5, 2.2);
      addPaperCrate(-18, 5, 1.8);
      addPaperCrate(18, -5, 1.8);
      addPaperCrate(0, -12, 2);
      addPaperCrate(0, 12, 2);

      // Spawns (North Red, South Blue)
      spawnsRed.push({ x: 0, y: 0.1, z: -35 }, { x: -8, y: 0.1, z: -34 }, { x: 8, y: 0.1, z: -34 }, { x: -16, y: 0.1, z: -32 }, { x: 16, y: 0.1, z: -32 }, { x: 0, y: 0.1, z: -28 });
      spawnsBlue.push({ x: 0, y: 0.1, z: 35 }, { x: -8, y: 0.1, z: 34 }, { x: 8, y: 0.1, z: 34 }, { x: -16, y: 0.1, z: 32 }, { x: 16, y: 0.1, z: 32 }, { x: 0, y: 0.1, z: 28 });

      // Waypoints
      [
        { x: 0, y: 0, z: -30 }, { x: -15, y: 0, z: -20 }, { x: 15, y: 0, z: -20 },
        { x: 0, y: 2.8, z: 0 }, { x: -10, y: 1.5, z: 0 }, { x: 10, y: 1.5, z: 0 },
        { x: -20, y: 0, z: 12 }, { x: 20, y: 0, z: -12 },
        { x: -15, y: 0, z: 20 }, { x: 15, y: 0, z: 20 }, { x: 0, y: 0, z: 30 }
      ].forEach(pt => waypoints.push(pt));

    } else {
      // --- PAPER ISLAND MAP ---
      const groundSize = 100;
      // Sandy craft paper beach
      const sandMat = PaperWeaponsBuilder.createPaperMaterial('#fde68a');
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(76, 76), sandMat);
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      sceneGroup.add(ground);

      // Surrounding Blue Paper Ocean
      const oceanMat = PaperWeaponsBuilder.createPaperMaterial('#38bdf8', 0.6);
      const ocean = new THREE.Mesh(new THREE.PlaneGeometry(150, 150), oceanMat);
      ocean.rotation.x = -Math.PI / 2;
      ocean.position.y = -0.4;
      sceneGroup.add(ocean);

      // Paper Island Boundaries (rocks and barriers)
      addBox(0, 0, 38, 76, 3, 2, woodMat);
      addBox(0, 0, -38, 76, 3, 2, woodMat);
      addBox(38, 0, 0, 2, 3, 76, woodMat);
      addBox(-38, 0, 0, 2, 3, 76, woodMat);

      // Origami Palm Trees
      const addPalmTree = (x: number, z: number) => {
        const trunkGeom = new THREE.CylinderGeometry(0.3, 0.45, 5, 5);
        const trunk = new THREE.Mesh(trunkGeom, cardboardMat);
        trunk.position.set(x, 2.5, z);
        trunk.rotation.z = (Math.random() - 0.5) * 0.15;
        trunk.castShadow = true;
        sceneGroup.add(trunk);

        // Folded palm leaves (fronds)
        const frondGeom = new THREE.ConeGeometry(2.5, 0.4, 5);
        for (let i = 0; i < 5; i++) {
          const frond = new THREE.Mesh(frondGeom, greenMat);
          frond.position.set(x, 5.1, z);
          frond.rotation.y = (i * Math.PI * 2) / 5;
          frond.rotation.z = 0.5;
          frond.castShadow = true;
          sceneGroup.add(frond);
        }

        collisionBoxes.push({
          min: { x: x - 0.4, y: 0, z: z - 0.4 },
          max: { x: x + 0.4, y: 5, z: z + 0.4 }
        });
      };

      addPalmTree(-22, -22);
      addPalmTree(-25, 18);
      addPalmTree(24, -20);
      addPalmTree(22, 22);
      addPalmTree(-10, -8);
      addPalmTree(12, 10);

      // Polygonal Paper Rocks
      const addPaperRock = (x: number, z: number, s = 2.5) => {
        const rockGeom = new THREE.DodecahedronGeometry(s, 0);
        const rock = new THREE.Mesh(rockGeom, darkGrayMat);
        rock.position.set(x, s * 0.7, z);
        rock.castShadow = true;
        sceneGroup.add(rock);
        collisionBoxes.push({
          min: { x: x - s, y: 0, z: z - s },
          max: { x: x + s, y: s * 1.5, z: z + s }
        });
      };

      addPaperRock(-16, 0, 3);
      addPaperRock(16, 0, 3);
      addPaperRock(0, -18, 2.5);
      addPaperRock(0, 18, 2.5);

      // Central Wooden-Paper Observation Watchtower & Bridges
      addBox(0, 0, 0, 8, 4, 8, woodMat); // Tower base
      addBox(0, 4, 0, 9, 0.4, 9, woodMat); // Deck
      // Guardrails
      addBox(0, 4.4, 4.2, 9, 0.8, 0.2, woodMat);
      addBox(0, 4.4, -4.2, 9, 0.8, 0.2, woodMat);
      addBox(4.2, 4.4, 0, 0.2, 0.8, 9, woodMat);
      addBox(-4.2, 4.4, 0, 0.2, 0.8, 9, woodMat);

      // Wooden Plank Bridges
      addBox(-10, 2, 0, 12, 0.3, 3, woodMat);
      addBox(10, 2, 0, 12, 0.3, 3, woodMat);

      // Beach Huts (Origami Tiki Cabins)
      const addBeachHut = (x: number, z: number) => {
        addBox(x, 0, z, 5, 3.2, 5, cardboardMat);
        const thatchRoof = new THREE.Mesh(new THREE.ConeGeometry(4.2, 2.2, 4), PaperWeaponsBuilder.createPaperMaterial('#ca8a04'));
        thatchRoof.position.set(x, 4.3, z);
        thatchRoof.rotation.y = Math.PI / 4;
        sceneGroup.add(thatchRoof);
      };

      addBeachHut(-26, -6);
      addBeachHut(26, 6);

      // Cover Crates
      addPaperCrate(-4, 8, 1.8);
      addPaperCrate(4, -8, 1.8);
      addPaperCrate(-12, -14, 1.8);
      addPaperCrate(12, 14, 1.8);

      // Spawns (West Red, East Blue)
      spawnsRed.push({ x: -30, y: 0.1, z: 0 }, { x: -28, y: 0.1, z: 8 }, { x: -28, y: 0.1, z: -8 }, { x: -25, y: 0.1, z: 15 }, { x: -25, y: 0.1, z: -15 }, { x: -22, y: 0.1, z: 0 });
      spawnsBlue.push({ x: 30, y: 0.1, z: 0 }, { x: 28, y: 0.1, z: 8 }, { x: 28, y: 0.1, z: -8 }, { x: 25, y: 0.1, z: 15 }, { x: 25, y: 0.1, z: -15 }, { x: 22, y: 0.1, z: 0 });

      // Waypoints
      [
        { x: -25, y: 0, z: 0 }, { x: -15, y: 0, z: -10 }, { x: -15, y: 0, z: 10 },
        { x: 0, y: 4.2, z: 0 }, { x: -6, y: 2.2, z: 0 }, { x: 6, y: 2.2, z: 0 },
        { x: 0, y: 0, z: -14 }, { x: 0, y: 0, z: 14 },
        { x: 15, y: 0, z: -10 }, { x: 15, y: 0, z: 10 }, { x: 25, y: 0, z: 0 }
      ].forEach(pt => waypoints.push(pt));
    }

    return {
      sceneGroup,
      spawnsRed,
      spawnsBlue,
      collisionBoxes,
      waypoints
    };
  }
}
