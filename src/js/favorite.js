/**
 * Vue component used to toggle channel favorite
 */
Vue.component( 'fav-btn', {
  props: {
    id: { type: String, default: '', required: true },
    active: { type: Boolean, default: false },
  },
  template: `
    <button class="fav-btn" @click.stop="$emit( 'change', id, !active )">
      <i v-if="active" class="fa fa-heart text-primary fx fx-drop-in" key="on"></i>
      <i v-else class="fa fa-heart-o fx fx-drop-in" key="off"></i>
    </button>`,
});
