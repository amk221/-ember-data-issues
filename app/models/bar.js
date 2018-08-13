import Model from 'ember-data/model';
import attr from 'ember-data/attr';

export default Model.extend({
  name: attr('string'),
  _type: 'bar',
  _delete: attr('boolean', { defaultValue: false })
});
