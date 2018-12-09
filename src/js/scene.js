/**
 * ThreeJS scene handler
 */
import Light from './light';
import Sphere from './sphere';

export default {
  _wrap: null,
  _canvas: null,
  _renderer: null,
  _scene: null,
  _camera: null,
  _box: null,
  _mouse: { x: 0, y: 0 },
  _objects: [],

  // setup animation canvas
  setupCanvas() {
    this._wrap = document.querySelector( '#player-wrap' );
    this._canvas = document.querySelector( '#player-canvas' );
    this._box = this._wrap.getBoundingClientRect();

    // setup scene and renderer
    this._scene = new THREE.Scene();
    this._renderer = new THREE.WebGLRenderer( { canvas: this._canvas, alpha: true, antialias: true, precision: 'lowp' } );
    this._renderer.setClearColor( 0x000000, 0 );
    this._renderer.setPixelRatio( window.devicePixelRatio );

    // setup camera
    this._camera = new THREE.PerspectiveCamera( 60, ( this._box.width / this._box.height ), 0.1, 20000 );
    this._camera.lookAt( this._scene.position );
    this._camera.position.set( 0, 0, 300 );
    this._camera.rotation.set( 0, 0, 0 );

    // add and create objects
    this._objects.push( Light );
    this._objects.push( Sphere );
    for ( let o of this._objects ) o.create( this._box, this._scene );

    // setup events
    window.addEventListener( 'mousemove', this.updateMouse.bind( this ) );
    window.addEventListener( 'resize', this.updateSize.bind( this ) );
    this.updateMouse();
    this.updateSize();
  },

  // update custom objects in 3d scene
  updateObjects( freq ) {
    for ( let o of this._objects ) o.update( this._box, this._mouse, freq );
    this._renderer.render( this._scene, this._camera );
  },

  // update canvas size
  updateSize() {
    if ( !this._wrap || !this._canvas ) return;
    this._box = this._wrap.getBoundingClientRect();
    this._canvas.width = this._box.width;
    this._canvas.height = this._box.height;
    this._camera.aspect = ( this._box.width / this._box.height );
    this._camera.updateProjectionMatrix();
    this._renderer.setSize( this._box.width, this._box.height );
  },

  // update mouse position from center of canvas
  updateMouse( e ) {
    if ( !this._box ) return;
    const centerX = this._box.left + ( this._box.width / 2 );
    const centerY = this._box.top + ( this._box.height / 2 );

    if ( e ) {
      this._mouse.x = Math.max( 0, e.pageX || e.clientX || 0 ) - centerX;
      this._mouse.y = Math.max( 0, e.pageY || e.clientY || 0 ) - centerY;
    } else {
      this._mouse.x = centerX;
      this._mouse.y = centerY;
    }
  },
}
