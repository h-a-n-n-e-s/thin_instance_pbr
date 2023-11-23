import { ArcRotateCamera, Color4, DirectionalLight, Mesh, MeshBuilder, PBRMetallicRoughnessMaterial, Scene, StandardMaterial, Vector3, WebGPUEngine } from '@babylonjs/core'

export class Babylon {

  scene!:Scene;
  ballMesh!:Mesh;
  
  // N = 10000;
  N = 1000;
  // N = 2;

  minRadius = 0.3;
  maxRadius = 1.8;
  boxSize = 80;

  initialize = async () => {

    let balls = new Float32Array(8*this.N); // padding for webgpu
    const color = new Float32Array(4*this.N);
    const radius = new Float32Array(this.N);
    
    for (let i=0; i<this.N; i++) {

      radius[i] = this.minRadius + ( this.maxRadius - this.minRadius) * Math.random();
      balls[8*i+3] = radius[i];
      balls[8*i+7] = 4/3*Math.PI*radius[i]**3; // mass

      for (let j=0; j<3; j++) {
        balls[8*i+j] = (- 1 + 2*Math.random())*(this.boxSize/2 - 1.1 * radius[i]); // position
        // balls[8*i+j+4] = - 0.5 + 1.0*Math.random(); // velocity
        color[4*i+j] = Math.random();
      }
      color[4*i+3] = 1; // alpha?

      // rigid rotation
      const r = Math.sqrt(balls[8*i]**2 + balls[8*i+2]**2);
      balls[8*i+4] =   0.01 * r * balls[8*i+2];
      balls[8*i+6] = - 0.01 * r * balls[8*i];
      
    }
    
    // scene //////////////////////////////////////////////

    const canvas = document.createElement('canvas');
    canvas.id = 'canvas';
    document.body.appendChild(canvas);

    // const engine = new Engine(canvas, true);
    const engine = new WebGPUEngine(canvas);
    await engine.initAsync();

    this.scene = new Scene(engine);
    
    this.ballMesh = MeshBuilder.CreateIcoSphere('balls', {radius:this.minRadius, flat:false, subdivisions:6});
    
    // material ///////////////////////////////////////////

    const mat = new StandardMaterial('mat');
    mat.alpha = 1;
    
    const pbrMat = new PBRMetallicRoughnessMaterial('pbrMat');
    pbrMat.metallic = 0.6;
    pbrMat.roughness = 0.4;

    this.ballMesh.material = mat;
    // this.ballMesh.material = pbrMat;

    // thin instances /////////////////////////////////////

    const bufferMatrices = new Float32Array(16*this.N);
    for (let i=0; i<this.N; i++) {
      const s = radius[i]/this.minRadius; // scale
      bufferMatrices[16*i] = s;
      bufferMatrices[16*i+5] = s;
      bufferMatrices[16*i+10] = s;
      bufferMatrices[16*i+15] = 1;
    }
    
    this.ballMesh.thinInstanceSetBuffer('matrix', bufferMatrices, 16);
    this.ballMesh.thinInstanceSetBuffer('color', color, 4, true);

    const updateInstances = () => {
      for (let i=0; i<this.N; i++) {
        bufferMatrices[16*i+12] = balls[8*i];
        bufferMatrices[16*i+13] = balls[8*i+1];
        bufferMatrices[16*i+14] = balls[8*i+2];
      }
      this.ballMesh.thinInstanceBufferUpdated('matrix');
    }
    updateInstances();

    // scene setup ////////////////////////////////////////

    this.scene.clearColor = new Color4(.1, .1, .1, 1);

    const camera = new ArcRotateCamera('cam', Math.PI/2, Math.PI/2, 160, Vector3.Zero(), this.scene);
    camera.attachControl(canvas, false);
    camera.lowerRadiusLimit = 10;
    camera.upperRadiusLimit = 160;

    const light = new DirectionalLight('light', new Vector3(0,-1,0));
    light.intensity = 2;

    const customRender = () => {

      // particle interaction code deleted for minimal repro

      engine.beginFrame();
      this.scene.render();
      engine.endFrame();

      requestAnimationFrame(customRender);
    };
    requestAnimationFrame(customRender);

    // engine.runRenderLoop(() => this.scene.render());
    window.addEventListener('resize', () => engine.resize());
  }
}