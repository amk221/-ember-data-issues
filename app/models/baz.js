import Model from 'ember-data/model';
import attr from 'ember-data/attr';

export default Model.extend({
  name: attr('string'),
  token: attr('string'),
  _type: 'baz',
  _delete: attr('boolean', { defaultValue: false })
});
