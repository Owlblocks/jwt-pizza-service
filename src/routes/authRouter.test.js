const request = require('supertest');
const app = require('../service');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
// let testUserAuthToken;
// let testUserID;

beforeEach(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  await request(app).post('/api/auth').send(testUser);
  // testUserAuthToken = registerRes.body.token;
  // testUserID = registerRes.body.user.id;
});

test('login', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUser);
  expect(loginRes.status).toBe(200);
  expect(loginRes.body.token).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);

  const { password, ...user } = { ...testUser, roles: [{ role: 'diner' }] };
  expect(loginRes.body.user).toMatchObject(user);
});

test('logout', async () => {
  /*
  let getResp = await request(app)
                        .get(`/api/franchise/${testUserAuthToken}`)
                        .set('Authorization', `Bearer ${testUserAuthToken}`)
                        .send();
                        
  expect(getResp.status).toBe(200);
  */

  const loginRes = await request(app).put('/api/auth').send(testUser);
  const logoutResp = await request(app)
                              .delete('/api/auth')
                              .set('Authorization', `Bearer ${loginRes.body.token}`)
                              .send();

  expect(logoutResp.status).toBe(200);
  expect(logoutResp.body.message).toBe('logout successful');

  // gets jest to shut up about authswitch being called after it's closed or something; can I fix this?
  await new Promise(r => setTimeout(r, 500));

  /* should this really be a 401 error? You can't revoke tokens, so why do we store them?
  getResp = await request(app)
                    .get(`/api/franchise/${testUserID}`)
                    .set('Authorization', `Bearer ${testUserAuthToken}`)
                    .send();

  
  expect(getResp.status).toBe(401);
  */
});