import * as THREE from 'three';
import { SKINS } from '../constants';
import { Team } from '../../types/game';
import { PaperWeaponsBuilder } from './PaperWeapons';

export class PaperCharactersBuilder {
  public static buildCharacterModel(skinId: string, team: Team, weaponId: string = 'rifle'): THREE.Group {
    const group = new THREE.Group();
    const skin = SKINS[skinId] || SKINS.explorer;

    // Materials
    const skinMat = PaperWeaponsBuilder.createPaperMaterial('#fed7aa'); // paper flesh
    const bodyMat = PaperWeaponsBuilder.createPaperMaterial(skin.primaryColor);
    const accentMat = PaperWeaponsBuilder.createPaperMaterial(skin.secondaryColor);
    const darkMat = PaperWeaponsBuilder.createPaperMaterial('#1e293b');
    const whiteMat = PaperWeaponsBuilder.createPaperMaterial('#f8fafc');

    // Team material: bright red or bright blue paper armband / neck scarf
    const teamColor = team === 'RED' ? '#ef4444' : '#3b82f6';
    const teamMat = PaperWeaponsBuilder.createPaperMaterial(teamColor);

    // Root offset for pivot at feet
    const characterRoot = new THREE.Group();
    group.add(characterRoot);

    // --- TORSO (Folded box with cardstock seams) ---
    const torsoGeom = new THREE.BoxGeometry(0.55, 0.7, 0.35);
    const torso = new THREE.Mesh(torsoGeom, bodyMat);
    torso.position.y = 1.05;
    torso.castShadow = true;
    characterRoot.add(torso);

    // Team Armband on chest/arm
    const chestBandGeom = new THREE.BoxGeometry(0.57, 0.14, 0.37);
    const chestBand = new THREE.Mesh(chestBandGeom, teamMat);
    chestBand.position.y = 1.15;
    characterRoot.add(chestBand);

    // Folded collar
    const collarGeom = new THREE.BoxGeometry(0.3, 0.08, 0.2);
    const collar = new THREE.Mesh(collarGeom, accentMat);
    collar.position.set(0, 1.4, 0.1);
    collar.rotation.x = -0.3;
    characterRoot.add(collar);

    // --- HEAD (Cute cartoon slightly large origami cube) ---
    const headGroup = new THREE.Group();
    headGroup.position.y = 1.65;
    headGroup.name = 'head';

    const headGeom = new THREE.BoxGeometry(0.5, 0.5, 0.45);
    const head = new THREE.Mesh(headGeom, skinMat);
    head.castShadow = true;
    headGroup.add(head);

    // Cartoon Eyes (paper dots)
    const eyeGeom = new THREE.BoxGeometry(0.08, 0.1, 0.02);
    const leftEye = new THREE.Mesh(eyeGeom, darkMat);
    leftEye.position.set(-0.13, 0.04, 0.23);
    const rightEye = new THREE.Mesh(eyeGeom, darkMat);
    rightEye.position.set(0.13, 0.04, 0.23);
    headGroup.add(leftEye, rightEye);

    // Cute paper smile
    const smileGeom = new THREE.BoxGeometry(0.18, 0.03, 0.02);
    const smile = new THREE.Mesh(smileGeom, darkMat);
    smile.position.set(0, -0.12, 0.23);
    headGroup.add(smile);

    // Headwear based on skin
    if (skin.headwear === 'explorer_hat') {
      const crownGeom = new THREE.CylinderGeometry(0.28, 0.32, 0.22, 6);
      const crown = new THREE.Mesh(crownGeom, accentMat);
      crown.position.y = 0.32;
      const brimGeom = new THREE.CylinderGeometry(0.45, 0.45, 0.04, 6);
      const brim = new THREE.Mesh(brimGeom, accentMat);
      brim.position.y = 0.24;
      headGroup.add(crown, brim);
    } else if (skin.headwear === 'ninja_headband') {
      const bandGeom = new THREE.BoxGeometry(0.54, 0.12, 0.47);
      const band = new THREE.Mesh(bandGeom, teamMat);
      band.position.y = 0.06;
      headGroup.add(band);

      // Origami ribbon knot on back
      const knotGeom = new THREE.BoxGeometry(0.12, 0.35, 0.05);
      const knot = new THREE.Mesh(knotGeom, teamMat);
      knot.position.set(0, 0, -0.26);
      knot.rotation.x = -0.2;
      headGroup.add(knot);
    } else if (skin.headwear === 'robot_antenna') {
      const antennaPole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.25, 4), accentMat);
      antennaPole.position.y = 0.38;
      const antennaBall = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), teamMat);
      antennaBall.position.y = 0.52;
      headGroup.add(antennaPole, antennaBall);

      // Robot eye visor
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.04), accentMat);
      visor.position.set(0, 0.04, 0.23);
      headGroup.add(visor);
    } else if (skin.headwear === 'astronaut_helmet') {
      const helmetGeom = new THREE.BoxGeometry(0.65, 0.65, 0.6);
      const helmet = new THREE.Mesh(helmetGeom, whiteMat);
      const visorGeom = new THREE.BoxGeometry(0.42, 0.26, 0.04);
      const visorMat = PaperWeaponsBuilder.createPaperMaterial('#f59e0b', 0.2); // gold foil
      const visor = new THREE.Mesh(visorGeom, visorMat);
      visor.position.set(0, 0.02, 0.31);
      helmet.add(visor);
      headGroup.add(helmet);
    } else if (skin.headwear === 'pirate_hat') {
      const hatGeom = new THREE.BoxGeometry(0.7, 0.28, 0.4);
      const hat = new THREE.Mesh(hatGeom, darkMat);
      hat.position.y = 0.35;
      headGroup.add(hat);

      // Eye patch
      const patch = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.03), darkMat);
      patch.position.set(0.13, 0.04, 0.23);
      headGroup.add(patch);
    } else if (skin.headwear === 'agent_hair') {
      const hairGeom = new THREE.BoxGeometry(0.54, 0.18, 0.48);
      const hair = new THREE.Mesh(hairGeom, darkMat);
      hair.position.y = 0.26;
      headGroup.add(hair);

      // Cool origami shades
      const shades = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.09, 0.04), darkMat);
      shades.position.set(0, 0.04, 0.24);
      headGroup.add(shades);
    }

    characterRoot.add(headGroup);

    // --- LEGS (Folded cardstock columns) ---
    const leftLegGroup = new THREE.Group();
    leftLegGroup.position.set(-0.16, 0.7, 0);
    leftLegGroup.name = 'leftLeg';
    const lLegGeom = new THREE.BoxGeometry(0.18, 0.7, 0.2);
    const lLeg = new THREE.Mesh(lLegGeom, accentMat);
    lLeg.position.y = -0.35;
    leftLegGroup.add(lLeg);
    characterRoot.add(leftLegGroup);

    const rightLegGroup = new THREE.Group();
    rightLegGroup.position.set(0.16, 0.7, 0);
    rightLegGroup.name = 'rightLeg';
    const rLegGeom = new THREE.BoxGeometry(0.18, 0.7, 0.2);
    const rLeg = new THREE.Mesh(rLegGeom, accentMat);
    rLeg.position.y = -0.35;
    rightLegGroup.add(rLeg);
    characterRoot.add(rightLegGroup);

    // --- ARMS (Hinged folded sleeves) ---
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.35, 1.3, 0);
    leftArmGroup.name = 'leftArm';
    const lArmGeom = new THREE.BoxGeometry(0.16, 0.6, 0.18);
    const lArm = new THREE.Mesh(lArmGeom, bodyMat);
    lArm.position.y = -0.3;
    leftArmGroup.add(lArm);
    characterRoot.add(leftArmGroup);

    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.35, 1.3, 0);
    rightArmGroup.name = 'rightArm';
    const rArmGeom = new THREE.BoxGeometry(0.16, 0.6, 0.18);
    const rArm = new THREE.Mesh(rArmGeom, bodyMat);
    rArm.position.y = -0.3;
    rightArmGroup.add(rArm);

    // Attach third-person weapon to right arm
    const heldWeapon = PaperWeaponsBuilder.buildWeaponModel(weaponId);
    heldWeapon.scale.set(0.8, 0.8, 0.8);
    heldWeapon.position.set(0, -0.5, 0.2);
    heldWeapon.rotation.set(-0.6, 0, 0);
    heldWeapon.name = 'heldWeapon';
    rightArmGroup.add(heldWeapon);

    characterRoot.add(rightArmGroup);

    group.userData = {
      characterRoot,
      headGroup,
      leftArmGroup,
      rightArmGroup,
      leftLegGroup,
      rightLegGroup,
      heldWeapon,
      walkCycle: 0,
      isDead: false
    };

    return group;
  }

  // Animates character walking / running / idling / death
  public static updateAnimation(character: THREE.Group, isMoving: boolean, speed: number, delta: number, isDead = false) {
    const data = character.userData;
    if (!data) return;

    if (isDead) {
      // Paper tumble / flatten effect
      if (character.rotation.x > -Math.PI / 2) {
        character.rotation.x -= delta * 5;
        character.position.y = Math.max(0.1, character.position.y - delta * 3);
      }
      return;
    } else {
      character.rotation.x = 0;
    }

    if (isMoving) {
      data.walkCycle += delta * speed * 8;
      const angle = Math.sin(data.walkCycle) * 0.55;

      data.leftLegGroup.rotation.x = angle;
      data.rightLegGroup.rotation.x = -angle;

      data.leftArmGroup.rotation.x = -angle * 0.7;
      data.rightArmGroup.rotation.x = -0.5 + angle * 0.3; // gun pointing forward

      // subtle bobbing
      data.characterRoot.position.y = Math.abs(Math.sin(data.walkCycle * 2)) * 0.08;
    } else {
      // smooth return to idle
      data.leftLegGroup.rotation.x *= 0.85;
      data.rightLegGroup.rotation.x *= 0.85;
      data.leftArmGroup.rotation.x *= 0.85;
      data.rightArmGroup.rotation.x = -0.4; // ready stance
      data.characterRoot.position.y *= 0.85;
    }
  }
}
