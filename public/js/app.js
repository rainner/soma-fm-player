/**
 * Soma FM Web Player
 * Author: Rainner Lins (2018)
 * Site: https://rainnerlins.com/
 */

//               .andAHHAbnn.
//            .aAHHHAAUUAAHHHAn.
//           dHP^~"        "~^THb.
//     .   .AHF                YHA.   .
//     |  .AHHb.              .dHHA.  |
//     |  HHAUAAHAbn      adAHAAUAHA  |
//     I  HF~"_____        ____ ]HHH  I
//    HHI HAPK""~^YUHb  dAHHHHHHHHHH IHH
//    HHI HHHD> .andHH  HHUUP^~YHHHH IHH
//    YUI ]HHP     "~Y  P~"     THH[ IUP
//     "  `HK                   ]HH'  "
//         THAn.  .d.aAAn.b.  .dHHP
//         ]HHHHAAUP" ~~ "YUAAHHHH[
//         `HHP^~"  .annn.  "~^YHH'
//          YHb    ~" "" "~    dHF
//           "YAb..abdHHbndbndAP"
//            THHAAb.  .adAHHF
//             "UHHHHHHHHHHU"
//               ]HHUUHHHHHH[
//             .adHHb "HHHHHbn.
//      ..andAAHHHHHHb.AHHHHHHHAAbnn..
// .ndAAHHHHHHUUHHHHHHHHHHUP^~"~^YUHHHAAbn.
//   "~^YUHHP"   "~^YUHHUP"        "^YUP^"
//        ""         "~~"

/**
 * Sphere object
 */
const Sphere = {
  group  : null,
  shapes : [],
  move   : new THREE.Vector3( 0, 0, 0 ),
  ease   : 8,

  create( box, scene ) {
    this.group   = new THREE.Object3D();
    let shape1   = new THREE.CircleGeometry( 1, 10 );
    let shape2   = new THREE.CircleGeometry( 2, 20 );
    let points   = new THREE.SphereGeometry( 100, 30, 14 ).vertices;
    let material = new THREE.MeshLambertMaterial( { color: 0xffffff, opacity: 0, side: THREE.DoubleSide } );
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
    this.group.position.set( 500, 0, 0 );
    this.group.rotation.x = ( Math.PI / 2 ) + .6;
    scene.add( this.group );
  },

  update( box, mouse, freq ) {
    let bass = ( Math.floor( freq[ 1 ] | 0 ) / 255 );
    this.move.x = ( box.width * .06 ) + -( mouse.x * 0.02 );
    this.group.position.x += ( this.move.x - this.group.position.x ) / this.ease;
    this.group.position.y += ( this.move.y - this.group.position.y ) / this.ease;
    this.group.position.z = 10 + ( bass * 80 );
    this.group.rotation.y -= 0.003;

    for ( let i = 0; i < this.group.children.length; i++ ) {
      let shape = this.group.children[ i ];
      let { radius, cycle, pace, home } = shape.userData;
      shape.position.set( home.x, home.y, home.z );
      shape.translateZ( bass * Math.sin( cycle / pace ) * radius );
      shape.userData.cycle++;
    }
  },
};

/**
 * Vue filters
 */
