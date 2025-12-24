import { Router, type Response } from 'express';
import { authenticate, authorizeWorkspace, type AuthRequest } from '../auth/middleware';
import * as ChatService from './chat.service';

const router = Router();

router.post(
  '/:workspaceId',
  authenticate,
  authorizeWorkspace('VIEWER'),
  async (req: AuthRequest, res: Response) => {
    const workspaceId = req.params.workspaceId!;
    const { message, documentId, history } = req.body;

    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    try {
      const result = await ChatService.chatWithKnowledge(req.user!.id, {
        message,
        workspaceId,
        documentId,
        history
      });
      res.json(result);
    } catch (error) {
      console.error('Chat error:', error);
      res.status(500).json({ error: 'Failed to process chat message' });
    }
  }
);

export default router;
