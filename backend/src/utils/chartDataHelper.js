function toDateOnly(d) {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function safeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function listRecentDates(days) {
  const out = [];
  for (let i = days - 1; i >= 0; i -= 1) out.push(toDateOnly(daysAgo(i)));
  return out;
}

function initDateBuckets(dateRange, bucketFactory) {
  return dateRange.reduce((acc, date) => {
    acc[date] = bucketFactory(date);
    return acc;
  }, {});
}

function fillBuckets(records, buckets, getKey, fillFn) {
  for (const rec of records) {
    const key = getKey(rec);
    if (!buckets[key]) continue;
    fillFn(buckets[key], rec);
  }
  return buckets;
}

function buildSeries(dateRange, buckets, transformFn) {
  return dateRange.map((date) => transformFn(date, buckets[date]));
}

function aggregateDateSeries({
  records,
  days,
  getDateKey = (rec) => toDateOnly(rec.createdAt || rec.date || rec.startedAt),
  bucketFactory = (date) => ({ date }),
  reducer = (bucket, rec) => {},
  finalize = (date, bucket) => bucket,
}) {
  const dateRange = listRecentDates(days);
  const buckets = initDateBuckets(dateRange, bucketFactory);
  fillBuckets(records, buckets, getDateKey, reducer);
  return buildSeries(dateRange, buckets, finalize);
}

function sumField(records, field) {
  return records.reduce((sum, rec) => sum + safeNumber(rec[field]), 0);
}

function avgField(records, field) {
  if (!records.length) return 0;
  return sumField(records, field) / records.length;
}

module.exports = {
  toDateOnly,
  daysAgo,
  safeNumber,
  listRecentDates,
  initDateBuckets,
  fillBuckets,
  buildSeries,
  aggregateDateSeries,
  sumField,
  avgField,
};
