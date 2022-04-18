/**
 * Audio handler object
 */
export default {
  _context: null,
  _audio: null,
  _source: null,
  _gain: null,
  _analyser: null,
  _freq: new Uint8Array( 32 ),

  // setup audio routing
  setupAudio() {
    this._audio    = new Audio();
    this._context  = new ( window.AudioContext || window.webkitAudioContext )();
    this._source   = this._context.createMediaElementSource( this._audio );
    this._analyser = this._context.createAnalyser();
    this._gain     = this._context.createGain();

    this._analyser.fftSize = 32;
    this._source.connect( this._gain );
    this._source.connect( this._analyser );
    this._gain.connect( this._context.destination );

    if ( this._context.state === 'suspended' ) {
      this._context.resume().then( () => {
        console.log( 'Audio context has been resumed.' );
      });
    }
    this._audio.addEventListener( 'canplay', e => {
      this._freq = new Uint8Array( this._analyser.frequencyBinCount );
      this._audio.play();
    });
  },

  // add event listeners to the audio api
  on( event, callback ) {
    if ( !this._audio ) return;
    this._audio.addEventListener( event, callback );
  },

  // check if audio has been initialized before
  hasContext() {
    return this._context ? true : false;
  },

  // update and return analyser frequency data
  // this is not working on some apple devices:
  // https://bugs.webkit.org/show_bug.cgi?id=211394
  getFreqData( playing ) {
    if ( this._analyser ) {
      this._analyser.getByteFrequencyData( this._freq );
    }
    let _freq = Math.floor( this._freq[ 4 ] | 0 ) / 255;

    if ( playing ) {
      return ( _freq ) ? _freq : 0.6;
    }
    return _freq;
  },

  // set audio volume
  setVolume( volume ) {
    if ( !this._gain ) return;
    volume = parseFloat( volume ) || 0.0;
    volume = ( volume < 0 ) ? 0 : volume;
    volume = ( volume > 1 ) ? 1 : volume;
    this._gain.gain.value = volume;
  },

  // stop playing audio
  stopAudio() {
    if ( !this._audio ) return;
    try { this._audio.pause(); } catch ( e ) {}
    try { this._audio.stop(); } catch ( e ) {}
    try { this._audio.close(); } catch ( e ) {}
  },

  // play audio source url
  playSource( source ) {
    if ( !this._audio ) return;
    this.stopAudio();
    this._audio.src = String( source || '' ) + '?x=' + Date.now();
    this._audio.preload = 'metadata';
    this._audio.crossOrigin = 'anonymous';
    this._audio.autoplay = false;
    this._audio.muted = false;
    this._audio.load();
  },

}
