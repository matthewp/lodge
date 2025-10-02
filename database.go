package main

import (
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"fmt"
	"log"
	"time"

	"golang.org/x/crypto/bcrypt"
	_ "modernc.org/sqlite"
)

type Database struct {
	db *sql.DB
}

func NewDatabase(dbPath string) (*Database, error) {
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Enable foreign keys
	if _, err := db.Exec("PRAGMA foreign_keys = ON"); err != nil {
		return nil, fmt.Errorf("failed to enable foreign keys: %w", err)
	}

	// Set journal mode to WAL for better concurrency
	if _, err := db.Exec("PRAGMA journal_mode = WAL"); err != nil {
		return nil, fmt.Errorf("failed to set journal mode: %w", err)
	}

	d := &Database{db: db}

	if err := d.migrate(); err != nil {
		return nil, fmt.Errorf("failed to migrate database: %w", err)
	}

	return d, nil
}

func (d *Database) migrate() error {
	schema := `
	-- Users table
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		username TEXT UNIQUE NOT NULL,
		password_hash TEXT NOT NULL,
		email TEXT,
		role TEXT NOT NULL DEFAULT 'editor',
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	-- Collections table (content types)
	CREATE TABLE IF NOT EXISTS collections (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT UNIQUE NOT NULL,
		slug TEXT UNIQUE NOT NULL,
		description TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	-- Collection Fields table
	CREATE TABLE IF NOT EXISTS collection_fields (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		collection_id INTEGER NOT NULL,
		name TEXT NOT NULL,
		label TEXT NOT NULL,
		type TEXT NOT NULL,
		required BOOLEAN DEFAULT 0,
		placeholder TEXT,
		default_value TEXT,
		sort_order INTEGER DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
		UNIQUE(collection_id, name)
	);

	-- Items table (actual content)
	CREATE TABLE IF NOT EXISTS items (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		collection_id INTEGER NOT NULL,
		slug TEXT,
		data TEXT NOT NULL, -- JSON content
		status TEXT NOT NULL DEFAULT 'draft',
		created_by INTEGER,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
		FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
	);

	-- Settings table
	CREATE TABLE IF NOT EXISTS settings (
		key TEXT PRIMARY KEY,
		value TEXT NOT NULL,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	-- API Keys table
	CREATE TABLE IF NOT EXISTS api_keys (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		key_hash TEXT UNIQUE NOT NULL,
		key_prefix TEXT NOT NULL,
		scopes TEXT, -- JSON array of scopes (for future use)
		created_by INTEGER,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		last_used_at DATETIME,
		is_active BOOLEAN DEFAULT 1,
		FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
	);

	-- Create indexes
	CREATE INDEX IF NOT EXISTS idx_collection_fields_collection_id ON collection_fields(collection_id);
	CREATE INDEX IF NOT EXISTS idx_collection_fields_sort_order ON collection_fields(collection_id, sort_order);
	CREATE INDEX IF NOT EXISTS idx_items_collection_id ON items(collection_id);
	CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
	CREATE INDEX IF NOT EXISTS idx_items_created_by ON items(created_by);
	CREATE INDEX IF NOT EXISTS idx_items_slug ON items(slug);
	CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
	CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);
	`

	if _, err := d.db.Exec(schema); err != nil {
		return fmt.Errorf("failed to create schema: %w", err)
	}

	log.Println("Database schema initialized")
	return nil
}

func (d *Database) Close() error {
	return d.db.Close()
}

func (d *Database) CreateUser(username, password, email, role string) error {
	// Hash the password with bcrypt
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	query := `INSERT INTO users (username, password_hash, email, role) VALUES (?, ?, ?, ?)`
	_, err = d.db.Exec(query, username, string(hashedPassword), email, role)
	if err != nil {
		return fmt.Errorf("failed to create user: %w", err)
	}
	return nil
}

func (d *Database) VerifyUserPassword(username, password string) error {
	user, err := d.GetUserByUsername(username)
	if err != nil {
		return fmt.Errorf("failed to get user: %w", err)
	}
	if user == nil {
		return fmt.Errorf("user not found")
	}

	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password))
	if err != nil {
		return fmt.Errorf("invalid password")
	}

	return nil
}

