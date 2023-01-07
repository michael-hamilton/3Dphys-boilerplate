/*
 * Engine
 * © 2022 Michael Hamilton
 */

import * as THREE from 'three';
import * as AmmoLib from './ammo.js';
import { $, getChildElementsByName } from './util.js';

class Engine {
  constructor(root) {
    this.clock = new THREE.Clock();
    this.lastFrameTime = Date.now();
    this.rigidBodies = [];
    this.renderCallback = undefined;
    this.root = root;
  }

  // Initializes Ammo physics lib, then initializes graphics and physics universes
  async init() {
    this.Ammo = await AmmoLib();
    this.tmpTransformation = new this.Ammo.btTransform();

    this.initGraphicsUniverse();
    this.initPhysicsUniverse();
    this.initWindowResizeHandler();

    this.render();
  }

  // Initializes Three.js graphics
  initGraphicsUniverse() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x123672);

    this.renderer = new THREE.WebGLRenderer({antialias : true, alpha : false});
    this.renderer.setPixelRatio(window.devicePixelRatio * 0.5);
    this.renderer.setSize(this.root.clientWidth, this.root.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.root.appendChild(this.renderer.domElement) ;

    this.createPerspectiveCamera({x: 0, y: 0, z: 0}, {x: 0, y: 0, z: 0}, 50);
  }

  // Initializes Ammo.js physics
  initPhysicsUniverse() {
    const collisionConfiguration  = new this.Ammo.btDefaultCollisionConfiguration();
    const dispatcher = new this.Ammo.btCollisionDispatcher(collisionConfiguration);
    const overlappingPairCache = new this.Ammo.btDbvtBroadphase();
    const solver = new this.Ammo.btSequentialImpulseConstraintSolver();

    this.physicsUniverse = new this.Ammo.btDiscreteDynamicsWorld(dispatcher, overlappingPairCache, solver, collisionConfiguration);
  }

  // Sets a value for physics gravity
  setGravity(gravity) {
    this.physicsUniverse.setGravity(new this.Ammo.btVector3(gravity.x, gravity.y, gravity.z));
  }

  // Generic method to create a perspective camera
  createPerspectiveCamera(position, lookAt, fov) {
    this.camera = new THREE.PerspectiveCamera(fov, this.root.clientWidth / this.root.clientHeight, 1, 250);
    this.camera.position.set(position.x, position.y, position.z);
    this.camera.lookAt(lookAt.x, lookAt.y, lookAt.z);
  }

  setActiveCameraPosition(pos, lookAt = {x: 0, y: 0, z: 0}) {
    this.camera.position.set(pos.x, pos.y, pos.z);
    this.camera.lookAt(lookAt.x, lookAt.y, lookAt.z)
  }

  // Generic method to create an ambient light
  createAmbientLight(color, intensity) {
    const ambientLight = new THREE.AmbientLight(color, intensity);
    this.scene.add(ambientLight);
  }

  // Generic method to create a spotlight
  createSpotLight(color, intensity, position, lookAt) {
    const spotLight = new THREE.SpotLight(color, intensity);
    spotLight.position.set(position.x, position.y, position.z);
    spotLight.lookAt(lookAt.x, lookAt.y, lookAt.z);
    spotLight.castShadow = true;
    this.scene.add(spotLight);
  }

  // Generic method to create a cube with physics
  createBox(scale, position, quaternion, mass, name = 'box', color = 0xffffff) {
    if(typeof scale === 'number') {
      scale = {
        x: scale,
        y: scale,
        z: scale
      }
    }

    const geometry = new THREE.BoxGeometry(scale.x, scale.y, scale.z);
    const material = new THREE.MeshPhongMaterial({color});
    const cube = new THREE.Mesh(geometry, material);
    cube.castShadow = true;
    cube.receiveShadow = true;
    cube.name = name;

    cube.position.set(this.Vector3(position.x, position.y, position.z));
    this.scene.add(cube);

    const transform = new this.Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin( new this.Ammo.btVector3(position.x, position.y, position.z));
    transform.setRotation( new this.Ammo.btQuaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w));

    const defaultMotionState = new this.Ammo.btDefaultMotionState(transform);

    const structColShape = new this.Ammo.btBoxShape(new this.Ammo.btVector3(scale.x * 0.5, scale.y * 0.5, scale.z * 0.5));
    structColShape.setMargin(0.05);

    const localInertia = new this.Ammo.btVector3(0, 0, 0);
    structColShape.calculateLocalInertia(mass, localInertia);

    const CubeRigidBodyInfo = new this.Ammo.btRigidBodyConstructionInfo(mass, defaultMotionState, structColShape, localInertia);
    const CubeRigidBody = new this.Ammo.btRigidBody( CubeRigidBodyInfo );

    CubeRigidBody.setRestitution(0.75);

    this.physicsUniverse.addRigidBody( CubeRigidBody );
    cube.userData.physicsBody = CubeRigidBody;
    this.rigidBodies.push(cube);

    return cube;
  }

  // Generic method to create a capsule with physics
  createCapsule(radius, length, position, quaternion, mass, name = 'capsule', color = 0xffffff) {
    const geometry = new THREE.CapsuleGeometry(radius, length);
    const material = new THREE.MeshPhongMaterial({color});
    const capsule = new THREE.Mesh(geometry, material);
    capsule.castShadow = true;
    capsule.receiveShadow = true;
    capsule.name = name;

    capsule.position.set(this.Vector3(position.x, position.y, position.z));
    this.scene.add(capsule);

    const transform = new this.Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new this.Ammo.btVector3(position.x, position.y, position.z));
    transform.setRotation(new this.Ammo.btQuaternion( quaternion.x, quaternion.y, quaternion.z, quaternion.w));

    const defaultMotionState = new this.Ammo.btDefaultMotionState(transform);

    const structColShape = new this.Ammo.btCapsuleShape(radius, length);
    structColShape.setMargin(0.05);

    const localInertia = new this.Ammo.btVector3(0, 0, 0);
    structColShape.calculateLocalInertia(mass, localInertia);

    const CapsuleRigidBodyInfo = new this.Ammo.btRigidBodyConstructionInfo(mass, defaultMotionState, structColShape, localInertia);
    const CapsuleRigidBody = new this.Ammo.btRigidBody(CapsuleRigidBodyInfo);

    CapsuleRigidBody.setRestitution(0.75);

    this.physicsUniverse.addRigidBody(CapsuleRigidBody);
    capsule.userData.physicsBody = CapsuleRigidBody;
    this.rigidBodies.push(capsule);
  }

  // Generic method to create a sphere with physics
  createSphere(radius, position, quaternion, mass, name = 'sphere', color = 0xffffff) {
    const geometry = new THREE.SphereGeometry(radius, 32, 16);
    const material = new THREE.MeshPhongMaterial({color});
    const sphere = new THREE.Mesh(geometry, material);
    sphere.castShadow = true;
    sphere.receiveShadow = true;
    sphere.name = name;

    sphere.position.set(this.Vector3(position.x, position.y, position.z));
    this.scene.add(sphere);

    const transform = new this.Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new this.Ammo.btVector3(position.x, position.y, position.z));
    transform.setRotation(new this.Ammo.btQuaternion( quaternion.x, quaternion.y, quaternion.z, quaternion.w));

    const defaultMotionState = new this.Ammo.btDefaultMotionState(transform);

    const structColShape = new this.Ammo.btSphereShape(radius);
    structColShape.setMargin(0.05);

    const localInertia = new this.Ammo.btVector3(0, 0, 0);
    structColShape.calculateLocalInertia(mass, localInertia);

    const SphereRigidBodyInfo = new this.Ammo.btRigidBodyConstructionInfo(mass, defaultMotionState, structColShape, localInertia);
    const SphereRigidBody = new this.Ammo.btRigidBody(SphereRigidBodyInfo);

    SphereRigidBody.setRestitution(0.75);

    this.physicsUniverse.addRigidBody(SphereRigidBody);
    sphere.userData.physicsBody = SphereRigidBody;
    this.rigidBodies.push(sphere);

    return sphere;
  }

  // Update physics
  updatePhysics(deltaTime) {
    this.physicsUniverse.stepSimulation(deltaTime, 10);

    this.rigidBodies.forEach((rigidBody) => {
      const Graphics_Object = rigidBody;
      const Physics_Object = Graphics_Object.userData.physicsBody;
      const motionState = Physics_Object.getMotionState();

      if (motionState) {
        motionState.getWorldTransform(this.tmpTransformation);

        const newPosition = this.tmpTransformation.getOrigin();
        const newQuaternion = this.tmpTransformation.getRotation();

        Graphics_Object.position.set(newPosition.x(), newPosition.y(), newPosition.z());
        Graphics_Object.quaternion.set(newQuaternion.x(), newQuaternion.y(), newQuaternion.z(), newQuaternion.w());
      }
    });
  }

  Vector3(x, y, z) {
    return new THREE.Vector3(x, y, z);
  }

  // Handles updating renderer and camera when the window size changes
  initWindowResizeHandler() {
    window.addEventListener('resize', () => {
      this.renderer.setSize(this.root.clientWidth, this.root.clientHeight);
      this.camera.aspect = this.root.clientWidth / this.root.clientHeight;
      this.camera.updateProjectionMatrix();
    });
  }

  // Returns current framerate
  calcFPS() {
    let delta = (Date.now() - this.lastFrameTime) / 1000;
    this.lastFrameTime = Date.now();
    return 1 / delta;
  }

  // Adds an updatable readout parameter to the info panel
  addInfoReadoutParameterItem(name, prettyName = name) {
    $('parameter-readout').insertAdjacentHTML('beforeend', `<p name="param-${name}">${prettyName}: <span name="${name}-value"></span></p>`);
  }

  // Adds a static readout text item to the info panel
  addInfoReadoutTextItem(value) {
    $('info-readout').insertAdjacentHTML('beforeend', `<p>${value}</p>`);
  }

  // Updates the readout parameter of the given name with the provided value
  updateInfoParameterValue(name, value) {
    const element = getChildElementsByName($('parameter-readout'), `${name}-value`);

    element.innerHTML = value;
  }

  // Render loop
  render() {
    const deltaTime = this.clock.getDelta();
    this.updatePhysics(deltaTime);
    this.renderer.render(this.scene, this.camera);

    if(typeof this.renderCallback === 'function') {
      this.renderCallback();
    }

    requestAnimationFrame(this.render.bind(this));
  }
}
 export default Engine;