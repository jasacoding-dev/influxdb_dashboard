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

// Helper function untuk query Flux
async function queryFlux(query, res, callback) {
  const queryApi = influxDB.getQueryApi(orgId);
  const results = [];

  queryApi.queryRows(query, {
    next(row, tableMeta) {
      const o = tableMeta.toObject(row);
      results.push(o);
    },
    error(error) {
      console.error(error);
      res.status(500).send('Error executing query');
    },
    complete() {
      callback(results);
    },
  });
}

// Route untuk homepage - List buckets
app.get('/', async (req, res) => {
  const query = flux`buckets()`;
  
  queryFlux(query, res, (buckets) => {
    const bucketNames = buckets.map(b => b.name);
    res.render('buckets', { buckets: bucketNames });
  });
});

// Route untuk menampilkan list measurements
app.get('/measurements/:bucket', async (req, res) => {
  const bucket = req.params.bucket;
  const query = flux`
    import "influxdata/influxdb/schema"
    schema.measurements(bucket: "${bucket}")
  `;
  
  queryFlux(query, res, (measurements) => {
    const measurementNames = measurements.map(m => m._value);
    res.render('measurements', { bucket, measurements: measurementNames });
  });
});

// Route untuk menampilkan list field keys
app.get('/field-keys/:bucket/:measurement', async (req, res) => {
  const { bucket, measurement } = req.params;
  const query = flux`
    import "influxdata/influxdb/schema"
    schema.fieldKeys(
      bucket: "${bucket}",
      measurement: "${measurement}"
    )
  `;
  
  queryFlux(query, res, (fields) => {
    const fieldKeys = fields.map(f => f._value);
    res.render('fieldKeys', { bucket, measurement, fieldKeys });
  });
});

// Route untuk menampilkan list fields in a measurement (similar to field keys)
app.get('/fields/:bucket/:measurement', async (req, res) => {
  const { bucket, measurement } = req.params;
  const query = flux`
    from(bucket: "${bucket}")
      |> range(start: -30d)
      |> filter(fn: (r) => r._measurement == "${measurement}")
      |> group(columns: ["_field"])
      |> distinct(column: "_field")
  `;
  
  queryFlux(query, res, (fields) => {
    const fieldList = fields.map(f => f._field);
    res.render('fields', { bucket, measurement, fields: fieldList });
  });
});

// Route untuk menampilkan list tag keys
app.get('/tag-keys/:bucket', async (req, res) => {
  const { bucket } = req.params;
  const query = flux`
    import "influxdata/influxdb/schema"
    schema.tagKeys(bucket: "${bucket}")
  `;
  
  queryFlux(query, res, (tags) => {
    const tagKeys = tags.map(t => t._value);
    res.render('tagKeys', { bucket, tagKeys, measurement: null });
  });
});

// Route untuk menampilkan list tag keys in a measurement
app.get('/tag-keys/:bucket/:measurement', async (req, res) => {
  const { bucket, measurement } = req.params;
  const query = flux`
    import "influxdata/influxdb/schema"
    schema.tagKeys(
      bucket: "${bucket}",
      predicate: (r) => r._measurement == "${measurement}"
    )
  `;
  
  queryFlux(query, res, (tags) => {
    const tagKeys = tags.map(t => t._value);
    res.render('tagKeys', { bucket, measurement, tagKeys });
  });
});

// Route untuk menampilkan list tag values
app.get('/tag-values/:bucket/:tagKey', async (req, res) => {
  const { bucket, tagKey } = req.params;
  const query = flux`
    import "influxdata/influxdb/schema"
    schema.tagValues(
      bucket: "${bucket}",
      tag: "${tagKey}"
    )
  `;
  
  queryFlux(query, res, (tags) => {
    const tagValues = tags.map(t => t._value);
    res.render('tagValues', { 
      bucket, 
      tagKey, 
      tagValues, 
      measurement: null 
    });
  });
});

// Route untuk menampilkan list tag values in a measurement
app.get('/tag-values/:bucket/:measurement/:tagKey', async (req, res) => {
  const { bucket, measurement, tagKey } = req.params;
  const query = flux`
    import "influxdata/influxdb/schema"
    schema.tagValues(
      bucket: "${bucket}",
      tag: "${tagKey}",
      predicate: (r) => r._measurement == "${measurement}"
    )
  `;
  
  queryFlux(query, res, (tags) => {
    const tagValues = tags.map(t => t._value);
    res.render('tagValues', { 
      bucket, 
      measurement, 
      tagKey, 
      tagValues 
    });
  });
});

// Jalankan server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});