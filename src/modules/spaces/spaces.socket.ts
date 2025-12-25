import { Server, Socket } from 'socket.io';
import prisma from '../../config/db';
import { generateText } from '../../ai/llm';
import { logger } from '../../utils/logger';

export const setupSpacesSocket = (io: Server) => {
  const spacesNamespace = io.of('/spaces');

  spacesNamespace.on('connection', (socket: Socket) => {
    logger.info(`User connected to spaces: ${socket.id}`);

    socket.on('join-space', async (spaceId: string) => {
      socket.join(spaceId);
      logger.info(`User ${socket.id} joined space ${spaceId}`);
    });

    socket.on('update-element', async (data: { spaceId: string; element: any }) => {
      const { spaceId, element } = data;

      try {
        // Upsert element
        await prisma.spaceElement.upsert({
          where: { id: element.id },
          update: { content: element.content, type: element.type },
          create: {
            id: element.id,
            spaceId,
            type: element.type,
            content: element.content,
          },
        });

        socket.to(spaceId).emit('element-updated', element);
      } catch (error) {
        logger.error('Failed to update element', error);
      }
    });

    socket.on('explain-space', async (spaceId: string) => {
      try {
        const elements = await prisma.spaceElement.findMany({
          where: { spaceId },
        });

        const context = JSON.stringify(elements.map(e => e.content));
        const prompt = `
          Explain the contents of this whiteboard space. 
          The elements are described in JSON format below.
          Provide a cohesive summary of the ideas presented.

          Elements:
          ${context}
        `;

        const explanation = await generateText(prompt);
        
        socket.emit('space-explanation', { explanation });
      } catch (error) {
        logger.error('Failed to explain space', error);
        socket.emit('error', { message: 'Failed to generate explanation' });
      }
    });

    socket.on('disconnect', () => {
      logger.info(`User disconnected from spaces: ${socket.id}`);
    });
  });
};