func (d *Database) GetUserByUsername(username string) (*User, error) {
	query := `SELECT id, username, password_hash, email, role FROM users WHERE username = ?`

	var user User
	err := d.db.QueryRow(query, username).Scan(
		&user.ID,
		&user.Username,
		&user.PasswordHash,
		&user.Email,
		&user.Role,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return &user, nil
}

func (d *Database) GetUsers() ([]User, error) {
	query := `SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC`
	rows, err := d.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to get users: %w", err)
	}
	defer rows.Close()

	var users []User
	for rows.Next() {
		var user User
		var createdAt time.Time
		err := rows.Scan(&user.ID, &user.Username, &user.Email, &user.Role, &createdAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan user: %w", err)
		}
		users = append(users, user)
	}

	if users == nil {
		users = []User{}
	}

	return users, nil
}

func (d *Database) DeleteUser(id int) error {
	query := `DELETE FROM users WHERE id = ?`
	result, err := d.db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to delete user: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("user not found")
	}

	return nil
}

// API Key Management
func (d *Database) CreateAPIKey(name string, createdBy int) (string, error) {
	// Generate a random API key
	keyBytes := make([]byte, 32)
	if _, err := rand.Read(keyBytes); err != nil {
		return "", fmt.Errorf("failed to generate random key: %w", err)
	}

	// Create the full API key with prefix
	fullKey := "lodge_" + hex.EncodeToString(keyBytes)

	// Hash the key for storage
	hasher := sha256.New()
	hasher.Write([]byte(fullKey))
	keyHash := hex.EncodeToString(hasher.Sum(nil))

	// Store only the prefix for display purposes (first 12 characters)
	keyPrefix := fullKey[:12] + "..."

	query := `INSERT INTO api_keys (name, key_hash, key_prefix, created_by) VALUES (?, ?, ?, ?)`
	_, err := d.db.Exec(query, name, keyHash, keyPrefix, createdBy)
	if err != nil {
		return "", fmt.Errorf("failed to create API key: %w", err)
	}

	return fullKey, nil
}

func (d *Database) GetAPIKeys() ([]APIKey, error) {
	log.Printf("Querying API keys from database...")
	query := `
		SELECT id, name, key_hash, key_prefix, scopes, created_by, created_at, last_used_at, is_active
		FROM api_keys
		ORDER BY created_at DESC
	`

	rows, err := d.db.Query(query)
	if err != nil {
		log.Printf("Failed to query API keys: %v", err)
		return nil, fmt.Errorf("failed to query API keys: %w", err)
	}
	defer rows.Close()

	var keys []APIKey
	for rows.Next() {
		var key APIKey
		err := rows.Scan(
			&key.ID,
			&key.Name,
			&key.KeyHash,
			&key.KeyPrefix,
			&key.Scopes,
			&key.CreatedBy,
			&key.CreatedAt,
			&key.LastUsedAt,
			&key.IsActive,
		)
		if err != nil {
			log.Printf("Failed to scan API key: %v", err)
			return nil, fmt.Errorf("failed to scan API key: %w", err)
		}
		keys = append(keys, key)
	}

	log.Printf("Found %d API keys in database", len(keys))

	// Ensure we return an empty slice instead of nil
	if keys == nil {
		log.Printf("Keys slice was nil, creating empty slice")
		keys = []APIKey{}
	}

	return keys, nil
}

func (d *Database) DeleteAPIKey(id int) error {
	query := `DELETE FROM api_keys WHERE id = ?`
	result, err := d.db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to delete API key: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("API key not found")
	}

	return nil
}

