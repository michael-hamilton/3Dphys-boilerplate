/*
 * 3D physics scene
 */

import Engine from './lib/Engine';
import { $, random8BitColor, randomFloat, randomInt } from './lib/util';

(async () => {
  const E = new Engine($('root'));
  await E.init();
  let floorIsShowing = true;
  let intervalRef;

  // Add some updatable parameters to the info panel
  E.addInfoReadoutParameterItem('fps', 'FPS');
  E.addInfoReadoutParameterItem('rigid-bodies', 'Rigid Bodies');
  E.addInfoReadoutParameterItem('triangles', 'Triangles');

  // Add some instructional text to the info panel
  E.addInfoReadoutTextItem('B to make a box');
  E.addInfoReadoutTextItem('C to make a capsule');
  E.addInfoReadoutTextItem('S to make a sphere');
  E.addInfoReadoutTextItem('Space is random');
  E.addInfoReadoutTextItem('F to toggle floor');
  E.addInfoReadoutTextItem('G to toggle auto');
  E.addInfoReadoutTextItem('R to reset');

  // Executed after every render
  E.renderCallback = () => {
    E.updateInfoParameterValue('fps', Math.round(E.calcFPS()));
    E.updateInfoParameterValue('rigid-bodies', E.rigidBodies.length);
    E.updateInfoParameterValue('triangles', E.renderer.info.render.triangles);
  }

  // Set some parameters for the scene
  E.setGravity({x: 0, y: -150, z: 0});
  E.createAmbientLight(0xffffff, 0.5);
  E.createSpotLight(0xffffff, 1, {x: -10, y: 25, z: -10}, {x: 0, y: 0, z: 0});
  E.setActiveCameraPosition({x: 15, y: 20, z: -30}, {x: 0, y: 0, z: 0});

  // Creates a rigid floor
  const makeFloor = () => {
    E.createBox({x: 22, y: 7, z: 1}, {x: 0, y: 2, z: 11}, {x: 0.25, y: 0, z: 0, w: 1}, 0, 'floor', 0xcccccc);
    E.createBox({x: 1, y: 7, z: 22}, {x: -11, y: 2, z: 0}, {x: 0, y: 0, z: 0.25, w: 1}, 0, 'floor', 0xcccccc);
    E.createBox({x: 22, y: 7, z: 1}, {x: 0, y: 2, z: -11}, {x: -0.25, y: 0, z: 0, w: 1}, 0, 'floor', 0xcccccc);
    E.createBox({x: 1, y: 7, z: 22}, {x: 11, y: 2, z: 0}, {x: 0, y: 0, z: -0.25, w: 1}, 0, 'floor', 0xcccccc);
    E.createBox({x: 21, y: 2, z: 21}, {x: 0, y: 0, z: 0}, {x: 0, y: 0, z: 0, w: 1}, 0, 'floor', 0xcccccc);
  };

  makeFloor();

  // Returns an object with randomly generated props to be used for spawning new objects
  const generateRandomObjectParams = () => {
    const randomColor = random8BitColor();
    const randomScale = randomFloat(1, 0.75);
    const randomRadius = randomScale * 0.75;
    const randomLength = randomFloat(2, 1);
    const randomX = randomFloat(5, -5);
    const randomY = randomFloat(25, 20);
    const randomZ = randomFloat(5, -5);
    const randomMass = randomFloat(5 + randomScale, 5);
    const randomQuaternion = {
      x: randomFloat(360),
      y: randomFloat(360),
      z: Math.random() * 360,
      w: 1
    };

    return {
      randomColor,
      randomScale,
      randomRadius,
      randomLength,
      randomX,
      randomY,
      randomZ,
      randomMass,
      randomQuaternion
    };
  }

  // Accepts a random params object as returned by generateRandomObjectParams() and generates a random object
  const generateRandomObject = (rp) => {
    const whichFunction = randomInt(3);

    switch(whichFunction) {
      case 0:
        E.createCapsule(rp.randomRadius / 2, rp.randomLength, {x: rp.randomX, y: rp.randomY, z: rp.randomZ}, rp.randomQuaternion, rp.randomMass, 'capsule', rp.randomColor);
        break
      case 1:
        E.createSphere(rp.randomRadius, {x: rp.randomX, y: rp.randomY, z: rp.randomZ}, rp.randomQuaternion, rp.randomMass, 'sphere', rp.randomColor);
        break
      case 2:
        E.createBox(rp.randomScale, {x: rp.randomX, y: rp.randomY, z: rp.randomZ}, rp.randomQuaternion, rp.randomMass, 'box', rp.randomColor);
        break
    }
  }

  // Listen for some keyboard events and respond accordingly
  window.addEventListener('keypress', (e) => {
    const rp = generateRandomObjectParams();

    switch(e.code) {
      // Generate a sphere
      case "KeyS":
        E.createSphere(rp.randomRadius, {x: rp.randomX, y: rp.randomY, z: rp.randomZ}, rp.randomQuaternion, rp.randomMass, 'sphere', rp.randomColor);
        break;

      // Generate a box
      case "KeyB":
        E.createBox(rp.randomScale, {x: rp.randomX, y: rp.randomY, z: rp.randomZ}, rp.randomQuaternion, rp.randomMass, 'box', rp.randomColor);
        break;

      // Generate a capsule
      case "KeyC":
        E.createCapsule(rp.randomRadius / 2, rp.randomLength, {x: rp.randomX, y: rp.randomY, z: rp.randomZ}, rp.randomQuaternion, rp.randomMass, 'capsule', rp.randomColor);
        break;

      // Generate a random object
      case "Space":
        generateRandomObject(rp);
        break;

      // Delete all rigid bodies that aren't the floor
      case "KeyR":
        const tmpRigidBodies = [...E.rigidBodies];

        E.rigidBodies.forEach((rigidBody, i) => {
          if(rigidBody.name !== 'floor') {
            E.scene.remove(rigidBody);
            E.physicsUniverse.removeCollisionObject(rigidBody.userData.physicsBody.eB);
            tmpRigidBodies[i] = null;
          }
        });

        E.rigidBodies = tmpRigidBodies.filter(r => r !== null);
        break;

      // Delete all rigid bodies that aren't the floor
      case "KeyF":
        if(!floorIsShowing) {
          makeFloor();
          floorIsShowing = true;
        }
        else {
          const tmpFloorRigidBodies = [...E.rigidBodies];

          E.rigidBodies.forEach((rigidBody, i) => {
            if (rigidBody.name === 'floor') {
              E.scene.remove(rigidBody);
              E.physicsUniverse.removeCollisionObject(rigidBody.userData.physicsBody.eB);
              tmpFloorRigidBodies[i] = null;
            }
          });

          E.rigidBodies = tmpFloorRigidBodies.filter(r => r !== null);
          floorIsShowing = false;
        }
        break;

      // Automatically generate random objects
      case "KeyG":
        if(intervalRef) {
          clearInterval(intervalRef);
          intervalRef = undefined;
        }
        else {
          intervalRef = setInterval(() => {
            const rp = generateRandomObjectParams();
            generateRandomObject(rp);
          }, 0.01);
        }
    }
  });
})();
