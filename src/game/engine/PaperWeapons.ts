import * as THREE from 'three';
import { WEAPONS } from '../constants';

export class PaperWeaponsBuilder {
  // Create a paper material with subtle fold/paper feel
  public static createPaperMaterial(colorHex: string | number, roughness = 0.9): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness,
      metalness: 0.05,
      flatShading: true,
      side: THREE.DoubleSide
    });
  }

  // Builds the 3D paper gun model for first-person and third-person view
  public static buildWeaponModel(weaponId: string): THREE.Group {
    const group = new THREE.Group();
    const weapon = WEAPONS[weaponId] || WEAPONS.pistol;
    const baseMat = this.createPaperMaterial(weapon.paperColor);
    const accentMat = this.createPaperMaterial(weapon.accentColor);
    const darkPaperMat = this.createPaperMaterial('#334155');
    const tapeMat = this.createPaperMaterial('#fef08a'); // yellow masking tape

    if (weaponId === 'shotgun') {
      // Shotgun: double folded barrel, heavy wooden/cardboard stock
      const stockGeom = new THREE.BoxGeometry(0.08, 0.12, 0.35);
      const stock = new THREE.Mesh(stockGeom, baseMat);
      stock.position.set(0, -0.02, 0.15);
      group.add(stock);

      const barrelGeom = new THREE.CylinderGeometry(0.035, 0.035, 0.55, 6);
      barrelGeom.rotateX(Math.PI / 2);
      const barrel = new THREE.Mesh(barrelGeom, darkPaperMat);
      barrel.position.set(0, 0.03, -0.25);
      group.add(barrel);

      const pumpGeom = new THREE.BoxGeometry(0.09, 0.07, 0.18);
      const pump = new THREE.Mesh(pumpGeom, accentMat);
      pump.position.set(0, 0, -0.22);
      group.add(pump);

      // Tape wrap
      const tapeGeom = new THREE.BoxGeometry(0.095, 0.08, 0.05);
      const tape = new THREE.Mesh(tapeGeom, tapeMat);
      tape.position.set(0, 0.02, -0.05);
      group.add(tape);

    } else if (weaponId === 'sniper') {
      // Sniper: long folded barrel, paper roll scope, tripod/bipod fold
      const bodyGeom = new THREE.BoxGeometry(0.07, 0.1, 0.6);
      const body = new THREE.Mesh(bodyGeom, baseMat);
      group.add(body);

      const barrelGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.7, 6);
      barrelGeom.rotateX(Math.PI / 2);
      const barrel = new THREE.Mesh(barrelGeom, darkPaperMat);
      barrel.position.set(0, 0.03, -0.55);
      group.add(barrel);

      // Paper roll scope
      const scopeGeom = new THREE.CylinderGeometry(0.035, 0.035, 0.32, 8);
      scopeGeom.rotateX(Math.PI / 2);
      const scope = new THREE.Mesh(scopeGeom, accentMat);
      scope.position.set(0, 0.1, -0.08);
      group.add(scope);

      // Scope rings
      const ringGeom = new THREE.BoxGeometry(0.08, 0.04, 0.03);
      const ring1 = new THREE.Mesh(ringGeom, darkPaperMat);
      ring1.position.set(0, 0.07, 0.02);
      const ring2 = ring1.clone();
      ring2.position.set(0, 0.07, -0.18);
      group.add(ring1, ring2);

      const stockGeom = new THREE.BoxGeometry(0.06, 0.14, 0.28);
      const stock = new THREE.Mesh(stockGeom, baseMat);
      stock.position.set(0, -0.05, 0.38);
      group.add(stock);

    } else if (weaponId === 'smg') {
      // SMG: compact folded box body, folded paper roll drum magazine
      const bodyGeom = new THREE.BoxGeometry(0.08, 0.14, 0.32);
      const body = new THREE.Mesh(bodyGeom, baseMat);
      group.add(body);

      const barrelGeom = new THREE.CylinderGeometry(0.025, 0.025, 0.25, 6);
      barrelGeom.rotateX(Math.PI / 2);
      const barrel = new THREE.Mesh(barrelGeom, darkPaperMat);
      barrel.position.set(0, 0.04, -0.22);
      group.add(barrel);

      // Drum magazine
      const drumGeom = new THREE.CylinderGeometry(0.07, 0.07, 0.09, 8);
      drumGeom.rotateZ(Math.PI / 2);
      const drum = new THREE.Mesh(drumGeom, accentMat);
      drum.position.set(0, -0.12, -0.04);
      group.add(drum);

      // Folded wire stock
      const stockGeom = new THREE.BoxGeometry(0.04, 0.08, 0.2);
      const stock = new THREE.Mesh(stockGeom, darkPaperMat);
      stock.position.set(0, 0.01, 0.22);
      group.add(stock);

    } else if (weaponId === 'rifle') {
      // Assault Rifle: classic papercraft assault rifle with curved paper mag
      const bodyGeom = new THREE.BoxGeometry(0.07, 0.13, 0.5);
      const body = new THREE.Mesh(bodyGeom, baseMat);
      group.add(body);

      const barrelGeom = new THREE.CylinderGeometry(0.025, 0.025, 0.45, 6);
      barrelGeom.rotateX(Math.PI / 2);
      const barrel = new THREE.Mesh(barrelGeom, darkPaperMat);
      barrel.position.set(0, 0.03, -0.4);
      group.add(barrel);

      // Curved banana magazine
      const magGeom = new THREE.BoxGeometry(0.05, 0.22, 0.1);
      const mag = new THREE.Mesh(magGeom, accentMat);
      mag.position.set(0, -0.16, -0.05);
      mag.rotation.x = -0.3;
      group.add(mag);

      // Front sight & Rear sight
      const sightGeom = new THREE.BoxGeometry(0.02, 0.04, 0.02);
      const frontSight = new THREE.Mesh(sightGeom, darkPaperMat);
      frontSight.position.set(0, 0.08, -0.38);
      const rearSight = new THREE.Mesh(sightGeom, darkPaperMat);
      rearSight.position.set(0, 0.08, 0.08);
      group.add(frontSight, rearSight);

      const stockGeom = new THREE.BoxGeometry(0.06, 0.12, 0.26);
      const stock = new THREE.Mesh(stockGeom, baseMat);
      stock.position.set(0, -0.03, 0.32);
      group.add(stock);

    } else {
      // Pistol: Origami folded A4 handgun
      const slideGeom = new THREE.BoxGeometry(0.065, 0.08, 0.28);
      const slide = new THREE.Mesh(slideGeom, baseMat);
      slide.position.set(0, 0.05, -0.04);
      group.add(slide);

      const gripGeom = new THREE.BoxGeometry(0.055, 0.16, 0.08);
      const grip = new THREE.Mesh(gripGeom, accentMat);
      grip.position.set(0, -0.08, 0.04);
      grip.rotation.x = 0.25;
      group.add(grip);

      const barrelGeom = new THREE.CylinderGeometry(0.018, 0.018, 0.15, 6);
      barrelGeom.rotateX(Math.PI / 2);
      const barrel = new THREE.Mesh(barrelGeom, darkPaperMat);
      barrel.position.set(0, 0.05, -0.18);
      group.add(barrel);

      // Paper tape accent
      const tapeGeom = new THREE.BoxGeometry(0.06, 0.04, 0.085);
      const tape = new THREE.Mesh(tapeGeom, tapeMat);
      tape.position.set(0, -0.07, 0.04);
      tape.rotation.x = 0.25;
      group.add(tape);
    }

    group.name = `weapon_${weaponId}`;
    return group;
  }

  // Builds the First Person Arm and Hands holding the weapon
  public static buildFirstPersonRig(weaponId: string): { rig: THREE.Group; weaponMesh: THREE.Group; leftArm: THREE.Group; rightArm: THREE.Group } {
    const rig = new THREE.Group();
    const weaponMesh = this.buildWeaponModel(weaponId);

    const skinMat = this.createPaperMaterial('#fed7aa'); // paper craft flesh tone
    const sleeveMat = this.createPaperMaterial('#38bdf8'); // paper folded sleeve

    // Right Arm (holding grip & trigger)
    const rightArm = new THREE.Group();
    const rSleeveGeom = new THREE.BoxGeometry(0.12, 0.12, 0.45);
    const rSleeve = new THREE.Mesh(rSleeveGeom, sleeveMat);
    rSleeve.position.set(0.24, -0.18, 0.35);
    rSleeve.rotation.set(-0.25, -0.15, 0.1);
    rightArm.add(rSleeve);

    const rHandGeom = new THREE.BoxGeometry(0.08, 0.09, 0.12);
    const rHand = new THREE.Mesh(rHandGeom, skinMat);
    rHand.position.set(0.18, -0.12, 0.14);
    rightArm.add(rHand);
    rig.add(rightArm);

    // Left Arm (supporting barrel/grip)
    const leftArm = new THREE.Group();
    const lSleeveGeom = new THREE.BoxGeometry(0.12, 0.12, 0.45);
    const lSleeve = new THREE.Mesh(lSleeveGeom, sleeveMat);
    lSleeve.position.set(-0.24, -0.22, 0.32);
    lSleeve.rotation.set(-0.35, 0.35, -0.2);
    leftArm.add(lSleeve);

    const lHandGeom = new THREE.BoxGeometry(0.08, 0.09, 0.12);
    const lHand = new THREE.Mesh(lHandGeom, skinMat);
    lHand.position.set(-0.08, -0.15, 0.02);
    lHand.rotation.set(0.2, 0.5, -0.2);
    leftArm.add(lHand);
    rig.add(leftArm);

    // Position weapon in hands
    weaponMesh.position.set(0.14, -0.14, -0.32);
    rig.add(weaponMesh);

    return { rig, weaponMesh, leftArm, rightArm };
  }
}
