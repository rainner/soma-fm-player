/**
 * Vue component used to toggle channel favorite
 */
Vue.component( 'fav-btn', {
  props: {
    id: { type: String, default: '', required: true },
    text: { type: String, default: '', required: false },
    active: { type: Boolean, default: false },
  },
  template: `
    <button class="hover-text focus-text" @click.stop="$emit( 'change', id, !active )" title="Toggle save favorite station">
      <span>
        <i v-if="active" class="ico ico-favs-check text-primary fx fx-drop-in" key="on"></i>
        <i v-else class="ico ico-favs-add fx fx-drop-in" key="off"></i>
      </span>
      <span v-if="text">&nbsp; {{ text }}</span>
    </button>`,
});