func (d *Database) ValidateAPIKey(apiKey string) (*APIKey, error) {
	// Hash the provided key
	hasher := sha256.New()
	hasher.Write([]byte(apiKey))
	keyHash := hex.EncodeToString(hasher.Sum(nil))

	query := `
		SELECT id, name, key_hash, key_prefix, scopes, created_by, created_at, last_used_at, is_active
		FROM api_keys
		WHERE key_hash = ? AND is_active = 1
	`

	var key APIKey
	err := d.db.QueryRow(query, keyHash).Scan(
		&key.ID,
		&key.Name,
		&key.KeyHash,
		&key.KeyPrefix,
		&key.Scopes,
		&key.CreatedBy,
		&key.CreatedAt,
		&key.LastUsedAt,
		&key.IsActive,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to validate API key: %w", err)
	}

	// Update last used timestamp
	updateQuery := `UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?`
	d.db.Exec(updateQuery, key.ID)

	return &key, nil
}

// Collection Management
func (d *Database) CreateCollection(name, slug, description string) (*Collection, error) {
	query := `INSERT INTO collections (name, slug, description) VALUES (?, ?, ?)`
	result, err := d.db.Exec(query, name, slug, description)
	if err != nil {
		return nil, fmt.Errorf("failed to create collection: %w", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return nil, fmt.Errorf("failed to get collection ID: %w", err)
	}

	return d.GetCollectionByID(int(id))
}

func (d *Database) GetCollections() ([]Collection, error) {
	query := `
		SELECT id, name, slug, description, created_at, updated_at
		FROM collections
		ORDER BY created_at DESC
	`

	rows, err := d.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to query collections: %w", err)
	}
	defer rows.Close()

	var collections []Collection
	for rows.Next() {
		var collection Collection
		err := rows.Scan(
			&collection.ID,
			&collection.Name,
			&collection.Slug,
			&collection.Description,
			&collection.CreatedAt,
			&collection.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan collection: %w", err)
		}
		collections = append(collections, collection)
	}

	if collections == nil {
		collections = []Collection{}
	}

	return collections, nil
}

func (d *Database) GetCollectionByID(id int) (*Collection, error) {
	query := `
		SELECT id, name, slug, description, created_at, updated_at
		FROM collections
		WHERE id = ?
	`

	var collection Collection
	err := d.db.QueryRow(query, id).Scan(
		&collection.ID,
		&collection.Name,
		&collection.Slug,
		&collection.Description,
		&collection.CreatedAt,
		&collection.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get collection: %w", err)
	}

	return &collection, nil
}

func (d *Database) GetCollectionBySlug(slug string) (*Collection, error) {
	query := `
		SELECT id, name, slug, description, created_at, updated_at
		FROM collections
		WHERE slug = ?
	`

	var collection Collection
	err := d.db.QueryRow(query, slug).Scan(
		&collection.ID,
		&collection.Name,
		&collection.Slug,
		&collection.Description,
		&collection.CreatedAt,
		&collection.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get collection: %w", err)
	}

	return &collection, nil
}

