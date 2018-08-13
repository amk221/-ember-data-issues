import Mixin from '@ember/object/mixin';
import { get } from '@ember/object';

/**
 * Mix this in for the ability to add/edit a foo
 *
 * Example:
 *
 *  changes = {
 *    fooChanges: {},
 *    bazsToDetach: [],
 *    fileTokens: [],
 *    linkedModel: aModel
 *  }
 *
 *  saveFoo(foo, changes).then(...)
 *
 */
export default Mixin.create({
  saveFoo(foo, changes) {
    const before = this._beforeFooSave(foo);

    this._applyFooChanges(foo, changes);

    return foo.save()
      .then(() => {
        this._unloadDeletedBazs(changes.bazsToDetach);
        return foo;
      })
      .catch(error => {
        this._revertFooChanges(foo, before, changes);
        throw error;
      });
  },

  _applyFooChanges(foo, changes) {
    foo.setProperties(changes.fooChanges);
    this._flagFooBazs(changes.bazsToDetach, true);
    this._linkModelToFoo(foo, changes.linkedModel);
    this._addNewFooBazs(foo, changes.fileTokens);
  },

  _revertFooChanges(foo, before, changes) {
    if (!foo.get('isNew')) {
      foo.rollbackAttributes();
    }

    this._flagFooBazs(changes.bazsToDetach, false);
    this._revertLinkModelToFoo(foo, before);
    this._cleanUpNewFooBazs();
  },

  _flagFooBazs(bazs, bool) {
    bazs.invoke('set', '_delete', bool);
  },

  _beforeFooSave(foo) {
    return {
      bar: get(foo, 'bar')
    };
  },

  _linkModelToFoo(foo, model) {
    const modelType = model ? get(model, '_type') : null;

    foo.setProperties({
      bar: null
    });

    if (modelType) {
      foo.set(modelType, model);
    }
  },

  _revertLinkModelToFoo(foo, before) {
    foo.set('bar', before.bar);
  },

  _createFooBazs(tokens) {
    return tokens.map(token => {
      return this.store.createRecord('baz', { token });
    });
  },

  _addNewFooBazs(foo, tokens) {
    const bazs = this._createFooBazs(tokens);
    foo.get('bazs').addObjects(bazs);
  },

  _cleanUpNewFooBazs() {
    this.store.peekAll('baz')
      .filterBy('isNew', true)
      .invoke('unloadRecord');
  },

  _unloadDeletedBazs(bazs) {
    bazs.invoke('unloadRecord');
  }
});
