const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database.js');

function randomName() {
  return Math.random().toString(36).substring(2, 12);
}

async function createAdminUser() {
  let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
  user.name = randomName();
  user.email = user.name + '@admin.com';

  await DB.addUser(user);

  user.password = 'toomanysecrets';
  return user;
}

let testUser;
let testUserAuthToken;
let testUserID;

let testFranchise;

beforeEach(async () => {
  testUser = await createAdminUser();
  const registerRes = await request(app).put('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
  testUserID = registerRes.body.user.id;
  testFranchise = {
    name: randomName(),
    admins: [{ email: testUser.email }]
  };
});

async function createUserFranchise() {
  return await request(app)
    .post('/api/franchise')
    .set('Authorization', `Bearer ${testUserAuthToken}`)
    .send(testFranchise);
}

async function createFranchiseStore(id, name) {
  return await request(app)
    .post(`/api/franchise/${id}/store`)
    .set('Authorization', `Bearer ${testUserAuthToken}`)
    .send({ name: name });
}

test('create franchise', async () => {
  const pushResp = await createUserFranchise();
  expect(pushResp.status).toBe(200);
  expect(pushResp.body.name).toBe(testFranchise.name);
  expect(pushResp.body.admins.length).toBe(1);
  expect(pushResp.body.admins[0].name).toBe(testUser.name);
});

test('get user franchises', async () => {
  await createUserFranchise();
  const getResp = await request(app)
                          .get(`/api/franchise/${testUserID}`)
                          .set('Authorization', `Bearer ${testUserAuthToken}`)
                          .send();

  expect(getResp.status).toBe(200);
  expect(getResp.body.length).toBe(1);
  expect(getResp.body[0].name).toBe(testFranchise.name);
});

test('delete franchise', async () => {
  const pushResp = await createUserFranchise();
  let getResp = await request(app)
                          .get(`/api/franchise/${testUserID}`)
                          .set('Authorization', `Bearer ${testUserAuthToken}`)
                          .send();

  expect(getResp.body.length).toBe(1);
  
  const delResp = await request(app)
                          .delete(`/api/franchise/${pushResp.body.id}`)
                          .set('Authorization', `Bearer ${testUserAuthToken}`)
                          .send();

  expect(delResp.status).toBe(200);

  getResp = await request(app)
                          .get(`/api/franchise/${testUserID}`)
                          .set('Authorization', `Bearer ${testUserAuthToken}`)
                          .send();

  expect(getResp.status).toBe(200);
  expect(getResp.body.length).toBe(0);
});

test('create store', async () => {
  const pushResp = await createUserFranchise();
  const storeName = randomName();
  const createStoreResp = await createFranchiseStore(pushResp.body.id, storeName);

  expect(createStoreResp.status).toBe(200);

  const { id, ...item } = createStoreResp.body;
  expect(item).toMatchObject({ franchiseId: pushResp.body.id, name: storeName });

  const getResp = await request(app)
                          .get(`/api/franchise/${testUserID}`)
                          .set('Authorization', `Bearer ${testUserAuthToken}`)
                          .send();

  expect(getResp.body[0].stores.length).toBe(1);
  expect(getResp.body[0].stores[0].name).toBe(storeName);
});

test('delete store', async () => {
  const pushResp = await createUserFranchise();
  const storeName = randomName();
  const createStoreResp = await createFranchiseStore(pushResp.body.id, storeName);

  let getResp = await request(app)
                          .get(`/api/franchise/${testUserID}`)
                          .set('Authorization', `Bearer ${testUserAuthToken}`)
                          .send();

  expect(getResp.body[0].stores.length).toBe(1);

  const delResp = await request(app)
                          .delete(`/api/franchise/${pushResp.body.id}/store/${createStoreResp.body.id}`)
                          .set('Authorization', `Bearer ${testUserAuthToken}`)
                          .send();

  expect(delResp.status).toBe(200);

  getResp = await request(app)
                          .get(`/api/franchise/${testUserID}`)
                          .set('Authorization', `Bearer ${testUserAuthToken}`)
                          .send();

  expect(getResp.body[0].stores.length).toBe(0);
});

test('get franchises', async () => {
  const createResp = await createUserFranchise();

  const getResp = await request(app).get('/api/franchise').send();
  expect(getResp.status).toBe(200);
  expect(getResp.body.length).toBeGreaterThan(0);
  let present = false;
  for (let i = 0; i < getResp.body.length; i++) {
    if (createResp.body.id === getResp.body[i].id) {
      present = true;
      const { admins, ...item } = createResp.body;
      expect(getResp.body[i]).toMatchObject(item);
      break;
    }
  }
  expect(present).toBe(true);
});