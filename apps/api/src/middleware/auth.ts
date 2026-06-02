import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';

export function requireAdmin(pool: Pool) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    try {
      const result = await pool.query(
        'SELECT role FROM user_accounts WHERE user_id = $1',
        [userId]
      );
      if (result.rows[0]?.role !== 'admin') {
        res.status(403).json({ error: 'Admin access required' }); return;
      }
      next();
    } catch {
      res.status(500).json({ error: 'Auth check failed' });
    }
  };
}

export function requireUser(pool: Pool) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    (req as any).body._userId = userId;
    next();
  };
}