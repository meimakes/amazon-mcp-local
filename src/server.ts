import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  InitializeRequestSchema,
  PingRequestSchema,
  ListResourcesRequestSchema,
  ListPromptsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { searchProducts, addToCart, getCart, checkLoginStatus } from './amazon';
import { closeBrowser, getBrowser, getPage } from './browser';

dotenv.config();

const PORT = process.env.PORT || 3000;
const AUTH_TOKEN = process.env.AUTH_TOKEN;

// Create MCP Server
const mcpServer = new Server({
  name: 'amazon-cart-server',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {},
    resources: {},
    prompts: {},
  },
});

// Handle initialization
mcpServer.setRequestHandler(InitializeRequestSchema, async () => {
  console.log('Initialize request received');
  return {
    protocolVersion: '2024-11-05',
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
    serverInfo: {
      name: 'amazon-cart-server',
      version: '1.0.0',
    },
  };
});

// Handle ping (keepalive)
mcpServer.setRequestHandler(PingRequestSchema, async () => {
  console.log('Ping request received');
  return {};
});

// Handle resources list (we don't have any, but need to respond)
mcpServer.setRequestHandler(ListResourcesRequestSchema, async () => {
  console.log('List resources request received');
  return {
    resources: [],
  };
});

// Handle prompts list (we don't have any, but need to respond)
mcpServer.setRequestHandler(ListPromptsRequestSchema, async () => {
  console.log('List prompts request received');
  return {
    prompts: [],
  };
});

// Define MCP Tools
mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
  console.log('List tools request received');
  return {
    tools: [
    {
      name: 'search_amazon',
      description: 'Search for products on Amazon',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query for Amazon products',
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'add_to_cart',
      description: 'Add a product to Amazon cart',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Product name to search and add',
          },
          asin: {
            type: 'string',
            description: 'Amazon ASIN (product ID) - use this if known',
          },
          quantity: {
            type: 'number',
            description: 'Quantity to add (default: 1)',
            default: 1,
          },
        },
      },
    },
    {
      name: 'view_cart',
      description: 'View current Amazon cart contents',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'check_login',
      description: 'Check if logged into Amazon',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    ],
  };
});

mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;

    switch (name) {
      case 'search_amazon':
        result = await searchProducts((args as any)?.query);
        break;
      case 'add_to_cart':
        result = await addToCart(args as any);
        break;
      case 'view_cart':
        result = await getCart();
        break;
      case 'check_login':
        result = await checkLoginStatus();
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error),
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

// Create Express server for HTTP transport
const app = express();
app.use(cors());
app.use(express.json());

// Track active SSE connections
interface SSEConnection {
  res: Response;
  sessionId: string;
}

const activeConnections = new Map<string, SSEConnection>();

// Helper to send SSE message
function sendSSEMessage(res: Response, data: any) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  res.write(message);
}

// Authentication middleware
const authenticate = (req: Request, res: Response, next: express.NextFunction) => {
  // Check multiple auth methods
  const headerToken = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  const queryToken = req.query.token as string;
  const providedToken = headerToken || queryToken;

  console.log('Auth attempt:', {
    hasAuthHeader: !!req.headers.authorization,
    hasQueryToken: !!queryToken,
    path: req.path
  });

  // If no AUTH_TOKEN is set, allow all requests
  if (!AUTH_TOKEN) {
    console.log('No AUTH_TOKEN set - allowing request');
    next();
    return;
  }

  // Check if provided token matches
  if (providedToken === AUTH_TOKEN) {
    console.log('Auth successful');
    next();
  } else {
    console.log('Auth failed - invalid or missing token');
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', server: 'amazon-mcp-server' });
});

// SSE endpoint for MCP
app.get('/sse', authenticate, async (req: Request, res: Response) => {
  console.log('SSE connection request received');
  console.log('Request URL:', req.url);
  console.log('Request query:', req.query);

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // Important: set status before writing
  res.status(200);

  // Generate session ID
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  console.log('Created SSE session:', sessionId);

  // Store connection
  activeConnections.set(sessionId, { res, sessionId });

  // Send initial comment to establish connection
  res.write(': connected\n\n');

  // Send endpoint event telling client where to POST messages
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const endpoint = `${protocol}://${host}/message`;

  res.write('event: endpoint\n');
  res.write(`data: ${endpoint}\n\n`);
  console.log('Sent endpoint:', endpoint);

  // Keep connection alive with periodic heartbeat
  const heartbeat = setInterval(() => {
    if (res.writable) {
      res.write(': ping\n\n');
      console.log('Sent heartbeat for session:', sessionId);
    } else {
      clearInterval(heartbeat);
    }
  }, 15000);

  // Clean up on connection close
  req.on('close', () => {
    console.log('Request closed for session:', sessionId);
    clearInterval(heartbeat);
    activeConnections.delete(sessionId);
  });

  res.on('close', () => {
    console.log('Response closed for session:', sessionId);
    clearInterval(heartbeat);
    activeConnections.delete(sessionId);
  });

  res.on('error', (err) => {
    console.error('SSE error for session:', sessionId, err);
    clearInterval(heartbeat);
    activeConnections.delete(sessionId);
  });
});

