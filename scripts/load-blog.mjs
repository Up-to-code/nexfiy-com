const baseUrl = process.env.LOAD_TEST_BASE_URL ?? "http://localhost:3000";
const slug =
  process.env.LOAD_TEST_BLOG_SLUG ?? "from-a-note-to-a-working-system";
const concurrency = Math.max(
  1,
  Math.min(Number(process.env.LOAD_TEST_CONCURRENCY ?? 5), 25),
);
const requestsPerRoute = Math.max(
  1,
  Math.min(Number(process.env.LOAD_TEST_REQUESTS ?? 20), 200),
);
const routes = ["/blog", `/blog/${slug}`];

async function request(path) {
  const startedAt = performance.now();
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { "User-Agent": "Nexfiy staged blog load test" },
  });
  await response.arrayBuffer();
  return {
    path,
    status: response.status,
    duration: performance.now() - startedAt,
  };
}

const jobs = routes.flatMap((path) =>
  Array.from({ length: requestsPerRoute }, () => () => request(path)),
);
const results = [];
let cursor = 0;

async function worker() {
  while (cursor < jobs.length) {
    const job = jobs[cursor++];
    results.push(await job());
  }
}

await Promise.all(Array.from({ length: concurrency }, () => worker()));
const failures = results.filter((result) => result.status !== 200);
const durations = results
  .map((result) => result.duration)
  .sort((a, b) => a - b);
const percentile = (value) =>
  durations[
    Math.min(durations.length - 1, Math.floor(durations.length * value))
  ];

console.log(
  JSON.stringify(
    {
      baseUrl,
      concurrency,
      total: results.length,
      failures: failures.length,
      p50Ms: Math.round(percentile(0.5)),
      p95Ms: Math.round(percentile(0.95)),
      maxMs: Math.round(durations.at(-1) ?? 0),
    },
    null,
    2,
  ),
);

if (failures.length > 0 || percentile(0.95) > 2500) process.exitCode = 1;
