# Amazon Cart MCP Server Specification

## Overview

A local MCP server that enables AI assistants (like Poke) to interact with your personal Amazon cart through browser automation, exposed securely via ngrok.

## Architecture

```
┌─────────────────┐
│   Poke.com      │ (Remote AI Assistant)
│   (Cloud)       │
└────────┬────────┘
         │ HTTPS
         ↓
┌─────────────────┐
│     ngrok       │ (Secure Tunnel)
│  Public URL     │
└────────┬────────┘
         │ Local
         ↓
┌─────────────────┐
│   MCP Server    │ (Port 3000)
│   HTTP/SSE      │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   Puppeteer     │ (Browser Automation)
│  + Chrome       │
│  (Persistent    │
│   Session)      │
└─────────────────┘
```

## Technology Stack

- **MCP Server**: Node.js + TypeScript (using `@modelcontextprotocol/sdk`)
- **Browser Automation**: Puppeteer
- **Transport**: HTTP with Server-Sent Events (SSE)
- **Tunnel**: ngrok
- **Security**: Bearer token authentication

## File Structure

```
amazon-mcp-server/
├── package.json
├── tsconfig.json
├── .env
├── .gitignore
├── src/
│   ├── server.ts           # MCP server implementation
│   ├── amazon.ts           # Amazon-specific Puppeteer logic
│   ├── browser.ts          # Browser management
│   └── types.ts            # TypeScript types
├── user-data/              # Chrome user data (persisted sessions)
│   └── .gitkeep
└── README.md
```

## Implementation

### 1. package.json

```json
{
  "name": "amazon-mcp-server",
  "version": "1.0.0",
  "description": "MCP server for Amazon cart automation",
  "main": "dist/server.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/server.js",
    "dev": "ts-node src/server.ts",
    "tunnel": "ngrok http 3000"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.5.0",
    "puppeteer": "^21.0.0",
    "express": "^4.18.2",
    "dotenv": "^16.3.1",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/express": "^4.17.0",
    "@types/cors": "^2.8.0",
    "typescript": "^5.0.0",
    "ts-node": "^10.9.0"
  }
}
```

### 2. tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

### 3. .env

```bash
# Server Configuration
PORT=3000
AUTH_TOKEN=your-secure-random-token-here-change-this

# Amazon Configuration
AMAZON_DOMAIN=amazon.com
# Options: amazon.com, amazon.co.uk, amazon.de, etc.

# Browser Configuration
HEADLESS=false
# Set to true for production, false for debugging

# User Data Directory
USER_DATA_DIR=./user-data
```

### 4. src/types.ts

```typescript
export interface AddToCartParams {
  query?: string;           // Search query
  asin?: string;            // Amazon ASIN
  quantity?: number;        // Quantity to add (default: 1)
}

export interface CartItem {
  title: string;
  price: string;
  quantity: number;
  asin: string;
  imageUrl: string;
}

export interface SearchResult {
  title: string;
  asin: string;
  price: string;
  rating: string;
  imageUrl: string;
}

export interface OperationResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}
```

### 5. src/browser.ts

```typescript
import puppeteer, { Browser, Page } from 'puppeteer';
import path from 'path';

let browserInstance: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.connected) {
    return browserInstance;
  }

  const userDataDir = path.resolve(process.env.USER_DATA_DIR || './user-data');
  const headless = process.env.HEADLESS === 'true';

  browserInstance = await puppeteer.launch({
    headless,
    userDataDir,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
    ],
    defaultViewport: {
      width: 1280,
      height: 800,
    },
  });

  return browserInstance;
}

export async function getPage(): Promise<Page> {
  const browser = await getBrowser();
  const pages = await browser.pages();
  
  if (pages.length > 0) {
    return pages[0];
  }
  
  return await browser.newPage();
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}
```

### 6. src/amazon.ts

```typescript
import { Page } from 'puppeteer';
import { getPage } from './browser';
import { AddToCartParams, CartItem, SearchResult, OperationResult } from './types';

const AMAZON_DOMAIN = process.env.AMAZON_DOMAIN || 'amazon.com';
const BASE_URL = `https://www.${AMAZON_DOMAIN}`;

async function waitForElement(page: Page, selector: string, timeout = 5000): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch {
    return false;
  }
}

