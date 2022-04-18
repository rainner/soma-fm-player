/**
 * ThreeJS scene light object
 */
export default {
  color: null,
  light: null,

  // create and add light to scene
  create( box, scene ) {
    this.color = new THREE.Color();
    this.color.setHSL( 0, .5, .5 );

    this.light = new THREE.PointLight( 0xffffff, 4, 400 );
    this.light.position.set( 0, 0, 420 );
    this.light.castShadow = false;
    this.light.target = scene;
    this.light.color = this.color;

    scene.add( this.light );
  },

  // animate light on frame loop
  update( box, mouse, freq ) {
    let zinit = ( box.width < 820 ) ? 260 : 320;
    let zoff  = ( box.width < 820 ) ? 80 : 100;
    this.light.distance = zinit + ( zoff * freq );
    this.color.setHSL( freq, .5, .5 );
  },
}
