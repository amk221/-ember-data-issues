import RESTAdapter from 'ember-data/adapters/rest';

export default RESTAdapter.extend({
 shouldReloadRecord() {
    return true;
  },

  shouldReloadAll() {
    return true;
  },

  shouldBackgroundReloadRecord() {
    return false;
  },

  shouldBackgroundReloadAll() {
    return false;
  }
});
