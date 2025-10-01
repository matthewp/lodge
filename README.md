# Lodge CMS

A simple, cozy headless CMS with emphasis on ease of deployment. Lodge CMS ships as a single binary with an embedded web UI, making it perfect for developers who want powerful content management without the complexity.

## Features

- **Single Binary Deployment** - Everything including the web UI ships as one executable
- **SQLite Database** - Embedded database, no external dependencies
- **Headless Architecture** - RESTful API for content access
- **CSV Import/Export** - Bulk content management with support for migration from other CMSes
- **Simple Tooling** - Built with esbuild, no complex build systems
- **Cross-Platform** - Supports Linux and FreeBSD
- **API Key Authentication** - Secure API access with key management
- **Modern Admin UI** - Clean, responsive interface built with Preact and Tailwind CSS

## Quick Start

### Prerequisites

- Go 1.24+ for building from source
- Node.js 22+ for frontend development

### Installation

#### Package Manager Installation

**Ubuntu/Debian:**
```bash
# Import the GPG key
curl -fsSL https://matthewp.github.io/lodge/debian/gpg-key.asc | sudo gpg --dearmor -o /etc/apt/trusted.gpg.d/lodge.gpg

# Add the APT repository
echo "deb https://matthewp.github.io/lodge/debian/ stable main" | sudo tee /etc/apt/sources.list.d/lodge.list
sudo apt update
sudo apt install lodge
```

**FreeBSD:**
```bash
# Add the package repository
sudo mkdir -p /usr/local/etc/pkg/repos
echo 'lodge: {
  url: "https://matthewp.github.io/lodge/freebsd/",
  enabled: yes
}' | sudo tee /usr/local/etc/pkg/repos/lodge.conf
sudo pkg update
sudo pkg install lodge
```

#### Binary Download

