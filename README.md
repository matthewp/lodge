# Lodge CMS

A simple, cozy headless CMS with emphasis on ease of deployment. Lodge CMS ships as a single binary with an embedded web UI, making it perfect for developers who want powerful content management without the complexity.

## Features

- **Single Binary Deployment** - Everything including the web UI ships as one executable
- **SQLite Database** - Embedded database, no external dependencies
- **Headless Architecture** - RESTful API for content access
- **Simple Tooling** - Built with esbuild, no complex build systems
- **Cross-Platform** - Supports Linux and FreeBSD
- **API Key Authentication** - Secure API access with key management
- **Modern Admin UI** - Clean, responsive interface built with Preact and Tailwind CSS

## Quick Start

### Prerequisites

- Go 1.24+ for building from source
- Node.js 22+ for frontend development

### Installation

1. Clone the repository:
```bash
git clone https://github.com/matthewp/lodge.git
cd lodge
```

2. Install frontend dependencies:
```bash
npm install
```

3. Run in development mode:
```bash
go run . --admin-user admin --admin-password yourpassword
```

4. Access the admin interface at `http://localhost:1717`

### Building for Production

1. Install dependencies (if not done):
```bash
npm install
```

2. Build the frontend:
```bash
npm run build
```
This creates optimized, minified assets in `ui/dist/` that get embedded into the Go binary.

3. Build the binary:
```bash
go build -o lodge .
```
The `//go:embed` directive automatically includes all frontend assets from `ui/dist/` into the compiled binary.

4. Run the binary:
```bash
./lodge --admin-user admin --admin-password yourpassword
```

The resulting binary is completely self-contained - no external files needed. You can verify this by moving the binary to a different directory and running it there.

## Usage

### Admin Interface

The admin interface is available at `http://localhost:1717` and includes:

- **Dashboard** - Overview of your content and statistics
- **Collections** - Manage content types and their field definitions
- **Users** - User account and permission management
- **Settings** - API key management and system configuration

### API Access

Lodge CMS provides a RESTful API for accessing your content:

#### Authentication

All API requests require an API key passed via the `X-API-Key` header:

```bash
curl -H "X-API-Key: your_api_key_here" \
  http://localhost:1717/api/collections/blog-posts
```

#### Endpoints

##### Get Collection Items
`GET /api/collections/{slug}`

Returns all items from a collection. Supports pagination with query parameters.

**Query Parameters:**
- `limit` - Number of items to return (default: 50, max: 100)
- `offset` - Number of items to skip for pagination (default: 0)

**Examples:**
```bash
# Get all items (first 50)
curl -H "X-API-Key: your_key" \
  http://localhost:1717/api/collections/blog-posts

# Get first 10 items
curl -H "X-API-Key: your_key" \
  "http://localhost:1717/api/collections/blog-posts?limit=10"

# Pagination - get next 10 items
curl -H "X-API-Key: your_key" \
  "http://localhost:1717/api/collections/blog-posts?limit=10&offset=10"
```

**Response:**
```json
[
  {
    "id": 1,
    "collectionId": 1,
    "slug": "",
    "data": {
      "title": "My Blog Post",
      "content": "This is the content...",
      "publishedAt": "2025-09-27"
    },
    "status": "published",
    "createdAt": "2025-09-27T17:30:34Z",
    "updatedAt": "2025-09-27T17:30:34Z"
  }
]
```

##### Get Single Item
`GET /api/collections/{slug}/{id}`

Returns a specific item by ID from a collection.

**Example:**
```bash
curl -H "X-API-Key: your_key" \
  http://localhost:1717/api/collections/blog-posts/1
```

**Response:**
```json
{
  "id": 1,
  "collectionId": 1,
  "slug": "",
  "data": {
    "title": "My Blog Post",
    "content": "This is the content...",
    "publishedAt": "2025-09-27"
  },
  "status": "published",
  "createdAt": "2025-09-27T17:30:34Z",
  "updatedAt": "2025-09-27T17:30:34Z"
}
```

#### Response Format

- **id**: Unique item identifier
- **collectionId**: ID of the parent collection
- **slug**: Optional URL slug for the item
- **data**: Object containing the actual content fields (varies by collection)
- **status**: Publication status (e.g., "draft", "published")
- **createdAt/updatedAt**: ISO 8601 timestamps

#### Error Responses

```json
{
  "error": "Collection not found"
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad request (invalid parameters)
- `401` - Unauthorized (missing/invalid API key)
- `404` - Collection or item not found
- `500` - Server error

### API Key Management

1. Go to **Settings** in the admin interface
2. Click **"Create New Key"** in the API Keys section
3. Enter a descriptive name for your key
4. Copy the generated key (it won't be shown again)
5. Use the key in your application's API requests

## Configuration

### Command Line Options

- `--admin-user` - Admin username for initial setup (required)
- `--admin-password` - Admin password for initial setup (required)
- `--data-dir` - Directory where database will be stored (default: current directory)

### Environment

Lodge CMS will automatically:
- Create a SQLite database file (`lodge.db`) in the data directory
- Start the frontend build watcher in development mode
- Serve the admin interface and API on port **1717**

## Development

### Project Structure

```
├── main.go              # Application entry point
├── server.go            # HTTP server and API routes
├── database.go          # Database models and operations
├── ui/                  # Frontend application
│   ├── src/
│   │   ├── pages/       # Admin interface pages
│   │   ├── components/  # Reusable UI components
│   │   ├── api/         # API client code
│   │   └── router/      # Client-side routing
│   └── dist/            # Built frontend assets
├── build.js             # Frontend build configuration
├── package.json         # Frontend dependencies
└── tailwind.config.js   # Tailwind CSS configuration
```

### Tech Stack

**Backend:**
- Go with `modernc.org/sqlite` (pure Go SQLite driver)
- JWT authentication for admin interface
- SHA256 hashing for API key storage

**Frontend:**
- Preact (lightweight React alternative)
- Tailwind CSS for styling
- esbuild for bundling
- TypeScript for type safety

### Database Schema

Lodge CMS uses SQLite with the following core tables:

- `users` - Admin user accounts with bcrypt password hashing
- `api_keys` - API keys with SHA256 hashing and usage tracking
- `collections` - Content type definitions (coming soon)
- `entries` - Content entries (coming soon)
- `settings` - System configuration

## Roadmap

- [ ] Collection creation and management
- [ ] Content entry forms with field types (text, markdown, etc.)
- [ ] Public API for content retrieval
- [ ] User role-based permissions
- [ ] API key scoping to specific collections
- [ ] Content preview and publishing workflow

## Philosophy

Lodge CMS embraces simplicity and coziness. We believe content management shouldn't require complex infrastructure, multiple services, or complicated deployment processes. Lodge aims to be the tool you reach for when you need a powerful but approachable headless CMS that just works.

## License

This project is licensed under the BSD 3-Clause License - see the [LICENSE](LICENSE) file for details.

## Contributing

[Contributing guidelines to be added]