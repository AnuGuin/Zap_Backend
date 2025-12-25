import type { Request, Response, NextFunction } from 'express';
import { firebaseAuth } from '../../config/firebase';
import prisma from '../../config/db';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const decodedToken = await firebaseAuth.verifyIdToken(token);
    const { uid, email, name } = decodedToken;

    if (!email) {
      return res.status(400).json({ message: 'Email is required for authentication' });
    }

    let user = await prisma.user.findUnique({
      where: { id: uid },
    });

    if (user) {
      if (user.email !== email || (name && user.name !== name)) {
        user = await prisma.user.update({
          where: { id: uid },
          data: { 
            email,
            name: name || user.name 
          },
        });
      }
    } else {
      user = await prisma.user.findUnique({
        where: { email },
      });

      if (user) {
        if (name && user.name !== name) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { name },
          });
        }
      } else {
        user = await prisma.user.create({
          data: {
            id: uid,
            email,
            name: name || email.split('@')[0],
          },
        });
      }
    }

    req.user = {
      id: user.id,
      email: user.email,
    };
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ message: 'Invalid token' });
  }
};

export const authorizeWorkspace = (requiredRole: 'OWNER' | 'EDITOR' | 'VIEWER') => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { workspaceId } = req.params;
    const userId = req.user?.id;

    if (!userId || !workspaceId) {
      return res.status(400).json({ message: 'Missing user or workspace context' });
    }

    const member = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
    });

    if (!member) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const roles = ['VIEWER', 'EDITOR', 'OWNER'];
    const userRoleIndex = roles.indexOf(member.role);
    const requiredRoleIndex = roles.indexOf(requiredRole);

    if (userRoleIndex < requiredRoleIndex) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    next();
  };
};