Download the latest binary for your platform from the [releases page](https://github.com/matthewp/lodge/releases).

**Linux:**
```bash
curl -L -o lodge https://github.com/matthewp/lodge/releases/latest/download/lodge-linux-amd64
chmod +x lodge
sudo mv lodge /usr/local/bin/
```

**FreeBSD:**
```bash
curl -L -o lodge https://github.com/matthewp/lodge/releases/latest/download/lodge-freebsd-amd64
chmod +x lodge
sudo mv lodge /usr/local/bin/
```

#### Development Installation

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

### Using Pre-built Container Images

For easier deployment, you can use the pre-built container images:

```bash
# Using Docker
docker run -p 1717:1717 \
  -e ADMIN_USER=admin \
  -e ADMIN_PASSWORD=yourpassword \
  -v $(pwd)/data:/data \
  ghcr.io/matthewp/lodge:latest

# Using Podman
podman run -p 1717:1717 \
  -e ADMIN_USER=admin \
  -e ADMIN_PASSWORD=yourpassword \
  -v $(pwd)/data:/data \
  ghcr.io/matthewp/lodge:latest
```

The container images are automatically built and published to GitHub Container Registry on every release.

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

## CSV Import/Export

Lodge CMS provides powerful CSV import and export functionality for bulk content management. This feature is perfect for migrating content from other CMSes, data analysis, or managing large amounts of content efficiently.

### Accessing CSV Features

In the admin interface:
1. Navigate to any collection's detail page
2. Click the **"More"** dropdown button (top right)
3. Select **"Export CSV"** or **"Import CSV"**

### Export Format

CSV exports include both content data and metadata in a standardized format:

#### Column Structure
- **Metadata columns** (prefixed with `_`):
  - `_id` - Unique item identifier
  - `_slug` - URL slug (optional)
  - `_status` - Publication status (`draft`, `published`, `archived`)
  - `_created_at` - Creation timestamp (ISO 8601 format)
  - `_updated_at` - Last modification timestamp (ISO 8601 format)

- **Content columns**: Each field in your collection appears as a column with the field's name

#### Example Export
```csv
_id,_slug,_status,_created_at,_updated_at,title,content,author,published_date,featured
1,first-post,published,2024-01-15T10:30:00Z,2024-01-15T10:30:00Z,"My First Post","This is the content of my first post...","John Doe",2024-01-15,true
2,draft-post,draft,2024-01-16T14:20:00Z,2024-01-16T14:20:00Z,"Draft Post","Work in progress content...","Jane Smith",,false
```

#### Field Type Handling in Export
- **Text/Textarea/Email/URL/Markdown**: Exported as strings (properly escaped)
- **Number**: Exported as numeric values
- **Boolean**: Exported as `true`/`false`
- **Date**: Exported in ISO 8601 format (YYYY-MM-DD)
- **Empty fields**: Exported as empty strings

### Import Format Requirements

#### CSV Structure
Your CSV file must follow these requirements:

1. **First row must contain headers** matching your collection's field names
2. **Metadata columns are optional** but recommended:
   - Include `_id` for updating existing items (upsert mode)
   - Include `_slug` to set custom URL slugs
   - Include `_status` to control publication status
3. **Field columns** must match the exact field names in your collection
4. **Required fields** must have values (cannot be empty)

#### Import Modes
- **Create Only** (default): Skips rows where `_id` matches existing items
- **Create or Update**: Updates existing items if `_id` is provided, creates new ones otherwise

#### Field Type Conversion
Lodge automatically converts CSV values to appropriate types:

- **Text/Textarea/Email/URL/Markdown**: Used as-is (strings)
- **Number**: Parsed from string to numeric value
- **Boolean**: Accepts `true`, `1`, `yes`, `on` as true; everything else as false
- **Date**: Accepts various formats (ISO 8601, MM/DD/YYYY, etc.)

#### Example Import CSV
```csv
_slug,_status,title,content,author,published_date,featured
my-imported-post,published,"Imported Post","This content was imported from CSV","Import User",2024-01-20,true
another-post,draft,"Another Post","Draft content from import","Import User",,false
```

### Import Process

1. **File Upload**: Select your CSV file (must have `.csv` extension)
2. **Mode Selection**: Choose between "Create Only" or "Create or Update"
3. **Validation**: Lodge validates each row and reports any errors
4. **Results**: View detailed import statistics including:
   - ✅ Successful imports
   - ❌ Errors with specific error messages
   - ⏭️ Skipped items (in create-only mode)
   - 📊 Total rows processed

### Error Handling

Common import errors and solutions:

- **"Required field 'X' is empty"**: Ensure all required fields have values
- **"Invalid number for field 'X'"**: Check numeric fields contain valid numbers
- **"Failed to create item"**: Check for duplicate slugs or other validation errors
- **"Row X: Failed to read"**: Check CSV formatting, ensure proper escaping of quotes

### Migration Tips

#### From WordPress
1. Export your WordPress content as XML or use a plugin to generate CSV
2. Map WordPress fields to Lodge collection fields:
   - `post_title` → `title`
   - `post_content` → `content`
   - `post_date` → `published_date`
   - `post_status` → `_status` (map `publish` to `published`)

#### From Other CMSes
1. Export content in CSV format from your source CMS
2. Create a collection in Lodge with matching field types
3. Rename CSV columns to match Lodge field names
4. Convert data formats if needed (especially dates and booleans)
5. Import using "Create Only" mode for initial migration

#### Large Datasets
- **File size limit**: 10MB per CSV file
- **Processing**: Large files are processed row-by-row with detailed error reporting
- **Performance**: Consider splitting very large datasets into multiple files
- **Memory**: Lodge handles large imports efficiently with streaming processing

### Best Practices

1. **Test with small files first** to validate your format
2. **Use meaningful slugs** for better URL structure
3. **Set appropriate status values** (`draft` for review, `published` for live content)
4. **Backup your data** before large imports
5. **Validate required fields** in your source data before import
6. **Use consistent date formats** (ISO 8601 recommended: YYYY-MM-DD)

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
