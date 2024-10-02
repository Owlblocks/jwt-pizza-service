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

let testFranchise;

let testPizza = {
  title: randomName(),
  description: "test pizza",
  image: "test.png",
  price: 0.0068
}

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

beforeAll(async () => {
  testUser = await createAdminUser();
  const registerRes = await request(app).put('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
  testFranchise = {
    name: randomName(),
    admins: [{ email: testUser.email }]
  };
});

async function addTestPizza() {
  return await request(app)
                .put('/api/order/menu')
                .set('Authorization', `Bearer ${testUserAuthToken}`)
                .send(testPizza);
}

test('add to menu', async () => {
  const addResp = await addTestPizza();
  expect(addResp.status).toBe(200);
  let present = false;
  for (let i = 0; i < addResp.body.length; i++) {
    if (addResp.body[i].title !== testPizza.title) {
      continue;
    }
    const { id, ...item } = { ...addResp.body[i] };
    expect(item).toMatchObject(testPizza);
    present = true;
    break;
  }
  expect(present).toBe(true);
});

test('get menu', async () => {
  await addTestPizza();

  const getResp = await request(app)
                          .get('/api/order/menu')
                          .send();

  expect(getResp.status).toBe(200);

  let present = false;
  for (let i = 0; i < getResp.body.length; i++) {
    if (getResp.body[i].title !== testPizza.title) {
      continue;
    }
    const { id, ...item } = { ...getResp.body[i] };
    expect(item).toMatchObject(testPizza);
    present = true;
    break;
  }
  expect(present).toBe(true);
});

test('post order', async () => {
  const franchiseResp = await createUserFranchise();
  const storeName = randomName();
  const storeResp = await createFranchiseStore(franchiseResp.body.id, storeName);
  expect(storeResp.status).toBe(200);

  const addResp = await addTestPizza();

  const menuItem = { ...addResp.body[0]} ;
  const testOrder = {
    franchiseId: franchiseResp.body.id,
    storeId: storeResp.body.id,
    items: [
      {
        menuId: menuItem.id,
        description: menuItem.description,
        price: menuItem.price
      }
    ]
  };

  const orderResp = await request(app)
                            .post('/api/order')
                            .set('Authorization', `Bearer ${testUserAuthToken}`)
                            .send(testOrder);

  expect(orderResp.status).toBe(200);
  expect(orderResp.body.order.items[0]).toMatchObject(testOrder.items[0]);
});