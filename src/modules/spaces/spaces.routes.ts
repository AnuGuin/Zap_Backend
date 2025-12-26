import { Router, type Response } from 'express';
import { authenticate, authorizeWorkspace, type AuthRequest } from '../auth/middleware';
import prisma from '../../config/db';
import * as SpacesService from './spaces.service';

const router = Router();


router.post(
  '/:workspaceId/spaces',
  authenticate,
  authorizeWorkspace('EDITOR'),
  async (req: AuthRequest, res: Response) => {
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
  async (req: AuthRequest, res: Response) => {
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

router.get(
  '/:workspaceId/spaces/:spaceId/suggestions',
  authenticate,
  authorizeWorkspace('VIEWER'),
  async (req: AuthRequest, res: Response) => {
    try {
      const suggestions = await SpacesService.suggestRelatedKnowledge(
        req.params.workspaceId!,
        req.params.spaceId!
      );
      res.json(suggestions);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to get suggestions' });
    }
  }
);

router.post(
  '/:workspaceId/spaces/compare',
  authenticate,
  authorizeWorkspace('VIEWER'),
  async (req: AuthRequest, res: Response) => {
    const { spaceId1, spaceId2 } = req.body;
    try {
      const comparison = await SpacesService.compareSpaces(
        req.params.workspaceId!,
        spaceId1,
        spaceId2
      );
      res.json(comparison);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to compare spaces' });
    }
  }
);

router.get(
  '/:workspaceId/spaces/:spaceId/edges/suggest',
  authenticate,
  authorizeWorkspace('EDITOR'),
  async (req: AuthRequest, res: Response) => {
    try {
      const edges = await SpacesService.suggestEdges(
        req.params.workspaceId!,
        req.params.spaceId!
      );
      res.json(edges);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to suggest edges' });
    }
  }
);

router.post(
  '/:workspaceId/edges',
  authenticate,
  authorizeWorkspace('EDITOR'),
  async (req: AuthRequest, res: Response) => {
    try {
      const edge = await prisma.edge.create({
        data: {
          ...req.body,
          workspaceId: req.params.workspaceId!,
        },
      });
      res.status(201).json(edge);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create edge' });
    }
  }
);

router.get(
  '/:workspaceId/spaces/:spaceId/gaps',
  authenticate,
  authorizeWorkspace('VIEWER'),
  async (req: AuthRequest, res: Response) => {
    try {
      const gaps = await SpacesService.detectGaps(
        req.params.workspaceId!,
        req.params.spaceId!
      );
      res.json(gaps);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to detect gaps' });
    }
  }
);

export default router;