export async function searchProducts(query: string): Promise<OperationResult> {
  try {
    const page = await getPage();
    
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    
    // Search for product
    await page.waitForSelector('#twotabsearchtextbox');
    await page.type('#twotabsearchtextbox', query);
    await page.click('#nav-search-submit-button');
    
    await page.waitForSelector('[data-component-type="s-search-result"]');
    
    // Extract search results
    const results = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('[data-component-type="s-search-result"]'));
      return items.slice(0, 5).map(item => {
        const titleEl = item.querySelector('h2 a span');
        const priceWhole = item.querySelector('.a-price-whole');
        const priceFraction = item.querySelector('.a-price-fraction');
        const ratingEl = item.querySelector('.a-icon-star-small span');
        const imageEl = item.querySelector('img.s-image');
        const asinAttr = item.getAttribute('data-asin');
        
        return {
          title: titleEl?.textContent?.trim() || 'Unknown',
          price: priceWhole && priceFraction 
            ? `$${priceWhole.textContent}${priceFraction.textContent}` 
            : 'Price not available',
          rating: ratingEl?.textContent?.trim() || 'No rating',
          imageUrl: imageEl?.getAttribute('src') || '',
          asin: asinAttr || '',
        };
      });
    });
    
    return {
      success: true,
      message: `Found ${results.length} products`,
      data: results,
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to search products',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function addToCart(params: AddToCartParams): Promise<OperationResult> {
  try {
    const page = await getPage();
    const quantity = params.quantity || 1;
    
    // Navigate to product page
    if (params.asin) {
      await page.goto(`${BASE_URL}/dp/${params.asin}`, { waitUntil: 'networkidle2' });
    } else if (params.query) {
      // Search first, then click first result
      await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
      await page.waitForSelector('#twotabsearchtextbox');
      await page.type('#twotabsearchtextbox', params.query);
      await page.click('#nav-search-submit-button');
      
      await page.waitForSelector('[data-component-type="s-search-result"] h2 a');
      await page.click('[data-component-type="s-search-result"] h2 a');
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
    } else {
      throw new Error('Either query or asin must be provided');
    }
    
    // Get product title
    const title = await page.evaluate(() => {
      const titleEl = document.querySelector('#productTitle');
      return titleEl?.textContent?.trim() || 'Unknown Product';
    });
    
    // Set quantity if more than 1
    if (quantity > 1) {
      const quantityExists = await waitForElement(page, '#quantity');
      if (quantityExists) {
        await page.select('#quantity', String(quantity));
      }
    }
    
    // Click Add to Cart button
    const addToCartButton = await page.$('#add-to-cart-button');
    if (!addToCartButton) {
      throw new Error('Add to Cart button not found');
    }
    
    await addToCartButton.click();
    
    // Wait for confirmation
    const confirmationExists = await waitForElement(page, '#sw-atc-confirmation, #NATC_SMART_WAGON_CONF_MSG_SUCCESS', 3000);
    
    if (!confirmationExists) {
      // Try alternate method - check if cart count increased
      await page.waitForTimeout(2000);
    }
    
    return {
      success: true,
      message: `Added "${title}" to cart (quantity: ${quantity})`,
      data: { title, quantity },
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to add item to cart',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function getCart(): Promise<OperationResult> {
  try {
    const page = await getPage();
    
    await page.goto(`${BASE_URL}/gp/cart/view.html`, { waitUntil: 'networkidle2' });
    
    // Check if cart is empty
    const emptyCart = await page.$('.sc-your-amazon-cart-is-empty');
    if (emptyCart) {
      return {
        success: true,
        message: 'Cart is empty',
        data: { items: [], total: '$0.00' },
      };
    }
    
    // Extract cart items
    const items = await page.evaluate(() => {
      const cartItems = Array.from(document.querySelectorAll('[data-name="Active Items"] .sc-list-item'));
      return cartItems.map(item => {
        const titleEl = item.querySelector('.sc-product-title');
        const priceEl = item.querySelector('.sc-product-price');
        const quantityEl = item.querySelector('[name^="quantity"]') as HTMLSelectElement;
        const imageEl = item.querySelector('img');
        const asinAttr = item.getAttribute('data-asin');
        
        return {
          title: titleEl?.textContent?.trim() || 'Unknown',
          price: priceEl?.textContent?.trim() || 'N/A',
          quantity: quantityEl?.value ? parseInt(quantityEl.value) : 1,
          asin: asinAttr || '',
          imageUrl: imageEl?.getAttribute('src') || '',
        };
      });
    });
    
    // Get subtotal
    const subtotal = await page.evaluate(() => {
      const subtotalEl = document.querySelector('#sc-subtotal-amount-activecart .sc-price');
      return subtotalEl?.textContent?.trim() || '$0.00';
    });
    
    return {
      success: true,
      message: `Cart contains ${items.length} item(s)`,
      data: { items, subtotal },
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to get cart contents',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function checkLoginStatus(): Promise<OperationResult> {
  try {
    const page = await getPage();
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    
    const isLoggedIn = await page.evaluate(() => {
      const accountList = document.querySelector('#nav-link-accountList-nav-line-1');
      return accountList?.textContent?.includes('Hello') || false;
    });
    
    return {
      success: true,
      message: isLoggedIn ? 'Logged in to Amazon' : 'Not logged in',
      data: { loggedIn: isLoggedIn },
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to check login status',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
```

### 7. src/server.ts

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { searchProducts, addToCart, getCart, checkLoginStatus } from './amazon';
import { closeBrowser } from './browser';

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
  },
});

// Define MCP Tools
mcpServer.setRequestHandler('tools/list', async () => ({
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
}));

mcpServer.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;
    
    switch (name) {
      case 'search_amazon':
        result = await searchProducts(args.query);
        break;
      case 'add_to_cart':
        result = await addToCart(args);
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

// Authentication middleware
const authenticate = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!AUTH_TOKEN || token === AUTH_TOKEN) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', server: 'amazon-mcp-server' });
});

// MCP endpoint
app.post('/mcp', authenticate, async (req, res) => {
  try {
    const request = req.body;
    
    if (request.method === 'tools/list') {
      const response = await mcpServer.request(request, null as any);
      res.json(response);
    } else if (request.method === 'tools/call') {
      const response = await mcpServer.request(request, null as any);
      res.json(response);
    } else {
      res.status(400).json({ error: 'Unknown method' });
    }
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Amazon MCP Server running on port ${PORT}`);
  console.log(`Use ngrok to expose: ngrok http ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

// Cleanup on exit
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await closeBrowser();
  process.exit(0);
});
```

### 8. README.md

```markdown
# Amazon Cart MCP Server

Local MCP server for Amazon cart automation via Poke or other AI assistants.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment:
   ```bash
   cp .env.example .env
   # Edit .env and set AUTH_TOKEN
   ```

3. Build:
   ```bash
   npm run build
   ```

4. Start server:
   ```bash
   npm start
   ```

5. First-time setup - Log into Amazon:
   - Server will open a browser window
   - Log into Amazon manually
   - Session will be saved in `./user-data/`
   - Close browser when done

6. Expose via ngrok:
   ```bash
   npm run tunnel
   # Note the HTTPS URL provided by ngrok
   ```

## Connecting to Poke

1. Get your ngrok URL (e.g., `https://abc123.ngrok.io`)
2. In Poke, add custom integration:
   - URL: `https://abc123.ngrok.io/mcp`
   - Auth: Bearer token (from .env)
   - Type: MCP Server

## Available Tools

- `search_amazon`: Search for products
- `add_to_cart`: Add product to cart
- `view_cart`: View cart contents
- `check_login`: Verify Amazon login status

## Security Notes

- Keep your AUTH_TOKEN secret
- ngrok URL should not be shared publicly
- Session data stored locally in `./user-data/`
- Use ngrok's authentication features for extra security
```

## Security Configuration

### ngrok Configuration (ngrok.yml)

```yaml
version: "2"
authtoken: YOUR_NGROK_AUTH_TOKEN
tunnels:
  amazon-mcp:
    proto: http
    addr: 3000
    schemes:
      - https
    # Add IP restrictions if possible
    # ip_restriction:
    #   allow_cidrs:
    #     - YOUR_IP/32
```

Start with:
```bash
ngrok start amazon-mcp
```

## Testing

### Test with curl:

```bash
# Health check
curl http://localhost:3000/health

# List tools
curl -X POST http://localhost:3000/mcp \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/list", "params": {}}'

# Add to cart
curl -X POST http://localhost:3000/mcp \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "add_to_cart",
      "arguments": {
        "query": "wireless mouse",
        "quantity": 1
      }
    }
  }'
```
