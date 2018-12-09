/**
 * Main app JS entry file.
 */
import './scss/app.scss';
import './js/filters';
import './js/favorite';
import _soma from './js/soma';
import _audio from './js/audio';
import _scene from './js/scene';
import _utils from './js/utils';
import _store from './js/store';

// main vue app
new Vue({
  el: '#app',
  data: {
    // toggles
    init: false,
    visible: true,
    playing: false,
    loading: false,
    sidebar: false,
    volume: 0.5,
    // channels stuff
    channels: [],
    channel: {},
    songs: [],
    track: {},
    favorites: [],
    errors: {},
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

    // watch playing status
    playing() {
      if ( this.playing ) { this.startClock(); }
      else { this.stopClock(); }
    },

    // update player volume
    volume() {
      _audio.setVolume( this.volume );
    }
  },

  // computed methods
  computed: {

    // filter channels list
    channelsList() {
      let list = this.channels.slice();
      let search = this.searchText.replace( /[^\w\s\-]+/g, '' ).replace( /[\r\s\t\n]+/g, ' ' ).trim();

      if ( search && search.length > 1 ) {
        list = _utils.search( list, 'title', search );
      }
      if ( this.sortParam ) {
        list = _utils.sort( list, this.sortParam, this.sortOrder, true );
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
        case 'favorite'  : return 'Saved Favorites';
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

    // check for errors that would affect playback
    hasError() {
      if ( this.errors.channels && !this.channels.length ) return true;
      if ( this.errors.stream ) return true;
      return false;
    },
  },

  // custom methods
  methods: {

    // run maintenance tasks on a timer
    setupMaintenance() {
      this.itv = setInterval( () => {
        this.getChannels(); // update channels
        this.getSongs( this.channel ); // update channel tracks
      }, 1000 * 30 );
    },

    // set an erro message
    setError( key, err ) {
      let errors = Object.assign( {}, this.errors );
      errors[ key ] = String( err || '' ).trim();
      if ( err ) console.warn( 'ERROR('+ key +'):', err );
      this.errors = errors;
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

    // show player when app is mounted
    initPlayer() {
      document.querySelector( '#_spnr' ).style.display = 'none';
      document.querySelector( '#player-wrap' ).style.opacity = '1';
      document.addEventListener( 'visibilitychange', e => { this.visible = ( document.visibilityState === 'visible' ) } );
      window.addEventListener( 'hashchange', e => this.applyRoute( window.location.hash ) );
      window.addEventListener( 'keydown', this.onKeyboard );
      this.init = true;
    },

    // reset selected channel
    resetPlayer() {
      this.closeAudio();
      this.clearErrors();
      this.channel = {};
      this.songs = [];
    },

    // try resuming stream problem if possible
    tryAgain() {
      this.clearErrors();
      this.playChannel( this.channel );
    },

    // show/hide the sidebar
    toggleSidebar( toggle ) {
      this.sidebar = ( typeof toggle === 'boolean' ) ? toggle : false;
    },

    // show sidebar at startup if there are no errors
    initSidebar() {
      if ( this.hasError ) return;
      this.toggleSidebar( true );
    },

    // toggle stream playback for current selected channel
    togglePlay() {
      if ( this.loading ) return;
      if ( this.playing ) return this.closeAudio();
      return this.playChannel( this.channel );
    },

    // load last sort options from store
    loadSortOptions() {
      const opts = _store.get( 'sorting_data' );
      if ( opts && opts.param ) this.sortParam = opts.param;
      if ( opts && opts.order ) this.sortOrder = opts.order;
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
      _store.set( 'sorting_data', { param: this.sortParam, order: this.sortOrder } );
    },

    // load saved favs list from store
    loadFavorites() {
      const favs = _store.get( 'favorites_data' );
      if ( !Array.isArray( favs ) ) return;
      this.favorites = favs;
    },

    // save favs to a .m3u file
    saveFavorites() {
      let data = '#EXTM3U';
      for ( let id of this.favorites ) {
        const channel = this.channels.filter( c => ( c.id === id ) ).shift();
        if ( !channel ) continue;
        data += '\n\n';
        data += `#EXTINF:0,${channel.title} [SomaFM]\n`;
        data += `${channel.mp3file}`;
      }
      const elm = document.createElement( 'a' );
      elm.setAttribute( 'href', 'data:audio/mpegurl;charset=utf-8,'+ encodeURIComponent( data ) );
      elm.setAttribute( 'download', 'somafm_favorites.m3u' );
      elm.setAttribute( 'target', '_blank' );
      document.body.appendChild( elm );
      setTimeout( () => elm.click(), 100 );
      setTimeout( () => elm.remove(), 1000 );
    },

    // toggle favorite channel by id
    toggleFavorite( id, toggle ) {
      let favs = this.favorites.slice();
      favs = favs.filter( fid => ( fid !== id ) );
      if ( toggle ) favs.push( id );
      this.favorites = favs;
      this.updateCurrentChannel();
      _store.set( 'favorites_data', favs );
    },

    // setup audio routing and stream events
    setupAudio() {
      const a = _audio.setupAudio();

      a.addEventListener( 'waiting', e => {
        this.playing = false;
        this.loading = true;
      });
      a.addEventListener( 'playing', e => {
        this.setError( 'stream', '' );
        this.playing = true;
        this.loading = false;
      });
      a.addEventListener( 'ended', e => {
        this.playing = false;
        this.loading = false;
      });
      a.addEventListener( 'error', e => {
        this.closeAudio();
        this.setError( 'stream', `The selected stream (${this.channel.title}) could not load, or has stopped loading due to a network problem.` );
        this.playing = false;
        this.loading = false;
      });
    },

    // close active audio
    closeAudio() {
      _audio.stopAudio();
      this.playing = false;
    },

    // setup animation canvas
    setupCanvas() {
      _scene.setupCanvas();
    },

    // audio visualizer animation loop
    updateCanvas() {
      this.anf = requestAnimationFrame( this.updateCanvas );
      if ( !this.visible ) return;
      const freq = _audio.getFreqData();
      _scene.updateObjects( freq );
    },

    // get channels data from api
    getChannels( sidebar ) {
      _soma.getChannels( ( err, channels ) => {
        if ( err ) return this.setError( 'channels', err );
        if ( sidebar ) this.toggleSidebar( true );
        this.channels = channels;
        this.setError( 'channels', '' );
        this.updateCurrentChannel();
        this.applyRoute( window.location.hash );
      });
    },

    // get songs list for a channel from api
    getSongs( channel, cb ) {
      if ( !channel || !channel.id || !channel.songsurl ) return;
      if ( !this.isCurrentChannel( channel ) ) { this.songs = []; this.track = {}; }

      _soma.getSongs( channel, ( err, songs ) => {
        if ( err ) return this.setError( 'songs', err );
        if ( typeof cb === 'function' ) cb( songs );
        this.track = songs.shift();
        this.songs = songs.slice( 0, 3 );
        this.setError( 'songs', '' );
      });
    },

    // checks is a channel is currently selected
    isCurrentChannel( channel ) {
      if ( !channel || !channel.id || !this.channel.id ) return false;
      if ( this.channel.id !== channel.id ) return false;
      return true;
    },

    // update data for current selected channel
    updateCurrentChannel() {
      for ( let c of this.channels ) {
        // see if channel has been saved as a favorite
        c.favorite = ( this.favorites.indexOf( c.id ) >= 0 );
        // see if channel is currently selected
        if ( this.isCurrentChannel( c ) ) {
          this.channel = Object.assign( this.channel, c );
          c.active = true;
        }
      }
    },

    // play audio stream for a channel
    playChannel( channel ) {
      if ( this.playing || !channel || !channel.mp3file ) return;
      this.loading = true;
      this.clearErrors();
      _audio.playSource( channel.mp3file );
      _audio.setVolume( this.volume );
    },

    // select a channel to play
    selectChannel( channel ) {
      if ( !channel || !channel.id ) return;
      if ( this.isCurrentChannel( channel ) ) return;
      this.closeAudio();
      this.toggleSidebar( false );
      this.playChannel( channel );
      this.getSongs( channel );
      this.channel = channel;
    },

    // set station route
    setRoute( route ) {
      route = '/'+ String( route || '' ).replace( /^[\#\/]+|[\/]+$/g, '' ).trim();
      window.location.hash = route;
    },

    // parse url hash route actions
    applyRoute( route ) {
      const data   = String( route || '' ).replace( /^[\#\/]+|[\/]+$/g, '' ).trim().split( '/' );
      const action = data.length ? data.shift() : '';
      const param  = data.length ? data.shift() : '';

      if ( !action ) {
        this.closeAudio();
        this.resetPlayer();
        return;
      }
      if ( action === 'channel' && param ) {
        const channel = this.channels.filter( c => ( c.id === param ) ).shift();
        this.selectChannel( channel );
        return;
      }
    },

    // on keyboard events
    onKeyboard( e ) {
      const k = e.key || '';
      if ( k === ' ' && this.channel.id ) return this.togglePlay();
      if ( k === 'Enter' ) return this.toggleSidebar( true );
      if ( k === 'Escape' ) return this.toggleSidebar( false );
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
    this.loadSortOptions();
    this.loadFavorites();
    this.getChannels( true );
    this.setupAudio();
    this.setupCanvas();
    this.updateCanvas();
    this.setupMaintenance();
    this.initPlayer();
  },

  // on app destroyed
  destroyed() {
    this.closeAudio();
    this.clearTimers();
  }
});