Vue.filter( 'toCommas', ( num, decimals ) => {
 let o = { style: 'decimal', minimumFractionDigits: decimals, maximumFractionDigits: decimals };
 return new Intl.NumberFormat( 'en-US', o ).format( num );
});
Vue.filter( 'toSpaces', ( str ) => {
 return String( str || '' ).trim().replace( /[^\w\`\'\-]+/g, ' ' ).trim();
});
Vue.filter( 'toText', ( str, def ) => {
 str = String( str || '' ).replace( /[^\w\`\'\-\.\!\?]+/g, ' ' ).trim();
 return str || String( def || '' );
});

/**
 * Vue app
 */
new Vue({
  el: '#app',
  data: {
    // toggles
    init: false,
    playing: false,
    loading: false,
    sidebar: false,
    // channels stuff
    channels: [], // all channels
    channel: {},  // selected channel
    songs: [],    // recent tracks
    track: {},    // current track
    errors: {},   // error messages
    // animation stuff
    fxBox: null,
    fxRenderer: null,
    fxScene: null,
    fxColor: null,
    fxLight: null,
    fxCamera: null,
    fxMouse: { x: 0, y: 0 },
    fxObjects: [],
    // audio stuff
    audio: new Audio(),
    context: new AudioContext(),
    freqData: new Uint8Array(),
    audioSrc: null,
    audioGain: null,
    analyser: null,
    volume: 0.5,
    // timer stuff
    timeStart: 0,
    timeDisplay: '00:00:00',
    timeItv: null,
    // sorting stuff
    searchText: '',
    sortParam: 'listeners',
    sortOrder: 'desc',
    // timer stuff
    anf: null,
    sto: null,
    itv: null,
  },

  // watch methods
  watch: {

    // when app is ready
    init() {
      setTimeout( this.setupCanvas, 100 );
      setTimeout( this.initSidebar, 500 );
    },

    // watch playing status
    playing() {
      if ( this.playing ) { this.startClock(); }
      else { this.stopClock(); }
    },

    // update player volume
    volume() {
      this.setVolume( this.volume );
    }
  },

  // computed methods
  computed: {

    // filter channels list
    channelsList() {
      let list = this.channels.slice();
      let search = this.searchText.replace( /[^\w\s\-]+/g, '' ).replace( /[\r\s\t\n]+/g, ' ' ).trim();

      if ( search && search.length > 1 ) {
        let reg = new RegExp( '^('+ search +')', 'i' );
        list = list.filter( i => reg.test( i.title +' '+ i.description ) );
      }
      if ( this.sortParam ) {
        list = this.sortList( list, this.sortParam, this.sortOrder );
      }
      if ( this.channel.id ) {
        list = list.map( i => {
          i.active = ( this.channel.id === i.id ) ? true : false;
          return i;
        });
      }
      return list;
    },

    // filter songs list
    songsList() {
      let list = this.songs.slice();
      return list;
    },

    // sort-by label for buttons, etc
    sortLabel() {
      switch ( this.sortParam ) {
        case 'title'     : return 'Station Name';
        case 'listeners' : return 'Listeners Count';
        case 'genre'     : return 'Music Genre';
      }
    },

    // check if audio can be played
    canPlay() {
      return ( this.channel.id && !this.loading ) ? true : false;
    },

    // check if a channel is selected
    hasChannel() {
      return this.channel.id ? true : false;
    },

    // check if there are tracks loaded
    hasSongs() {
      return this.songs.length ? true : false;
    },

    // check if there are errors to show
    hasErrors() {
      return ( this.checkError( 'init' ) || this.checkError( 'stream' ) ) ? true : false;
    },
  },

  // custom methods
  methods: {

    // set an erro message
    setError( key, err ) {
      let errors = Object.assign( {}, this.errors );
      errors[ key ] = String( err || '' ).trim();
      if ( err ) console.warn( 'ERROR('+ key +'):', err );
      this.errors = errors;
      this.init = true;
    },

    // check if an error has been set for a key
    checkError( key ) {
      return ( key && this.errors.hasOwnProperty( key ) && this.errors[ key ] );
    },

    // clear all error messages
    clearErrors() {
      Object.keys( this.errors ).forEach( key => {
        this.errors[ key ] = '';
      });
    },

    // reset selected channel
    resetPlayer() {
      this.channel = {};
      this.songs = [];
      this.clearErrors();
      this.getChannels( true );
    },

    // try resuming stream problem if possible
    tryAgain() {
      if ( this.checkError( 'init' ) ) return this.resetPlayer();
      if ( this.channel.id ) return this.playChannel( this.channel );
    },

    // show/hide the sidebar
    toggleSidebar( toggle ) {
      this.sidebar = ( typeof toggle === 'boolean' ) ? toggle : false;
    },

    // show sidebar at startup if there are no errors
    initSidebar() {
      if ( this.checkError( 'init' ) ) return;
      this.toggleSidebar( true );
    },

    // toggle stream playback for current selected channel
    togglePlay() {
      if ( this.loading ) return;
      if ( this.playing ) return this.closeAudio();
      if ( this.channel.id ) return this.playChannel( this.channel );
    },

    // toggle sort order
    toggleSortOrder() {
      this.sortOrder = ( this.sortOrder === 'asc' ) ? 'desc' : 'asc';
    },

    // apply sorting and toggle order
    sortBy( param, order ) {
      if ( this.sortParam === param ) { this.toggleSortOrder(); }
      else { this.sortOrder = order || 'asc'; }
      this.sortParam = param;
    },

    // sort an array by key and order
    sortList( list, param, order ) {
      return list.sort( ( a, b ) => {
        if ( a.hasOwnProperty( param ) && b.hasOwnProperty( param ) ) {
          let _a = a[ param ];
          let _b = b[ param ];

          _a = ( typeof _a === 'string' ) ? _a.toUpperCase() : _a;
          _b = ( typeof _b === 'string' ) ? _b.toUpperCase() : _b;

          if ( order === 'asc' ) {
            if ( _a < _b ) return -1;
            if ( _a > _b ) return 1;
          }
          if ( order === 'desc' ) {
            if ( _a > _b ) return -1;
            if ( _a < _b ) return 1;
          }
        }
        return 0;
      });
    },

    // get channels data from api
    getChannels( sidebar ) {
      let endpoint = 'https://somafm.com/channels.json';
      let emsg = [ 'There was a problem trying to load the list of available channels from SomaFM.' ];

      axios.get( endpoint ).then( res => {
        if ( !res || !res.data || !res.data.channels ) {
          emsg.push( 'The API response did not have any channels data available at this time.' );
          emsg.push( 'Status: Channels API Error.' );
          return this.setError( 'channels', emsg.join( ' ' ) );
        }
        for ( let c of res.data.channels ) {
          if ( !Array.isArray( c.playlists ) ) continue;
          // filter and sanitize list of channels
          c.twitter   = c.twitter ? 'https://twitter.com/@'+ c.twitter : ''; // full twitter url
          c.plsfile   = c.playlists.filter( p => ( p.format === 'mp3' && /^(highest|high)$/.test( p.quality ) ) ).shift().url || '';
          c.mp3file   = 'http://ice1.somafm.com/'+ c.id +'-128-mp3'; // assumed stream url
          c.songsurl  = 'https://somafm.com/songs/'+ c.id +'.json'; // songs data url
          c.infourl   = 'https://somafm.com/'+ c.id +'/'; // channel page url
          c.listeners = c.listeners | 0; // force numeric
          c.updated   = c.updated | 0; // force numeric
          c.active    = false; // select state
          // update selected channel
          if ( this.isCurrentChannel( c ) ) {
            c.active = true;
            this.channel = Object.assign( this.channel, c );
          }
        }
        this.channels = res.data.channels.slice();
        if ( sidebar ) this.toggleSidebar( true );
        this.setError( 'init', '' );
        this.setError( 'channels', '' );
      })
      .catch( e => {
        emsg.push( 'Try again, or check your internet connection.' );
        emsg.push( 'Status: '+ String( e.message || 'Channels API Error' ) +'.' );
        let errstr = emsg.join( ' ' );
        if ( !this.channels.length ) this.setError( 'init', errstr );
        this.setError( 'channels', errstr );
      });
    },

    // fetch songs for a channel
    fetchSongs( channel, cb ) {
      if ( !channel || !channel.id || !channel.songsurl ) return;
      if ( !this.isCurrentChannel( channel ) ) { this.songs = []; this.track = {}; }
      let emsg = [ 'There was a problem trying to load the list of songs for channel '+ channel.title +' from SomaFM.' ];

      axios.get( channel.songsurl ).then( res => {
        if ( !res || !res.data || !res.data.songs ) {
          emsg.push( 'The API response did not have any songs data available at this time.' );
          emsg.push( 'Status: Songs API Error.' );
          return this.setError( 'songs', emsg.join( ' ' ) );
        }
        let songs  = res.data.songs.slice();
        this.track = songs.shift();
        this.songs = songs.slice( 0, 3 );
        this.setError( 'songs', '' );
        if ( typeof cb === 'function' ) cb( songs );
      })
      .catch( e => {
        emsg.push( 'Try again, or check your internet connection.' );
        emsg.push( 'Status: '+ String( e.message || 'Songs API Error' ) +'.' );
        this.setError( 'songs', emsg.join( ' ' ) );
      });
    },

    // run maintenance tasks on a timer
    setupMaintenance() {
      this.itv = setInterval( () => {
        this.getChannels(); // update channels
        this.fetchSongs( this.channel ); // update channel tracks
        // ...
      }, 1000 * 30 );
    },

    // setup animation canvas
    setupCanvas() {
      if ( !this.$refs.playerWrap ) return;
      if ( !this.$refs.playerCanvas ) return;
      // default canvas and player dimensions
      const player = this.$refs.playerWrap;
      const canvas = this.$refs.playerCanvas;
      // setup THREE renderer and replace default canvas
      this.fxBox = player.getBoundingClientRect();
      this.fxScene = new THREE.Scene();
      this.fxRenderer = new THREE.WebGLRenderer( { alpha: true, antialias: true, precision: 'highp' } );
      this.fxRenderer.setClearColor( 0x000000, 0 );
      this.fxRenderer.setPixelRatio( window.devicePixelRatio );
      this.fxRenderer.domElement.className = canvas.className;
      // setup camera
      this.fxCamera = new THREE.PerspectiveCamera( 60, ( this.fxBox.width / this.fxBox.height ), 0.1, 20000 );
      this.fxCamera.lookAt( this.fxScene.position );
      this.fxCamera.position.set( 0, 0, 300 );
      this.fxCamera.rotation.set( 0, 0, 0 );
      // light color
      this.fxColor = new THREE.Color();
      this.fxColor.setHSL( this.fxHue, 1, .5 );
      // setup light source
      this.fxLight = new THREE.PointLight( 0xffffff, 4, 400 );
      this.fxLight.position.set( 0, 0, 420 );
      this.fxLight.castShadow = false;
      this.fxLight.target = this.fxScene;
      this.fxLight.color = this.fxColor;
      this.fxScene.add( this.fxLight );
      // setup canvas and events
      canvas.parentNode.replaceChild( this.fxRenderer.domElement, canvas );
      window.addEventListener( 'mousemove', this.updateMousePosition );
      window.addEventListener( 'resize', this.updateStageSize );
      // add objects
      this.fxObjects.push( Sphere );
      // setup objects and start animation
      for ( let o of this.fxObjects ) o.create( this.fxBox, this.fxScene );
      this.updateStageSize();
      this.updateAnimations();
    },

    // update mouse position from center of canvas
    updateMousePosition( e ) {
      if ( !this.fxBox || !e ) return;
      this.fxMouse.x = Math.max( 0, e.pageX || e.clientX || 0 ) - ( this.fxBox.left + ( this.fxBox.width / 2 ) );
      this.fxMouse.y = Math.max( 0, e.pageY || e.clientY || 0 ) - ( this.fxBox.top + ( this.fxBox.height / 2 ) );
    },

    // update canvas size
    updateStageSize() {
      if ( !this.$refs.playerWrap || !this.fxRenderer ) return;
      this.fxBox = this.$refs.playerWrap.getBoundingClientRect();
      this.fxCamera.aspect = ( this.fxBox.width / this.fxBox.height );
      this.fxCamera.updateProjectionMatrix();
      this.fxRenderer.setSize( this.fxBox.width, this.fxBox.height );
    },

    // update light color based on audio freq
    updateStageLight() {
      let dist  = Math.floor( this.freqData[ 1 ] | 0 ) / 255;
      let color = Math.floor( this.freqData[ 16 ] | 0 ) / 255;
      this.fxLight.distance = 360 + ( 140 * dist );
      this.fxColor.setHSL( color, .5, .5 );
    },

    // update custom objects in 3d scene
    updateSceneObjects() {
      for ( let o of this.fxObjects ) {
        o.update( this.fxBox, this.fxMouse, this.freqData );
      }
    },

    // audio visualizer animation loop
    updateAnimations() {
      this.anf = requestAnimationFrame( this.updateAnimations );
      if ( !this.fxRenderer || !this.fxCamera || !this.analyser || !this.freqData ) return;
      this.analyser.getByteFrequencyData( this.freqData );
      this.updateSceneObjects();
      this.updateStageLight();
      this.fxRenderer.render( this.fxScene, this.fxCamera );
    },

    // setup audio routing and stream events
    setupAudio() {
      // setup audio sources
      this.audioSrc  = this.context.createMediaElementSource( this.audio );
      this.audioGain = this.context.createGain();
      this.analyser  = this.context.createAnalyser();
      // connect sources
      this.audioSrc.connect( this.audioGain );
      this.audioSrc.connect( this.analyser );
      this.audioGain.connect( this.context.destination );
      this.setVolume( this.volume );
      // check when stream can start playing
      this.audio.addEventListener( 'canplay', e => {
        this.audio.play();
        this.freqData = new Uint8Array( this.analyser.frequencyBinCount );
      });
      // check if stream is buffering
      this.audio.addEventListener( 'waiting', e => {
        this.playing = false;
        this.loading = true;
      });
      // check if stream is done buffering
      this.audio.addEventListener( 'playing', e => {
        this.setError( 'stream', '' );
        this.playing = true;
        this.loading = false;
      });
      // check if stream has ended
      this.audio.addEventListener( 'ended', e => {
        this.playing = false;
        this.loading = false;
      });
      // check for steam error
      this.audio.addEventListener( 'error', e => {
        let emsg = [];
        emsg.push( 'The selected audio stream could not load, or has stopped loading.' );
        emsg.push( 'Try again, or check your internet connection.' );
        emsg.push( 'Status: '+ String( e.message || 'Stream URL Error' ) +'.' );
        this.setError( 'stream', emsg.join( ' ' ) );
        this.playing = false;
        this.loading = false;
      });
    },

    // set audio volume
    setVolume( volume ) {
      if ( !this.audioGain ) return;
      volume = parseFloat( volume ) || 0;
      volume = ( volume < 0 ) ? 0 : volume;
      volume = ( volume > 1 ) ? 1 : volume;
      this.audioGain.gain.value = volume;
    },

    // checks is a channel is currently selected
    isCurrentChannel( channel ) {
      if ( !channel || !channel.id || !this.channel.id ) return false;
      if ( this.channel.id !== channel.id ) return false;
      return true;
    },

    // play audio stream for a channel
    playChannel( channel ) {
      if ( this.playing ) return;
      this.clearErrors();
      this.audio.src = channel.mp3file +'/?x='+ Date.now();
      this.audio.crossOrigin = 'anonymous';
      this.audio.load();
    },

    // select a channel to play
    selectChannel( channel ) {
      if ( !channel || !channel.id ) return;
      if ( this.isCurrentChannel( channel ) ) return;
      this.closeAudio();
      this.toggleSidebar( false );
      this.playChannel( channel );
      this.fetchSongs( channel );
      this.channel = channel;
    },

    // close active audio
    closeAudio() {
      this.setError( 'stream', '' );
      try { this.audio.pause(); } catch ( e ) {}
      try { this.audio.stop(); } catch ( e ) {}
      try { this.audio.close(); } catch ( e ) {}
      this.playing = false;
    },

    // start tracking playback time
    startClock() {
      this.stopClock();
      this.timeStart = Date.now();
      this.timeItv = setInterval( this.updateClock, 1000 );
      this.updateClock();
    },

    // update tracking playback time
    updateClock() {
      let p = n => ( n < 10 ) ? '0'+n : ''+n;
      let elapsed = ( Date.now() - this.timeStart ) / 1000;
      let seconds = Math.floor( elapsed % 60 );
      let minutes = Math.floor( elapsed / 60 % 60 );
      let hours   = Math.floor( elapsed / 3600 );
      this.timeDisplay = p( hours ) +':'+ p( minutes ) +':'+ p( seconds );
    },

    // stop tracking playback time
    stopClock() {
      if ( this.timeItv ) clearInterval( this.timeItv );
      this.timeItv = null;
    },

    // clear timer refs
    clearTimers() {
      if ( this.sto ) clearTimeout( this.sto );
      if ( this.itv ) clearInterval( this.itv );
      if ( this.anf ) cancelAnimationFrame( this.anf );
    },
  },

  // on app mounted
  mounted() {
    this.getChannels();
    this.setupAudio();
    this.setupMaintenance();
  },

  // on app destroyed
  destroyed() {
    this.closeAudio();
    this.clearTimers();
  }
});
