import express from 'express';
import dotenv from 'dotenv';
import { prisma } from './db.js';
dotenv.config();
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => {
    res.send('Zapnote Backend is running!');
});
app.get('/health', async (req, res) => {
    try {
        // Check database connection
        await prisma.$queryRaw `SELECT 1`;
        res.json({ status: 'healthy', database: 'connected' });
    }
    catch (error) {
        console.error('Health check failed:', error);
        res.status(500).json({ status: 'unhealthy', database: 'disconnected', error: String(error) });
    }
});
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
//# sourceMappingURL=server.js.map