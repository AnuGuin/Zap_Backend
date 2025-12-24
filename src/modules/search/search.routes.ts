import { Router } from 'express';
import { authenticate, authorizeWorkspace } from '../auth/middleware';
import * as SearchService from './search.service';

const router = Router();

router.post(
  '/:workspaceId/search',
  authenticate,
  authorizeWorkspace('VIEWER'),
  async (req, res) => {
    try {
      const { query, limit } = req.body;
      if (!query) return res.status(400).json({ message: 'Query is required' });

      const results = await SearchService.searchKnowledge(req.params.workspaceId!, query, limit);
      res.json(results);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Search failed' });
    }
  }
);

export default router;
