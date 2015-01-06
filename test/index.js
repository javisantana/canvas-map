
var test = require('tape');
var FM = require('../map');

test('mat3 identity', function (t) {
  var m = new FM.mat3()
  m.mul(new FM.mat3());
  t.equal(m.v[0], 1);
  t.equal(m.v[4], 1);
  t.equal(m.v[8], 1);
  t.equal(m.v[1], 0);
  t.equal(m.v[2], 0);
  t.equal(m.v[3], 0);
  t.equal(m.v[5], 0);
  t.equal(m.v[6], 0);
  t.equal(m.v[7], 0);
  t.end();
})