// Message endpoint for SSE (receives client messages)
app.post('/message', authenticate, async (req: Request, res: Response) => {
  const jsonrpcRequest = req.body;

  console.log('Message received');
  console.log('Request:', JSON.stringify(jsonrpcRequest, null, 2));

  // Find the most recent SSE connection (there should typically only be one)
  const connection = Array.from(activeConnections.values())[0];

  if (!connection) {
    console.error('No active SSE connection found');
    res.status(503).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'No active connection' },
      id: jsonrpcRequest?.id || null
    });
    return;
  }

  try {
    // Check if this is a notification (no id field) or a request
    const isNotification = !jsonrpcRequest.id && jsonrpcRequest.id !== 0;

    if (isNotification) {
      // Notifications don't get responses, just acknowledge
      console.log('Received notification:', jsonrpcRequest.method);
      res.status(202).end();
      return;
    }

    // Process JSON-RPC request
    let response;

    // Route the request to the appropriate MCP handler
    if (jsonrpcRequest.method === 'initialize') {
      response = {
        jsonrpc: '2.0',
        id: jsonrpcRequest.id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
            resources: {},
            prompts: {},
          },
          serverInfo: {
            name: 'amazon-cart-server',
            version: '1.0.0',
          },
        },
      };
    } else if (jsonrpcRequest.method === 'tools/list') {
      console.log('List tools request received');
      response = {
        jsonrpc: '2.0',
        id: jsonrpcRequest.id,
        result: {
          tools: [
            {
              name: 'search_amazon',
              description: 'Search for products on Amazon',
              inputSchema: {
                type: 'object',
                properties: {
                  query: {
                    type: 'string',
                    description: 'Search query for Amazon products',
                  },
                },
                required: ['query'],
              },
            },
            {
              name: 'add_to_cart',
              description: 'Add a product to Amazon cart',
              inputSchema: {
                type: 'object',
                properties: {
                  query: {
                    type: 'string',
                    description: 'Product name to search and add',
                  },
                  asin: {
                    type: 'string',
                    description: 'Amazon ASIN (product ID) - use this if known',
                  },
                  quantity: {
                    type: 'number',
                    description: 'Quantity to add (default: 1)',
                    default: 1,
                  },
                },
              },
            },
            {
              name: 'view_cart',
              description: 'View current Amazon cart contents',
              inputSchema: {
                type: 'object',
                properties: {},
              },
            },
            {
              name: 'check_login',
              description: 'Check if logged into Amazon',
              inputSchema: {
                type: 'object',
                properties: {},
              },
            },
          ],
        },
      };
    } else if (jsonrpcRequest.method === 'tools/call') {
      console.log('Tool call request:', jsonrpcRequest.params);
      const toolName = jsonrpcRequest.params.name;
      const toolArgs = jsonrpcRequest.params.arguments || {};

      let toolResult;
      try {
        switch (toolName) {
          case 'search_amazon':
            toolResult = await searchProducts(toolArgs.query);
            break;
          case 'add_to_cart':
            toolResult = await addToCart(toolArgs);
            break;
          case 'view_cart':
            toolResult = await getCart();
            break;
          case 'check_login':
            toolResult = await checkLoginStatus();
            break;
          default:
            throw new Error(`Unknown tool: ${toolName}`);
        }

        response = {
          jsonrpc: '2.0',
          id: jsonrpcRequest.id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(toolResult, null, 2),
              },
            ],
          },
        };
      } catch (error) {
        response = {
          jsonrpc: '2.0',
          id: jsonrpcRequest.id,
          error: {
            code: -32603,
            message: error instanceof Error ? error.message : 'Tool execution failed',
          },
        };
      }
    } else {
      // Unknown method
      response = {
        jsonrpc: '2.0',
        id: jsonrpcRequest.id,
        error: {
          code: -32601,
          message: `Method not found: ${jsonrpcRequest.method}`,
        },
      };
    }

    console.log('Sending response via SSE:', JSON.stringify(response, null, 2));

    // Send response via SSE
    sendSSEMessage(connection.res, response);

    // Acknowledge receipt of POST
    res.status(202).end();
  } catch (error) {
    console.error('Error handling message:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal error' },
        id: jsonrpcRequest?.id || null
      });
    }
  }
});

// Start server
app.listen(PORT, async () => {
  console.log(`Amazon MCP Server running on port ${PORT}`);
  console.log(`Use ngrok to expose: ngrok http ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);

  // Initialize browser and open Amazon for login
  console.log('\nInitializing browser...');
  try {
    const browser = await getBrowser();
    const page = await getPage();
    const AMAZON_DOMAIN = process.env.AMAZON_DOMAIN || 'amazon.com';
    await page.goto(`https://www.${AMAZON_DOMAIN}`, { waitUntil: 'networkidle2' });
    console.log('Browser opened! Please log into Amazon if needed.');
    console.log('Your session will be saved for future use.\n');
  } catch (error) {
    console.error('Failed to initialize browser:', error);
  }
});

// Cleanup on exit
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await closeBrowser();
  process.exit(0);
});