func (d *Database) UpdateCollection(id int, name, slug, description string) error {
	query := `
		UPDATE collections
		SET name = ?, slug = ?, description = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`
	result, err := d.db.Exec(query, name, slug, description, id)
	if err != nil {
		return fmt.Errorf("failed to update collection: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("collection not found")
	}

	return nil
}

// Collection Field Management
func (d *Database) CreateCollectionField(collectionID int, name, label, fieldType string, required bool, placeholder, defaultValue string, sortOrder int) (*CollectionField, error) {
	query := `
		INSERT INTO collection_fields (collection_id, name, label, type, required, placeholder, default_value, sort_order)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`
	result, err := d.db.Exec(query, collectionID, name, label, fieldType, required, placeholder, defaultValue, sortOrder)
	if err != nil {
		return nil, fmt.Errorf("failed to create collection field: %w", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return nil, fmt.Errorf("failed to get field ID: %w", err)
	}

	return d.GetCollectionFieldByID(int(id))
}

func (d *Database) GetCollectionFields(collectionID int) ([]CollectionField, error) {
	query := `
		SELECT id, collection_id, name, label, type, required, placeholder, default_value, sort_order, created_at
		FROM collection_fields
		WHERE collection_id = ?
		ORDER BY sort_order ASC, created_at ASC
	`

	rows, err := d.db.Query(query, collectionID)
	if err != nil {
		return nil, fmt.Errorf("failed to query collection fields: %w", err)
	}
	defer rows.Close()

	var fields []CollectionField
	for rows.Next() {
		var field CollectionField
		err := rows.Scan(
			&field.ID,
			&field.CollectionID,
			&field.Name,
			&field.Label,
			&field.Type,
			&field.Required,
			&field.Placeholder,
			&field.DefaultValue,
			&field.SortOrder,
			&field.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan collection field: %w", err)
		}
		fields = append(fields, field)
	}

	if fields == nil {
		fields = []CollectionField{}
	}

	return fields, nil
}

func (d *Database) GetCollectionFieldByID(id int) (*CollectionField, error) {
	query := `
		SELECT id, collection_id, name, label, type, required, placeholder, default_value, sort_order, created_at
		FROM collection_fields
		WHERE id = ?
	`

	var field CollectionField
	err := d.db.QueryRow(query, id).Scan(
		&field.ID,
		&field.CollectionID,
		&field.Name,
		&field.Label,
		&field.Type,
		&field.Required,
		&field.Placeholder,
		&field.DefaultValue,
		&field.SortOrder,
		&field.CreatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get collection field: %w", err)
	}

	return &field, nil
}

func (d *Database) UpdateCollectionField(id int, name, label, fieldType string, required bool, placeholder, defaultValue string, sortOrder int) error {
	query := `
		UPDATE collection_fields
		SET name = ?, label = ?, type = ?, required = ?, placeholder = ?, default_value = ?, sort_order = ?
		WHERE id = ?
	`
	result, err := d.db.Exec(query, name, label, fieldType, required, placeholder, defaultValue, sortOrder, id)
	if err != nil {
		return fmt.Errorf("failed to update collection field: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("collection field not found")
	}

	return nil
}

func (d *Database) DeleteCollectionField(id int) error {
	query := `DELETE FROM collection_fields WHERE id = ?`
	result, err := d.db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to delete collection field: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("collection field not found")
	}

	return nil
}

type User struct {
	ID           int
	Username     string
	PasswordHash string
	Email        sql.NullString
	Role         string
}

type APIKey struct {
	ID           int
	Name         string
	KeyHash      string
	KeyPrefix    string
	Scopes       sql.NullString
	CreatedBy    sql.NullInt64
	CreatedAt    time.Time
	LastUsedAt   sql.NullTime
	IsActive     bool
}

type Collection struct {
	ID          int
	Name        string
	Slug        string
	Description sql.NullString
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type CollectionField struct {
	ID           int
	CollectionID int
	Name         string
	Label        string
	Type         string
	Required     bool
	Placeholder  sql.NullString
	DefaultValue sql.NullString
	SortOrder    int
	CreatedAt    time.Time
}

type Item struct {
	ID           int            `json:"id"`
	CollectionID int            `json:"collectionId"`
	Slug         sql.NullString `json:"slug,omitempty"`
	Data         string         `json:"data"` // JSON
	Status       string         `json:"status"`
	CreatedBy    sql.NullInt64  `json:"createdBy,omitempty"`
	CreatedAt    time.Time      `json:"createdAt"`
	UpdatedAt    time.Time      `json:"updatedAt"`
}

// Items Management
func (d *Database) CreateItem(collectionID int, slug, data, status string, createdBy int) (*Item, error) {
	query := `
		INSERT INTO items (collection_id, slug, data, status, created_by, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
	`

	var slugParam interface{}
	if slug != "" {
		slugParam = slug
	} else {
		slugParam = nil
	}

	result, err := d.db.Exec(query, collectionID, slugParam, data, status, createdBy)
	if err != nil {
		return nil, fmt.Errorf("failed to create item: %w", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return nil, fmt.Errorf("failed to get item ID: %w", err)
	}

	return d.GetItem(int(id))
}

func (d *Database) GetItem(id int) (*Item, error) {
	query := `
		SELECT id, collection_id, slug, data, status, created_by, created_at, updated_at
		FROM items WHERE id = ?
	`

	var item Item
	err := d.db.QueryRow(query, id).Scan(
		&item.ID,
		&item.CollectionID,
		&item.Slug,
		&item.Data,
		&item.Status,
		&item.CreatedBy,
		&item.CreatedAt,
		&item.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get item: %w", err)
	}

	return &item, nil
}

func (d *Database) GetItemsByCollection(collectionID int) ([]Item, error) {
	query := `
		SELECT id, collection_id, slug, data, status, created_by, created_at, updated_at
		FROM items
		WHERE collection_id = ?
		ORDER BY created_at DESC
	`

	rows, err := d.db.Query(query, collectionID)
	if err != nil {
		return nil, fmt.Errorf("failed to get items: %w", err)
	}
	defer rows.Close()

	var items []Item
	for rows.Next() {
		var item Item
		err := rows.Scan(
			&item.ID,
			&item.CollectionID,
			&item.Slug,
			&item.Data,
			&item.Status,
			&item.CreatedBy,
			&item.CreatedAt,
			&item.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan item: %w", err)
		}
		items = append(items, item)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating items: %w", err)
	}

	// Return empty slice instead of nil if no items found
	if items == nil {
		items = []Item{}
	}

	return items, nil
}

func (d *Database) GetItemsByCollectionWithPagination(collectionID int, limit, offset int) ([]Item, error) {
	query := `
		SELECT id, collection_id, slug, data, status, created_by, created_at, updated_at
		FROM items
		WHERE collection_id = ?
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`

	rows, err := d.db.Query(query, collectionID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get items: %w", err)
	}
	defer rows.Close()

	var items []Item
	for rows.Next() {
		var item Item
		err := rows.Scan(
			&item.ID,
			&item.CollectionID,
			&item.Slug,
			&item.Data,
			&item.Status,
			&item.CreatedBy,
			&item.CreatedAt,
			&item.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan item: %w", err)
		}
		items = append(items, item)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating items: %w", err)
	}

	// Return empty slice instead of nil if no items found
	if items == nil {
		items = []Item{}
	}

	return items, nil
}

func (d *Database) UpdateItem(id int, slug, data, status string) error {
	query := `
		UPDATE items
		SET slug = ?, data = ?, status = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`

	var slugParam interface{}
	if slug != "" {
		slugParam = slug
	} else {
		slugParam = nil
	}

	result, err := d.db.Exec(query, slugParam, data, status, id)
	if err != nil {
		return fmt.Errorf("failed to update item: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("item not found")
	}

	return nil
}

func (d *Database) DeleteItem(id int) error {
	query := `DELETE FROM items WHERE id = ?`
	result, err := d.db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to delete item: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("item not found")
	}

	return nil
}
// GetStats returns counts for dashboard statistics
func (d *Database) GetStats() (map[string]int, error) {
	stats := map[string]int{}

	// Get collection count
	var collectionCount int
	err := d.db.QueryRow("SELECT COUNT(*) FROM collections").Scan(&collectionCount)
	if err != nil {
		log.Printf("Failed to get collection count: %v", err)
		collectionCount = 0
	}
	stats["collections"] = collectionCount

	// Get item count
	var itemCount int
	err = d.db.QueryRow("SELECT COUNT(*) FROM items").Scan(&itemCount)
	if err != nil {
		log.Printf("Failed to get item count: %v", err)
		itemCount = 0
	}
	stats["items"] = itemCount

	// Get user count
	var userCount int
	err = d.db.QueryRow("SELECT COUNT(*) FROM users").Scan(&userCount)
	if err != nil {
		log.Printf("Failed to get user count: %v", err)
		userCount = 0
	}
	stats["users"] = userCount

	// Get API key count
	var apiKeyCount int
	err = d.db.QueryRow("SELECT COUNT(*) FROM api_keys").Scan(&apiKeyCount)
	if err != nil {
		log.Printf("Failed to get API key count: %v", err)
		apiKeyCount = 0
	}
	stats["apiKeys"] = apiKeyCount

	return stats, nil
}
