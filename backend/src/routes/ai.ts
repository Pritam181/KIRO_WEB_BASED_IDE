import { Router, Request, Response } from 'express';
import { aiService, ChatRequest } from '../services/aiService';
import { requireAuth } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import Joi from 'joi';

const router = Router();

// Validation schemas
const chatRequestSchema = Joi.object({
  message: Joi.string().required().min(1).max(5000),
  context: Joi.object({
    projectId: Joi.string().required(),
    currentFile: Joi.string().optional(),
    selectedText: Joi.string().optional(),
    openFiles: Joi.array().items(Joi.string()).default([]),
  }).optional(),
});

// Validation schema for context requests (currently unused but kept for future use)
// const contextRequestSchema = Joi.object({
//   projectId: Joi.string().required(),
//   currentFile: Joi.string().optional(),
// });

/**
 * POST /api/ai/chat
 * Send a message to the AI assistant
 */
router.post('/chat', requireAuth, validateRequest(chatRequestSchema), async (req: Request, res: Response) => {
  try {
    const chatRequest: ChatRequest = req.body;
    
    // Add user context to the request
    // const userId = (req as any).user?.id;
    if (chatRequest.context) {
      // Verify user has access to the project
      // This would integrate with project service in production
    }

    const response = await aiService.processMessage(chatRequest);

    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process AI request',
      error: process.env.NODE_ENV === 'development' ? error : undefined,
    });
  }
});

/**
 * POST /api/ai/chat/stream
 * Stream AI response for real-time interaction
 */
router.post('/chat/stream', requireAuth, validateRequest(chatRequestSchema), async (req: Request, res: Response) => {
  try {
    const chatRequest: ChatRequest = req.body;

    // Set up Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });

    // Send initial response
    res.write(`data: ${JSON.stringify({ type: 'start', id: Date.now().toString() })}\n\n`);

    try {
      // Stream the AI response
      for await (const chunk of aiService.streamResponse(chatRequest)) {
        res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
      }

      // Send completion signal
      res.write(`data: ${JSON.stringify({ type: 'end' })}\n\n`);
    } catch (streamError) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Stream error occurred' })}\n\n`);
    }

    res.end();
  } catch (error) {
    console.error('AI stream error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start AI stream',
    });
  }
});

/**
 * GET /api/ai/context/:projectId
 * Get project context for AI processing
 */
router.get('/context/:projectId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { currentFile } = req.query;

    // Verify user has access to the project
    // const userId = (req as any).user?.id;
    // This would integrate with project service in production

    const context = await aiService.gatherProjectContext(
      projectId,
      currentFile as string | undefined
    );

    res.json({
      success: true,
      data: context,
    });
  } catch (error) {
    console.error('AI context error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to gather project context',
    });
  }
});

/**
 * POST /api/ai/feedback
 * Submit feedback on AI responses
 */
router.post('/feedback', requireAuth, async (req: Request, res: Response) => {
  try {
    const { messageId, feedback, comment } = req.body;

    // In production, this would store feedback for AI improvement
    console.log('AI Feedback received:', { messageId, feedback, comment });

    res.json({
      success: true,
      message: 'Feedback received',
    });
  } catch (error) {
    console.error('AI feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback',
    });
  }
});

export default router;