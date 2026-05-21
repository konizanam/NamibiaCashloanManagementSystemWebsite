import { Router } from 'express';
import { pool } from '../db.js';
import { config } from '../config.js';

export const healthRouter = Router();

healthRouter.get('/', async (_req, res, next) => {
  try {
    const { rows } = await pool.query<{ now: Date }>(`SELECT NOW() AS now`);
    res.json({ status: 'ok', env: config.env, db_time: rows[0]?.now });
  } catch (err) {
    next(err);
  }
});
