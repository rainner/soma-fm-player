/**
 * ThreeJS scene sphere object
 */
export default {
  group: null,
  shapes: [],
  move: new THREE.Vector3( 0, 0, 0 ),
  touch: false,
  ease: 8,

  // create and add sphere to scene
  create( box, scene ) {
    this.group   = new THREE.Object3D();
    let shape1   = new THREE.CircleGeometry( 1, 10 );
    let shape2   = new THREE.CircleGeometry( 2, 20 );
    let points   = new THREE.SphereGeometry( 100, 30, 14 ).vertices;
    let material = new THREE.MeshNormalMaterial( { transparent: true, opacity: 0, side: THREE.DoubleSide } );
    let center   = new THREE.Vector3( 0, 0, 0 );
    let radius   = 12;

    for ( let i = 0; i < points.length; i++ ) {
      let { x, y, z } = points[ i ];
      let home  = { x, y, z };
      let cycle = THREE.Math.randInt( 0, 100 );
      let pace  = THREE.Math.randInt( 10, 30 );
      let shape = new THREE.Mesh( ( i % 2 ) ? shape1 : shape2, material );

      shape.position.set( x, y, z );
      shape.lookAt( center );
      shape.userData = { radius, cycle, pace, home };
      this.group.add( shape );
    }
    this.touch = ( ( 'ontouchstart' in window ) || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0 );
    this.group.position.set( 40, 5, 0 );
    this.group.rotation.x = ( Math.PI / 2 ) + .6;
    scene.add( this.group );
  },

  // animate sphere on frame loop
  update( box, mouse, freq ) {
    let xoff = ( box.width < 800 ) ? 0 : 40;
    let zoff = ( box.width < 800 ) ? -60 : 20;
    let zmod = .5 + ( .5 * freq );

    // prevent sphere from moving left/right on touch devices
    if ( this.touch ) {
      this.group.position.x = xoff;
    } else {
      this.move.x = xoff + -( mouse.x * 0.012 );
      this.group.position.x += ( this.move.x - this.group.position.x ) / this.ease;
      this.group.position.y += ( this.move.y - this.group.position.y ) / this.ease;
    }
    // move on z-axis with music data and rotate
    this.group.position.z = zoff + ( 80 * freq );
    this.group.rotation.y -= 0.003;

    // adjust individual sphere points
    for ( let i = 0; i < this.group.children.length; i++ ) {
      let shape = this.group.children[ i ];
      let { radius, cycle, pace, home } = shape.userData;
      shape.material.opacity = .2 + ( .8 * freq );
      shape.position.set( home.x, home.y, home.z );
      shape.translateZ( zmod * Math.sin( cycle / pace ) * radius );
      shape.userData.cycle++;
    }
  },
}
