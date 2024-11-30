const app = require('./service.js');
const trackerMiddleware = require('./metrics.js');

const port = process.argv[2] || 3000;

app.use(trackerMiddleware);

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
