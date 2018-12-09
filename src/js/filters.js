/**
 * Vue custom filters
 */

// comma separate long numerical values
Vue.filter( 'toCommas', ( num, decimals ) => {
  let o = { style: 'decimal', minimumFractionDigits: decimals, maximumFractionDigits: decimals };
  return new Intl.NumberFormat( 'en-US', o ).format( num );
});

// sanitize text data by only allowing alnums and some symbols
Vue.filter( 'toText', ( str, def ) => {
  str = String( str || '' ).replace( /[^\w\`\'\-\,\.\!\?]+/g, ' ' ).replace( /\s\s+/g, ' ' ).trim();
  return str || String( def || '' );
});
