const config = require('./config.js');
const os = require('os');

class Metrics {
  requests = {
    delete: 0,
    get: 0,
    post: 0,
    put: 0
  }

  getCpuUsagePercentage() {
    const cpuUsage = os.loadavg()[0] / os.cpus().length;
    return cpuUsage.toFixed(2) * 100;
  }
  
  getMemoryUsagePercentage() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsage = (usedMemory / totalMemory) * 100;
    return memoryUsage.toFixed(2);
  }

  buildHttpMetrics() {
    const methods = ['get', 'put', 'post', 'delete'];
    let metrics = '';
    let total = 0;
    methods.forEach((method) => {
      metrics += `request,source=${config.metrics.source},method=${method} total=${this.requests[method]}\n`;
      total += this.requests[method];
    });
    metrics += `request,source=${config.metrics.source},method=all total=${total}`
    return metrics;
  }

  buildSystemMetrics() {
    let metrics = `system,source=${config.metrics.source},type=cpu percent=${this.getCpuUsagePercentage()}\n`;
    metrics += `system,source=${config.metrics.source},type=memory percent=${this.getMemoryUsagePercentage()}`;
    return metrics;
  }
  
  sendMetricsPeriodically(period) {
    const timer = setInterval(() => {
      try {
        let metrics = '';
        metrics += this.buildHttpMetrics() + "\n";
        metrics += this.buildSystemMetrics();
        // userMetrics(buf);
        // purchaseMetrics(buf);
        // authMetrics(buf);
  
        this.sendMetricsToGrafana(metrics);
      } catch (error) {
        console.log('Error sending metrics', error);
      }
    }, period);
  }

  requestTracker(req, res, next) {
    switch (req.method) {
      case 'GET': {
        this.requests.get++;
      } break;
      case 'POST': {
        this.requests.post++;
      } break;
      case 'PUT': {
        this.requests.put++;
      } break;
      case 'DELETE': {
        this.requests.delete++;
      } break;
      default:
        // shouldn't execute
        console.log(`Unrecognized method: ${req.method}`);
    }
    next();
  }

  sendMetricsToGrafana(metrics) {
    fetch(`${config.metrics.url}`, {
      method: 'post',
      body: metrics,
      headers: { Authorization: `Bearer ${config.metrics.userId}:${config.metrics.apiKey}` },
    })
      .then((response) => {
        if (!response.ok) {
          console.error('Failed to push metrics data to Grafana');
        } else {
          console.log(`Pushed ${metrics}`);
        }
      })
      .catch((error) => {
        console.error('Error pushing metrics:', error);
      });
  }
}

const metrics = new Metrics();
metrics.sendMetricsPeriodically(5000);
// Solution thanks to the advice of Teodeoth on Discord
// This solves problems involving 'this' keyword not working
// when using methods from exported class.
const trackerMiddleware = (req, res, next) => {
  metrics.requestTracker(req, res, next);
}
module.exports = trackerMiddleware;