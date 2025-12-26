import { Router, type Response } from 'express';
import { authenticate, authorizeWorkspace } from '../auth/middleware';
import type { AuthRequest } from '../auth/middleware';
import * as KnowledgeService from './knowledge.service';

const router = Router();

router.post(
  '/:workspaceId/knowledge',
  authenticate,
  authorizeWorkspace('EDITOR'),
  async (req: AuthRequest, res: Response) => {
    const workspaceId = req.params.workspaceId!;
    try {
      const { url, intent } = req.body;
      
      if (!url || !intent) {
        return res.status(400).json({ 
          error: 'Both url and intent are required' 
        });
      }

      const doc = await KnowledgeService.createDocument(req.user!.id, {
        url,
        intent,
        workspaceId,
      });
      
      res.status(201).json({ 
        message: 'Knowledge item created and processing started',
        data: doc 
      });
    } catch (error: any) {
      res.status(500).json({ 
        error: 'Failed to create knowledge item',
        details: error.message 
      });
    }
  }
);

router.get(
  '/:workspaceId/knowledge',
  authenticate,
  authorizeWorkspace('VIEWER'),
  async (req: AuthRequest, res: Response) => {
    const workspaceId = req.params.workspaceId!;
    try {
      const docs = await KnowledgeService.listDocuments(workspaceId);
      res.json(docs);
    } catch (error) {
      res.status(500).json({ error: 'Failed to list knowledge items' });
    }
  }
);

router.get(
  '/:workspaceId/knowledge/:id',
  authenticate,
  authorizeWorkspace('VIEWER'),
  async (req: AuthRequest, res: Response) => {
    const id = req.params.id!;
    try {
      const doc = await KnowledgeService.getDocument(id);
      if (!doc) return res.status(404).json({ message: 'Knowledge item not found' });
      res.json(doc);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get knowledge item' });
    }
  }
);

export default router;
