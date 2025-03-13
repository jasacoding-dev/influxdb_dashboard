const express = require('express');
const { InfluxDB, flux } = require('@influxdata/influxdb-client');
const app = express();
const port = 3000;

// Konfigurasi InfluxDB
const url = 'http://staging.inamas.id:8086';
const token = 'GtxTX6uT4DPKK6-oUV8WK0mJyuvzCKDE4UxSsLZFaevam0FdWH8BneHJr6nAhqIuYizctjNHoSbsr2Fqx8TMpg==';
const orgId = 'd43faa4e22638d1b';

const influxDB = new InfluxDB({ url, token });

// Middleware untuk parsing request body
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Set view engine to ejs
app.set('view engine', 'ejs');

// Route untuk homepage


// Route untuk menampilkan list buckets
app.get('/', async (req, res) => {
  const queryApi = influxDB.getQueryApi(orgId);
  const query = flux`buckets()`;
  const buckets = [];

  queryApi.queryRows(query, {
    next(row, tableMeta) {
      const o = tableMeta.toObject(row);
      buckets.push(o.name);
    },
    error(error) {
      console.error(error);
      res.status(500).send('Error fetching buckets');
    },
    complete() {
      res.render('buckets', { buckets });
    },
  });
});

// Route untuk menampilkan list measurements
app.get('/measurements/:bucket', async (req, res) => {
  const bucket = req.params.bucket;
  const queryApi = influxDB.getQueryApi(orgId);
  const query = flux`from(bucket: "${bucket}") |> range(start: -30d) |> keys() |> keep(columns: ["_measurement"]) |> distinct()`;
  const measurements = [];

  queryApi.queryRows(query, {
    next(row, tableMeta) {
      const o = tableMeta.toObject(row);
      measurements.push(o._measurement);
    },
    error(error) {
      console.error(error);
      res.status(500).send('Error fetching measurements');
    },
    complete() {
      res.render('measurements', { bucket, measurements });
    },
  });
});

// Route untuk menampilkan list field keys
app.get('/field-keys/:bucket/:measurement', async (req, res) => {
  const { bucket, measurement } = req.params;
  const queryApi = influxDB.getQueryApi(orgId);
  const query = flux`from(bucket: "${bucket}") |> range(start: -30d) |> filter(fn: (r) => r._measurement == "${measurement}") |> keys() |> keep(columns: ["_field"]) |> distinct()`;
  const fieldKeys = [];

  queryApi.queryRows(query, {
    next(row, tableMeta) {
      const o = tableMeta.toObject(row);
      fieldKeys.push(o._field);
    },
    error(error) {
      console.error(error);
      res.status(500).send('Error fetching field keys');
    },
    complete() {
      res.render('fieldKeys', { bucket, measurement, fieldKeys });
    },
  });
});

// Route untuk menampilkan list tag keys
app.get('/tag-keys/:bucket/:measurement', async (req, res) => {
  const { bucket, measurement } = req.params;
  const queryApi = influxDB.getQueryApi(orgId);
  const query = flux`from(bucket: "${bucket}") |> range(start: -30d) |> filter(fn: (r) => r._measurement == "${measurement}") |> keys() |> keep(columns: ["_field"]) |> distinct()`;
  const tagKeys = [];

  queryApi.queryRows(query, {
    next(row, tableMeta) {
      const o = tableMeta.toObject(row);
      tagKeys.push(o._field);
    },
    error(error) {
      console.error(error);
      res.status(500).send('Error fetching tag keys');
    },
    complete() {
      res.render('tagKeys', { bucket, measurement, tagKeys });
    },
  });
});

// Route untuk menampilkan list tag values
app.get('/tag-values/:bucket/:measurement/:tagKey', async (req, res) => {
  const { bucket, measurement, tagKey } = req.params;
  const queryApi = influxDB.getQueryApi(orgId);
  const query = flux`from(bucket: "${bucket}") |> range(start: -30d) |> filter(fn: (r) => r._measurement == "${measurement}") |> keep(columns: ["${tagKey}"]) |> distinct()`;
  const tagValues = [];

  queryApi.queryRows(query, {
    next(row, tableMeta) {
      const o = tableMeta.toObject(row);
      tagValues.push(o[tagKey]);
    },
    error(error) {
      console.error(error);
      res.status(500).send('Error fetching tag values');
    },
    complete() {
      res.render('tagValues', { bucket, measurement, tagKey, tagValues });
    },
  });
});

// Jalankan server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});