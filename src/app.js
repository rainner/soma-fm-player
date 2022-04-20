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
    volume: 100,
    // sidebar toggles
    sbActive: false,
    sbVisible: false,
    // channels stuff
    route: '/',
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
        list = _utils.sort( list, this.sortParam, this.sortOrder, false );
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
    hasErrors() {
      if ( this.errors.support || this.errors.stream ) return true;
      if ( this.errors.channels && !this.channels.length ) return true;
      return false;
    },
  },

  // custom methods
  methods: {

    // run maintenance tasks on a timer
    setupMaintenance() {
      this.itv = setInterval( () => {
        this.getChannels( this.sidebar ); // update channels
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

    // clear all error messages
    clearError( key ) {
      let errors = Object.assign( {}, this.errors );
      delete errors[ key ];
      this.errors = errors;
    },

    // check if an error has been set for a key
    hasError( key ) {
      return ( key && this.errors.hasOwnProperty( key ) );
    },

    // flush all errors
    flushErrors() {
      this.errors = {};
    },

    // show player when app is mounted
    setupEvents() {
      document.addEventListener( 'visibilitychange', e => { this.visible = ( document.visibilityState === 'visible' ) } );
      window.addEventListener( 'hashchange', e => this.applyRoute( window.location.hash ) );
      window.addEventListener( 'keydown', this.onKeyboard );
      // audio related events
      _audio.on( 'waiting', this.onWaiting );
      _audio.on( 'playing', this.onPlaying );
      _audio.on( 'ended', this.onEnded );
      _audio.on( 'error', this.onError );
    },

    // hide spinner and show player
    initPlayer() {
      setTimeout( () => {
        document.querySelector( '#_spnr' ).style.display = 'none';
        document.querySelector( '#player-wrap' ).style.opacity = '1';
        this.init = true;
      }, 100 );
    },

    // reset selected channel
    resetPlayer() {
      this.closeAudio();
      this.flushErrors();
      this.channel = {};
      this.songs = [];
    },

    // try resuming stream problem if possible
    tryAgain() {
      if ( this.hasError( 'support' ) ) {
        this.flushErrors();
        setTimeout( this.setupAudio, 1 );
      } else {
        this.flushErrors();
        this.playChannel( this.channel );
      }
    },

    // show/hide the sidebar
    toggleSidebar( toggle ) {
      const state = ( typeof toggle === 'boolean' ) ? toggle : false;
      if ( state ) {
        this.sbActive = true; // bring to front
        this.sbVisible = true; // show drawer
        this.$refs.sidebarDrawer.focus();
      } else {
        this.sbVisible = false;
        setTimeout( () => { this.sbActive = false; }, 500 );
      }
    },

    // toggle stream playback for current selected channel
    togglePlay( e ) {
      e && e.preventDefault();
      if ( this.loading ) return;
      if ( this.playing ) return this.closeAudio();
      this.playChannel( this.channel );
    },

    // save volume to store
    saveVolume() {
      _store.set( 'player_volume', this.volume );
    },

    // load saved volume from store
    loadVolume() {
      const vol = parseInt( _store.get( 'player_volume' ) ) || 100;
      this.volume = vol;
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
      if ( this.visible ) {
        const freq = _audio.getFreqData( this.playing );
        _scene.updateObjects( freq );
      }
    },

    // get channels data from api
    getChannels( sidebar ) {
      _soma.getChannels( ( err, channels ) => {
        if ( err ) return this.setError( 'channels', err );
        this.channels = channels;
        this.clearError( 'channels' );
        this.updateCurrentChannel();
        this.applyRoute( window.location.hash, sidebar );
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
        this.clearError( 'songs' );
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
      _audio.playSource( channel.mp3file );
      _audio.setVolume( this.volume );
    },

    // select a channel to play
    selectChannel( channel, play = false ) {
      if ( !channel || !channel.id ) return;
      if ( this.isCurrentChannel( channel ) ) return;
      this.closeAudio();
      this.toggleSidebar( false );
      this.setRoute( channel.route );
      this.getSongs( channel );
      this.channel = channel;
      // attempt to play only after user insteraction, triggered from clicking a channel on the list
      if ( play ) { this.playChannel( channel ); }
    },

    // set station route
    setRoute( route ) {
      route = '/'+ String( route || '' ).replace( /^[\#\/]+|[\/]+$/g, '' ).trim();
      window.location.hash = route;
      this.route = route;
    },

    // parse url hash route actions
    applyRoute( route, sidebar = false ) {
      const data   = String( route || '' ).replace( /^[\#\/]+|[\/]+$/g, '' ).trim().split( '/' );
      const action = data.length ? data.shift() : '';
      const param  = data.length ? data.shift() : '';

      // select a channel from the url
      if ( action === 'channel' && param ) {
        const channel = this.channels.filter( c => ( c.id === param ) ).shift();
        if ( channel && channel.id ) {
          return this.selectChannel( channel );
        }
      }
      // nothing to do, reset player
      this.closeAudio();
      this.resetPlayer();
      this.toggleSidebar( sidebar );
    },

    // on keyboard events
    onKeyboard( e ) {
      const k = e.key || '';
      if ( k === ' ' && this.channel.id ) return this.togglePlay();
      if ( k === 'Enter' ) return this.toggleSidebar( true );
      if ( k === 'Escape' ) return this.toggleSidebar( false );
    },

    // waiting for media to load
    onWaiting( e ) {
      if ( this.sto ) clearInterval( this.sto );
      this.sto = setTimeout( () => this.onError( e ), 10000 );
      this.playing = false;
      this.loading = true;
    },

    // audio stream playing
    onPlaying( e ) {
      this.clearError( 'stream' );
      this.playing = true;
      this.loading = false;
    },

    // audio stream ended
    onEnded( e ) {
      this.playing = false;
      this.loading = false;
    },

    // error loading stream
    onError( e ) {
      this.closeAudio();
      this.setError( 'stream', `The selected stream (${this.channel.title}) could not load, or stopped loading due to network problems.` );
      this.playing = false;
      this.loading = false;
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

    // pass height property to css
    setCssHeight( elm, height ) {
      elm.style.setProperty( '--height', `${height}px` );
    },

    // keep track of window height
    updateHeight() {
      let root = document.querySelector( ':root' );
      this.setCssHeight( root, window.innerHeight );
      window.addEventListener( 'resize', e => this.setCssHeight( root, window.innerHeight ) );
    },

    // ...
  },

  // on app mounted
  mounted() {
    this.loadSortOptions();
    this.loadFavorites();
    this.loadVolume();
    this.setupEvents();
    this.getChannels( true );
    this.setupCanvas();
    this.updateCanvas();
    this.setupMaintenance();
    this.updateHeight();
    this.initPlayer();
  },

  // on app destroyed
  destroyed() {
    this.closeAudio();
    this.clearTimers();
  }
});

