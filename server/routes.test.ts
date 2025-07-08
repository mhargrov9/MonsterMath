import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Server } from 'http';
import supertest from 'supertest';
import express from 'express';
import { registerRoutes } from './routes'; // Adjust path if needed

describe('API Routes', () => {
  let app: express.Express;
  let server: Server;
  let request: supertest.SuperTest<supertest.Test>;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    server = await registerRoutes(app);
    request = supertest(server);
  });

  afterAll((done) => {
    server.close(done);
  });

  it('GET /api/health should return status ok', async () => {
    const res = await request.get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});