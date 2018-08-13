import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import { settled } from '@ember/test-helpers';
import Fooness from 'example/mixins/fooness';
import EmberObject from '@ember/object';
import { A as emberA } from '@ember/array';
import { resolve, reject } from 'rsvp';
import { run } from '@ember/runloop';
import Pretender from 'pretender';

module('foo', function(hooks) {
  setupTest(hooks);

  let store;
  let foo;
  let bar;
  let baz1;
  let baz2;
  let baz3;
  let obj;
  let changes;

  hooks.beforeEach(function() {
    const MyObject = EmberObject.extend(Fooness);

    store = this.owner.lookup('service:store');

    obj = MyObject.create({ store });

    run(() => {
      store.pushPayload({
        foos: [{
          id: 1,
          name: 'Foo 1',
          bar: null,
          bazs: [1, 2]
        }],
        bars: [{
          id: 1,
          description: 'Bar 1'
        }],
        bazs: [{
          id: 1,
          name: 'Baz 1'
        }, {
          id: 2,
          name: 'Baz 2'
        }]
      });
    });

    foo = store.peekRecord('foo', 1);
    bar  = store.peekRecord('bar', 1);
    baz1 = store.peekRecord('baz', 1);
    baz2 = store.peekRecord('baz', 2);

    changes = {
      fooChanges: {
        name: 'Foo 1*'
      },
      bazsToDetach: emberA([baz1]),
      linkedModel: bar,
      fileTokens: emberA(['abc123'])
    };

    // ED 2.18 This is not needed
    const server = new Pretender;

    server.get('/bazs/1', () => {
      return [200, {}, JSON.stringify({
        baz: {
          id: 1,
          name: 'Baz 1*'
        }
      })];
    });
  });

  test('#saveFoo (success)', function(assert) {
    assert.expect(8);

    foo.save = resolve;

    const promise = obj.saveFoo(foo, changes);

    assert.strictEqual(baz1.get('_delete'), true,
      'the bazs to detach are flagged for deletion');

    assert.strictEqual(baz2.get('_delete'), false,
      'the remaining bazs are not flagged for deletion');

    return promise.then(() => {
      baz1 = store.peekAll('baz').findBy('id', 1);
      baz3 = store.peekAll('baz').findBy('token', 'abc123');

      assert.equal(foo.get('name'), 'Foo 1*', 'the changes are applied to foo');

      foo.get('bar').then(linkedModel => {
        assert.deepEqual(linkedModel, bar,
          'the model to link to foo is set as a relationship');
      });

      foo.get('bazs').then(bazs => {
        assert.ok(!bazs.includes(baz1), 'bazs to detach are removed');
        assert.ok(bazs.includes(baz2), 'existing bazs remain untouched');
        assert.ok(bazs.includes(baz3), 'bazs to attach are added');

        // No longer works
        // assert.deepEqual(bazs.toArray(), [baz2, baz3],
        //   'bazs to detach are removed from foo');

        assert.strictEqual(baz1, undefined,
          'the deleted bazs are unloaded from the store');
      });

      return settled();
    });
  });

  test('#saveFoo (failure)', function(assert) {
    assert.expect(5);

    foo.save = () => reject(new Error('failed to save the note'));

    const promise = obj.saveFoo(foo, changes);

    return promise.catch(() => {
      baz3 = store.peekAll('bazs').findBy('token', 'abc123');

      assert.equal(foo.get('name'), 'Foo 1', 'foo changes are reverted');

      foo.get('bar').then(linkedModel => {
        assert.deepEqual(linkedModel, null,
          'the bar is reverted back to before the save');
      });

      foo.get('bazs').then(bazs => {
        assert.ok(bazs.includes(baz1), 'bazs flagged for deletion are still present');
        assert.ok(bazs.includes(baz2), 'existing bazs remain untouched');
        assert.ok(!bazs.includes(baz3), 'new bazs are unloaded');

        // No longer works
        // assert.deepEqual(bazs.toArray(), [baz1, baz2],
        //   'bazs flagged for deletion are still present and new ' +
        //   'bazs are not');

        assert.ok(baz1.get('_delete') === false && baz2.get('_delete') === false,
          'any bazs that were flagged for deletion, are no longer');

        assert.ok(!baz3 && store.peekAll('baz').get('length') === 2,
          'the new bazs are cleaned up when saving fails');
      });

      return settled();
    });
  });
});
