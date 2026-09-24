/**
 * Modelos Mongoose simulados en memoria para probar la API sin MongoDB.
 * Implementan solo los métodos que usa la aplicación. Las pruebas e2e
 * (tests/e2e) usan una base de datos MongoDB real.
 */
const crypto = require('crypto');

const newId = () => crypto.randomBytes(12).toString('hex');

const query = (value) => {
  const q = Promise.resolve(value);
  q.select = () => query(value);
  q.sort = () => query(value);
  q.limit = () => query(value);
  q.lean = () => query(value);
  q.populate = () => query(value);
  return q;
};

const matches = (doc, filter) => Object.entries(filter).every(([k, v]) => {
  if (v && typeof v === 'object' && '$lte' in v) return doc[k] <= v.$lte;
  return String(doc[k]) === String(v);
});

const makeUserModel = () => {
  const { resolveClubId } = require('../../config/clubs');
  const store = new Map();

  class User {
    constructor(data) {
      Object.assign(this, { _id: newId(), favoriteTeamId: null, totpSecret: null, totpEnabled: false, refreshToken: null, createdAt: new Date() }, data);
    }
    async save() { store.set(String(this._id), this); return this; }
    toPublicJSON() {
      return { id: this._id, email: this.email, favoriteTeamId: resolveClubId(this.favoriteTeamId), totpEnabled: this.totpEnabled, createdAt: this.createdAt };
    }
    static async exists(filter) { return [...store.values()].some((u) => matches(u, filter)) || null; }
    static findOne(filter) { return query([...store.values()].find((u) => matches(u, filter)) || null); }
    static findById(id) { return query(store.get(String(id)) || null); }
    static async findByIdAndUpdate(id, update) {
      const u = store.get(String(id));
      if (u) Object.assign(u, update.$set || update);
      return u || null;
    }
    static _reset() { store.clear(); }
    static _all() { return [...store.values()]; }
  }
  return User;
};

const makeScoreModel = () => {
  const store = [];
  return {
    create: async (doc) => { store.push({ totalPoints: 0, exactHits: 0, resultHits: 0, ...doc }); return doc; },
    findOneAndUpdate: async (filter, update) => {
      let doc = store.find((d) => String(d.userId) === String(filter.userId));
      if (!doc) { doc = { userId: filter.userId, totalPoints: 0, exactHits: 0, resultHits: 0 }; store.push(doc); }
      Object.entries(update.$inc || {}).forEach(([k, v]) => { doc[k] += v; });
      return doc;
    },
    // populate('userId') resuelve contra el modelo User simulado
    find: () => {
      const q = query([...store]);
      q.populate = () => {
        const User = require('../../models/User');
        const users = User._all ? User._all() : [];
        return query(store.map((s) => ({ ...s, userId: users.find((u) => String(u._id) === String(s.userId)) || null })));
      };
      return q;
    },
    _all: () => store,
    _reset: () => { store.length = 0; }
  };
};

const makePredictionModel = () => {
  const store = [];
  return {
    findOne: async (filter) => store.find((p) => matches(p, filter)) || null,
    find: (filter = {}) => query(store.filter((p) => matches(p, filter))),
    findOneAndUpdate: async (filter, update) => {
      let doc = store.find((p) => matches(p, filter));
      if (!doc) {
        if (!update.$setOnInsert && filter.resolved === false) return null;
        doc = { _id: newId(), resolved: false, pointsAwarded: 0, ...filter, ...(update.$setOnInsert || {}) };
        store.push(doc);
      }
      Object.assign(doc, update.$set || {});
      return doc;
    },
    _all: () => store,
    _reset: () => { store.length = 0; }
  };
};

module.exports = { makeUserModel, makeScoreModel, makePredictionModel };
