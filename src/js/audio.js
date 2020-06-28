/**
 * Audio handler object
 */
export default {
  _context: null,
  _audio: null,
  _freq: null,
  _source: null,
  _gain: null,
  _analyser: null,

  // setup audio routing
  setupAudio() {
    const AudioContext = window.AudioContext || window.webkitAudioContext || false;
    if ( !AudioContext ) return false;

    this._audio = new Audio();
    this._freq = new Uint8Array( 1024 );
    this._context = new AudioContext();
    this._source = this._context.createMediaElementSource( this._audio );
    this._analyser = this._context.createAnalyser();
    this._gain = this._context.createGain();

    this._source.connect( this._gain );
    this._source.connect( this._analyser );
    this._gain.connect( this._context.destination );

    this._audio.addEventListener( 'canplaythrough', e => {
      this._freq = new Uint8Array( this._analyser.frequencyBinCount );
      this._audio.play();
    });
    return this._audio;
  },

  // get audio context state
  getState( state ) {
    if ( !this._context ) return '';
    if ( state ) return ( this._context.state === state );
    return this._context.state;
  },

  // update and return analyser frequency data
  getFreqData() {
    if ( this._analyser ) {
      this._analyser.getByteFrequencyData( this._freq );
    }
    return this._freq;
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

  // resume suspended audio in chrome
  resumeAudio( callback ) {
    if ( !this._context ) return;
    this._context.resume().then( callback ).catch( e => {} );
  },

  // play audio source url
  playSource( source ) {
    if ( !this._audio ) return;
    this.stopAudio();
    this.resumeAudio();
    this._audio.src = String( source || '' ) + '?x=' + Date.now();
    this._audio.crossOrigin = 'anonymous';
    this._audio.load();
  },

}
