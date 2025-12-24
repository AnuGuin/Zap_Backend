import { Router } from 'express';
import { authenticate, authorizeWorkspace } from '../auth/middleware';
import prisma from '../../config/db';

const router = Router();

router.post(
  '/:workspaceId/spaces',
  authenticate,
  authorizeWorkspace('EDITOR'),
  async (req, res) => {
    try {
      const space = await prisma.space.create({
        data: {
          name: req.body.name,
          workspaceId: req.params.workspaceId!,
        },
      });
      res.status(201).json(space);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create space' });
    }
  }
);

router.get(
  '/:workspaceId/spaces',
  authenticate,
  authorizeWorkspace('VIEWER'),
  async (req, res) => {
    try {
      const spaces = await prisma.space.findMany({
        where: { workspaceId: req.params.workspaceId! },
      });
      res.json(spaces);
    } catch (error) {
      res.status(500).json({ error: 'Failed to list spaces' });
    }
  }
);

export default router;
