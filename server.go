package main

import (
	"embed"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

//go:embed ui/dist/*
var uiFiles embed.FS

//go:embed ui/index.html
var indexHTML []byte

type Server struct {
	adminUser     string
	adminPassword string
	port          int
	db            *Database
	jwtSecret     []byte
}

func NewServer(adminUser, adminPassword string, db *Database) *Server {
	// Generate a random JWT secret (in production, use a persistent secret)
	jwtSecret := []byte("lodge-cms-secret-key-change-in-production")

	return &Server{
		adminUser:     adminUser,
		adminPassword: adminPassword,
		port:          1717,
		db:            db,
		jwtSecret:     jwtSecret,
	}
}

func (s *Server) Start() error {
	mux := http.NewServeMux()

	// Admin API routes
	mux.HandleFunc("/admin-api/login", s.handleAdminLogin)
	mux.HandleFunc("/admin-api/logout", s.handleAdminLogout)
	mux.HandleFunc("/admin-api/me", s.handleAdminMe)
	mux.HandleFunc("/admin-api/collections", s.handleAdminCollections)
	mux.HandleFunc("/admin-api/collections/", s.handleAdminCollectionFields)
	mux.HandleFunc("/admin-api/items/", s.handleAdminItems)
	mux.HandleFunc("/admin-api/api-keys", s.handleAdminAPIKeys)
	mux.HandleFunc("/admin-api/export/", s.handleAdminExportCSV)
	mux.HandleFunc("/admin-api/import/", s.handleAdminImportCSV)

	// Public API routes (for CMS content access)
	mux.HandleFunc("/api/collections/", s.handleAPICollections)

	// Static files
	uiFS, err := fs.Sub(uiFiles, "ui/dist")
	if err != nil {
		return fmt.Errorf("failed to create UI filesystem: %w", err)
	}
	mux.Handle("/dist/", http.StripPrefix("/dist/", http.FileServer(http.FS(uiFS))))

	// Serve index.html for all other routes (SPA routing)
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		// Serve static files if they exist, otherwise serve index.html for SPA routing
		if strings.HasPrefix(r.URL.Path, "/dist/") {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "text/html")
		w.Write(indexHTML)
	})

	addr := fmt.Sprintf(":%d", s.port)
	log.Printf("Lodge CMS starting on http://localhost%s", addr)
	return http.ListenAndServe(addr, mux)
}

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Success bool   `json:"success"`
	Token   string `json:"token,omitempty"`
	Error   string `json:"error,omitempty"`
}

func (s *Server) handleAdminLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.sendJSONError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Verify credentials against database
	if err := s.db.VerifyUserPassword(req.Username, req.Password); err != nil {
		s.sendJSONError(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	// Generate JWT token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"username": req.Username,
		"exp":      time.Now().Add(24 * time.Hour).Unix(),
		"iat":      time.Now().Unix(),
	})

	tokenString, err := token.SignedString(s.jwtSecret)
	if err != nil {
		s.sendJSONError(w, "Failed to generate token", http.StatusInternalServerError)
		return
	}

	response := LoginResponse{
		Success: true,
		Token:   tokenString,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (s *Server) handleAdminLogout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Validate JWT token
	_, err := s.validateJWTToken(r)
	if err != nil {
		s.sendJSONError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// TODO: In the future, we could maintain a blacklist of invalidated tokens
	// For now, the client-side token removal is sufficient

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"success": true}`))
}

func (s *Server) handleAdminMe(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	username, err := s.validateJWTToken(r)
	if err != nil {
		s.sendJSONError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	user, err := s.db.GetUserByUsername(username)
	if err != nil || user == nil {
		s.sendJSONError(w, "User not found", http.StatusNotFound)
		return
	}

	response := map[string]string{
		"username": user.Username,
		"role":     user.Role,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (s *Server) handleAdminCollections(w http.ResponseWriter, r *http.Request) {
	// Validate JWT token for all collection operations
	username, err := s.validateJWTToken(r)
	if err != nil {
		s.sendJSONError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	user, err := s.db.GetUserByUsername(username)
	if err != nil || user == nil {
		s.sendJSONError(w, "User not found", http.StatusNotFound)
		return
	}

	// Parse URL path to check for specific collection ID
	path := strings.TrimPrefix(r.URL.Path, "/admin-api/collections")

	if path == "" || path == "/" {
		// Handle collection list operations
		switch r.Method {
		case http.MethodGet:
			collections, err := s.db.GetCollections()
			if err != nil {
				log.Printf("Error getting collections: %v", err)
				s.sendJSONError(w, "Failed to fetch collections", http.StatusInternalServerError)
				return
			}

			type CollectionResponse struct {
				ID          int    `json:"id"`
				Name        string `json:"name"`
				Slug        string `json:"slug"`
				Description string `json:"description"`
				CreatedAt   string `json:"createdAt"`
				UpdatedAt   string `json:"updatedAt"`
			}

			var response []CollectionResponse
			for _, collection := range collections {
				resp := CollectionResponse{
					ID:        collection.ID,
					Name:      collection.Name,
					Slug:      collection.Slug,
					CreatedAt: collection.CreatedAt.Format("2006-01-02 15:04:05"),
					UpdatedAt: collection.UpdatedAt.Format("2006-01-02 15:04:05"),
				}
				if collection.Description.Valid {
					resp.Description = collection.Description.String
				}
				response = append(response, resp)
			}

			if response == nil {
				response = []CollectionResponse{}
			}

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(response)

		case http.MethodPost:
			type CreateCollectionRequest struct {
				Name        string `json:"name"`
				Slug        string `json:"slug"`
				Description string `json:"description"`
			}

			var req CreateCollectionRequest
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				s.sendJSONError(w, "Invalid request body", http.StatusBadRequest)
				return
			}

			if req.Name == "" || req.Slug == "" {
				s.sendJSONError(w, "Name and slug are required", http.StatusBadRequest)
				return
			}

			collection, err := s.db.CreateCollection(req.Name, req.Slug, req.Description)
			if err != nil {
				log.Printf("Error creating collection: %v", err)
				s.sendJSONError(w, "Failed to create collection", http.StatusInternalServerError)
				return
			}

			response := map[string]interface{}{
				"id":          collection.ID,
				"name":        collection.Name,
				"slug":        collection.Slug,
				"description": "",
				"createdAt":   collection.CreatedAt.Format("2006-01-02 15:04:05"),
				"updatedAt":   collection.UpdatedAt.Format("2006-01-02 15:04:05"),
			}
			if collection.Description.Valid {
				response["description"] = collection.Description.String
			}

			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusCreated)
			json.NewEncoder(w).Encode(response)

		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	} else {
		// Handle individual collection operations (future: GET /admin-api/collections/123)
		s.sendJSONError(w, "Individual collection operations not yet implemented", http.StatusNotImplemented)
	}
}

func (s *Server) handleAdminCollectionFields(w http.ResponseWriter, r *http.Request) {
	// Validate JWT token
	username, err := s.validateJWTToken(r)
	if err != nil {
		s.sendJSONError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	user, err := s.db.GetUserByUsername(username)
	if err != nil || user == nil {
		s.sendJSONError(w, "User not found", http.StatusNotFound)
		return
	}

	// Parse URL: /admin-api/collections/123/fields
	path := strings.TrimPrefix(r.URL.Path, "/admin-api/collections/")
	parts := strings.Split(path, "/")

	if len(parts) < 2 || parts[1] != "fields" {
		s.sendJSONError(w, "Invalid endpoint", http.StatusBadRequest)
		return
	}

	collectionIDStr := parts[0]
	var collectionID int
	if _, err := fmt.Sscanf(collectionIDStr, "%d", &collectionID); err != nil {
		s.sendJSONError(w, "Invalid collection ID", http.StatusBadRequest)
		return
	}

	// Verify collection exists
	collection, err := s.db.GetCollectionByID(collectionID)
	if err != nil {
		s.sendJSONError(w, "Failed to verify collection", http.StatusInternalServerError)
		return
	}
	if collection == nil {
		s.sendJSONError(w, "Collection not found", http.StatusNotFound)
		return
	}

	switch r.Method {
	case http.MethodGet:
		fields, err := s.db.GetCollectionFields(collectionID)
		if err != nil {
			log.Printf("Error getting collection fields: %v", err)
			s.sendJSONError(w, "Failed to fetch fields", http.StatusInternalServerError)
			return
		}

		type FieldResponse struct {
			ID           int    `json:"id"`
			Name         string `json:"name"`
			Label        string `json:"label"`
			Type         string `json:"type"`
			Required     bool   `json:"required"`
			Placeholder  string `json:"placeholder"`
			DefaultValue string `json:"defaultValue"`
			SortOrder    int    `json:"sortOrder"`
		}

		var response []FieldResponse
		for _, field := range fields {
			resp := FieldResponse{
				ID:        field.ID,
				Name:      field.Name,
				Label:     field.Label,
				Type:      field.Type,
				Required:  field.Required,
				SortOrder: field.SortOrder,
			}
			if field.Placeholder.Valid {
				resp.Placeholder = field.Placeholder.String
			}
			if field.DefaultValue.Valid {
				resp.DefaultValue = field.DefaultValue.String
			}
			response = append(response, resp)
		}

		if response == nil {
			response = []FieldResponse{}
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)

	case http.MethodPost:
		type CreateFieldRequest struct {
			Name         string `json:"name"`
			Label        string `json:"label"`
			Type         string `json:"type"`
			Required     bool   `json:"required"`
			Placeholder  string `json:"placeholder"`
			DefaultValue string `json:"defaultValue"`
			SortOrder    int    `json:"sortOrder"`
		}

		var req CreateFieldRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			s.sendJSONError(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		if req.Name == "" || req.Label == "" || req.Type == "" {
			s.sendJSONError(w, "Name, label, and type are required", http.StatusBadRequest)
			return
		}

		field, err := s.db.CreateCollectionField(collectionID, req.Name, req.Label, req.Type, req.Required, req.Placeholder, req.DefaultValue, req.SortOrder)
		if err != nil {
			log.Printf("Error creating collection field: %v", err)
			s.sendJSONError(w, "Failed to create field", http.StatusInternalServerError)
			return
		}

		response := map[string]interface{}{
			"id":           field.ID,
			"name":         field.Name,
			"label":        field.Label,
			"type":         field.Type,
			"required":     field.Required,
			"placeholder":  "",
			"defaultValue": "",
			"sortOrder":    field.SortOrder,
		}
		if field.Placeholder.Valid {
			response["placeholder"] = field.Placeholder.String
		}
		if field.DefaultValue.Valid {
			response["defaultValue"] = field.DefaultValue.String
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(response)

	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// Helper functions
func (s *Server) validateJWTToken(r *http.Request) (string, error) {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return "", fmt.Errorf("missing authorization header")
	}

	bearerToken := strings.Split(authHeader, " ")
	if len(bearerToken) != 2 || bearerToken[0] != "Bearer" {
		return "", fmt.Errorf("invalid authorization header format")
	}

	token, err := jwt.Parse(bearerToken[1], func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return s.jwtSecret, nil
	})

	if err != nil {
		return "", err
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		if username, exists := claims["username"].(string); exists {
			return username, nil
		}
	}

	return "", fmt.Errorf("invalid token claims")
}

// ItemResponse represents an item for JSON API responses
type ItemResponse struct {
	ID           int                    `json:"id"`
	CollectionID int                    `json:"collectionId"`
	Slug         string                 `json:"slug,omitempty"`
	Data         map[string]interface{} `json:"data"`
	Status       string                 `json:"status"`
	CreatedBy    *int                   `json:"createdBy,omitempty"`
	CreatedAt    string                 `json:"createdAt"`
	UpdatedAt    string                 `json:"updatedAt"`
}

// convertItemToResponse converts a database Item to an API response
func convertItemToResponse(item *Item) ItemResponse {
	response := ItemResponse{
		ID:           item.ID,
		CollectionID: item.CollectionID,
		Status:       item.Status,
		CreatedAt:    item.CreatedAt.Format(time.RFC3339),
		UpdatedAt:    item.UpdatedAt.Format(time.RFC3339),
	}

	// Parse JSON data into object
	var dataObj map[string]interface{}
	if err := json.Unmarshal([]byte(item.Data), &dataObj); err != nil {
		log.Printf("Warning: Failed to parse item data as JSON for item %d: %v", item.ID, err)
		// Fallback to empty object if JSON is invalid
		dataObj = make(map[string]interface{})
	}
	response.Data = dataObj

	if item.Slug.Valid {
		response.Slug = item.Slug.String
	}

	if item.CreatedBy.Valid {
		createdBy := int(item.CreatedBy.Int64)
		response.CreatedBy = &createdBy
	}

	return response
}

func (s *Server) handleAdminItems(w http.ResponseWriter, r *http.Request) {
	// Validate JWT token
	username, err := s.validateJWTToken(r)
	if err != nil {
		s.sendJSONError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	user, err := s.db.GetUserByUsername(username)
	if err != nil || user == nil {
		s.sendJSONError(w, "User not found", http.StatusNotFound)
		return
	}

	// Parse URL: /admin-api/items/collection/{collectionId} or /admin-api/items/{itemId}
	path := strings.TrimPrefix(r.URL.Path, "/admin-api/items/")
	parts := strings.Split(path, "/")

	if len(parts) >= 2 && parts[0] == "collection" {
		// Collection items endpoints: /admin-api/items/collection/{collectionId}
		collectionID, err := strconv.Atoi(parts[1])
		if err != nil {
			s.sendJSONError(w, "Invalid collection ID", http.StatusBadRequest)
			return
		}

		switch r.Method {
		case http.MethodGet:
			// Get all items for a collection
			items, err := s.db.GetItemsByCollection(collectionID)
			if err != nil {
				log.Printf("Error getting items for collection %d: %v", collectionID, err)
				s.sendJSONError(w, "Failed to get items", http.StatusInternalServerError)
				return
			}

			// Convert to response format
			var responseItems []ItemResponse
			for _, item := range items {
				responseItems = append(responseItems, convertItemToResponse(&item))
			}

			// Ensure we return an empty array instead of null
			if responseItems == nil {
				responseItems = []ItemResponse{}
			}

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(responseItems)

		case http.MethodPost:
			// Create new item
			var request struct {
				Slug   string                 `json:"slug"`
				Data   map[string]interface{} `json:"data"`
				Status string                 `json:"status"`
			}

			if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
				s.sendJSONError(w, "Invalid JSON", http.StatusBadRequest)
				return
			}

			// Convert data to JSON string
			dataJSON, err := json.Marshal(request.Data)
			if err != nil {
				s.sendJSONError(w, "Failed to encode data", http.StatusInternalServerError)
				return
			}

			// Set default status if not provided
			if request.Status == "" {
				request.Status = "draft"
			}

			item, err := s.db.CreateItem(collectionID, request.Slug, string(dataJSON), request.Status, user.ID)
			if err != nil {
				log.Printf("Error creating item: %v", err)
				s.sendJSONError(w, "Failed to create item", http.StatusInternalServerError)
				return
			}

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(convertItemToResponse(item))

		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}

	} else if len(parts) == 1 && parts[0] != "" {
		// Individual item endpoints: /admin-api/items/{itemId}
		itemID, err := strconv.Atoi(parts[0])
		if err != nil {
			s.sendJSONError(w, "Invalid item ID", http.StatusBadRequest)
			return
		}

		switch r.Method {
		case http.MethodGet:
			// Get specific item
			item, err := s.db.GetItem(itemID)
			if err != nil {
				log.Printf("Error getting item %d: %v", itemID, err)
				s.sendJSONError(w, "Failed to get item", http.StatusInternalServerError)
				return
			}

			if item == nil {
				s.sendJSONError(w, "Item not found", http.StatusNotFound)
				return
			}

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(convertItemToResponse(item))

		case http.MethodPut:
			// Update item
			var request struct {
				Slug   string                 `json:"slug"`
				Data   map[string]interface{} `json:"data"`
				Status string                 `json:"status"`
			}

			if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
				s.sendJSONError(w, "Invalid JSON", http.StatusBadRequest)
				return
			}

			// Convert data to JSON string
			dataJSON, err := json.Marshal(request.Data)
			if err != nil {
				s.sendJSONError(w, "Failed to encode data", http.StatusInternalServerError)
				return
			}

			err = s.db.UpdateItem(itemID, request.Slug, string(dataJSON), request.Status)
			if err != nil {
				log.Printf("Error updating item %d: %v", itemID, err)
				s.sendJSONError(w, "Failed to update item", http.StatusInternalServerError)
				return
			}

			// Return updated item
			item, err := s.db.GetItem(itemID)
			if err != nil {
				log.Printf("Error getting updated item %d: %v", itemID, err)
				s.sendJSONError(w, "Failed to get updated item", http.StatusInternalServerError)
				return
			}

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(convertItemToResponse(item))

		case http.MethodDelete:
			// Delete item
			err := s.db.DeleteItem(itemID)
			if err != nil {
				log.Printf("Error deleting item %d: %v", itemID, err)
				s.sendJSONError(w, "Failed to delete item", http.StatusInternalServerError)
				return
			}

			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(map[string]string{"message": "Item deleted successfully"})

		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}

	} else {
		s.sendJSONError(w, "Invalid items endpoint", http.StatusBadRequest)
	}
}

func (s *Server) handleAdminAPIKeys(w http.ResponseWriter, r *http.Request) {
	// Validate JWT token for all API key operations
	username, err := s.validateJWTToken(r)
	if err != nil {
		s.sendJSONError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	user, err := s.db.GetUserByUsername(username)
	if err != nil || user == nil {
		s.sendJSONError(w, "User not found", http.StatusNotFound)
		return
	}

	switch r.Method {
	case http.MethodGet:
		log.Printf("Getting API keys...")
		keys, err := s.db.GetAPIKeys()
		if err != nil {
			log.Printf("Error getting API keys: %v", err)
			s.sendJSONError(w, "Failed to fetch API keys", http.StatusInternalServerError)
			return
		}

		log.Printf("Retrieved %d API keys from database", len(keys))

		// Convert to response format (hide sensitive data)
		type APIKeyResponse struct {
			ID         int    `json:"id"`
			Name       string `json:"name"`
			KeyPrefix  string `json:"keyPrefix"`
			CreatedAt  string `json:"createdAt"`
			LastUsedAt string `json:"lastUsedAt,omitempty"`
			IsActive   bool   `json:"isActive"`
		}

		var response []APIKeyResponse
		for _, key := range keys {
			resp := APIKeyResponse{
				ID:        key.ID,
				Name:      key.Name,
				KeyPrefix: key.KeyPrefix,
				CreatedAt: key.CreatedAt.Format("2006-01-02 15:04:05"),
				IsActive:  key.IsActive,
			}
			if key.LastUsedAt.Valid {
				resp.LastUsedAt = key.LastUsedAt.Time.Format("2006-01-02 15:04:05")
			}
			response = append(response, resp)
		}

		// Ensure we return an empty array instead of null
		if response == nil {
			response = []APIKeyResponse{}
		}

		log.Printf("Sending response with %d API keys", len(response))
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)

	case http.MethodPost:
		type CreateKeyRequest struct {
			Name string `json:"name"`
		}

		var req CreateKeyRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			s.sendJSONError(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		if req.Name == "" {
			s.sendJSONError(w, "Name is required", http.StatusBadRequest)
			return
		}

		fullKey, err := s.db.CreateAPIKey(req.Name, user.ID)
		if err != nil {
			s.sendJSONError(w, "Failed to create API key", http.StatusInternalServerError)
			return
		}

		response := map[string]string{
			"key":     fullKey,
			"message": "API key created successfully. Store this key securely - it won't be shown again.",
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(response)

	case http.MethodDelete:
		// Extract ID from query parameter
		idStr := r.URL.Query().Get("id")
		if idStr == "" {
			s.sendJSONError(w, "ID parameter is required", http.StatusBadRequest)
			return
		}

		var id int
		if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
			s.sendJSONError(w, "Invalid ID parameter", http.StatusBadRequest)
			return
		}

		if err := s.db.DeleteAPIKey(id); err != nil {
			s.sendJSONError(w, "Failed to delete API key", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"message": "API key deleted successfully"})

	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func (s *Server) handleAPICollections(w http.ResponseWriter, r *http.Request) {
	// Validate API key for all public API requests
	_, err := s.validateAPIKey(r)
	if err != nil {
		s.sendJSONError(w, "Invalid or missing API key", http.StatusUnauthorized)
		return
	}

	// Parse the URL path to extract collection name and optional item ID
	path := strings.TrimPrefix(r.URL.Path, "/api/collections/")
	parts := strings.Split(path, "/")

	if len(parts) == 0 || parts[0] == "" {
		s.sendJSONError(w, "Collection name is required", http.StatusBadRequest)
		return
	}

	collectionName := parts[0]

	// Handle different endpoint patterns
	if len(parts) == 1 {
		// GET /api/collections/[name] - return all items from collection
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		log.Printf("API: Getting all items from collection '%s'", collectionName)

		// Get collection by slug
		collection, err := s.db.GetCollectionBySlug(collectionName)
		if err != nil {
			log.Printf("Error getting collection by slug '%s': %v", collectionName, err)
			s.sendJSONError(w, "Failed to get collection", http.StatusInternalServerError)
			return
		}

		if collection == nil {
			s.sendJSONError(w, "Collection not found", http.StatusNotFound)
			return
		}

		// Parse pagination query parameters
		query := r.URL.Query()
		limit := 50 // Default limit
		offset := 0 // Default offset

		if limitStr := query.Get("limit"); limitStr != "" {
			if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 {
				// Cap limit at 100 to prevent abuse
				if parsedLimit > 100 {
					parsedLimit = 100
				}
				limit = parsedLimit
			}
		}

		if offsetStr := query.Get("offset"); offsetStr != "" {
			if parsedOffset, err := strconv.Atoi(offsetStr); err == nil && parsedOffset >= 0 {
				offset = parsedOffset
			}
		}

		// Get items for this collection with pagination
		items, err := s.db.GetItemsByCollectionWithPagination(collection.ID, limit, offset)
		if err != nil {
			log.Printf("Error getting items for collection '%s': %v", collectionName, err)
			s.sendJSONError(w, "Failed to get items", http.StatusInternalServerError)
			return
		}

		// Convert to response format and filter for published items only
		var responseItems []ItemResponse
		for _, item := range items {
			if item.Status == "published" || item.Status == "draft" { // For now, include both - can be made configurable
				responseItems = append(responseItems, convertItemToResponse(&item))
			}
		}

		// Ensure we return an empty array instead of null
		if responseItems == nil {
			responseItems = []ItemResponse{}
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(responseItems)

	} else if len(parts) == 2 {
		// GET /api/collections/[name]/[id] - return specific item
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		itemIDStr := parts[1]
		log.Printf("API: Getting item '%s' from collection '%s'", itemIDStr, collectionName)

		// Parse item ID
		itemID, err := strconv.Atoi(itemIDStr)
		if err != nil {
			s.sendJSONError(w, "Invalid item ID", http.StatusBadRequest)
			return
		}

		// Get collection by slug to verify it exists
		collection, err := s.db.GetCollectionBySlug(collectionName)
		if err != nil {
			log.Printf("Error getting collection by slug '%s': %v", collectionName, err)
			s.sendJSONError(w, "Failed to get collection", http.StatusInternalServerError)
			return
		}

		if collection == nil {
			s.sendJSONError(w, "Collection not found", http.StatusNotFound)
			return
		}

		// Get the specific item
		item, err := s.db.GetItem(itemID)
		if err != nil {
			log.Printf("Error getting item %d: %v", itemID, err)
			s.sendJSONError(w, "Failed to get item", http.StatusInternalServerError)
			return
		}

		if item == nil {
			s.sendJSONError(w, "Item not found", http.StatusNotFound)
			return
		}

		// Verify the item belongs to the requested collection
		if item.CollectionID != collection.ID {
			s.sendJSONError(w, "Item not found in this collection", http.StatusNotFound)
			return
		}

		// Check if item is published (for public API)
		if item.Status != "published" && item.Status != "draft" { // For now, include both - can be made configurable
			s.sendJSONError(w, "Item not available", http.StatusNotFound)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(convertItemToResponse(item))

	} else {
		s.sendJSONError(w, "Invalid API endpoint", http.StatusBadRequest)
	}
}

// Validate API key from X-API-Key header
func (s *Server) validateAPIKey(r *http.Request) (*APIKey, error) {
	apiKey := r.Header.Get("X-API-Key")
	if apiKey == "" {
		return nil, fmt.Errorf("missing X-API-Key header")
	}

	// Validate the API key against the database
	key, err := s.db.ValidateAPIKey(apiKey)
	if err != nil {
		return nil, fmt.Errorf("failed to validate API key: %w", err)
	}

	if key == nil {
		return nil, fmt.Errorf("invalid API key")
	}

	return key, nil
}

func (s *Server) sendJSONError(w http.ResponseWriter, message string, statusCode int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}

func startEsbuildWatch() error {
	if _, err := os.Stat("node_modules"); os.IsNotExist(err) {
		log.Println("Installing npm dependencies...")
		cmd := exec.Command("npm", "install")
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
		if err := cmd.Run(); err != nil {
			return fmt.Errorf("npm install failed: %w", err)
		}
	}

	cmd := exec.Command("npm", "run", "dev")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("failed to start esbuild watch: %w", err)
	}

	log.Println("Started esbuild in watch mode")
	return nil
}

// CSV Export handler
func (s *Server) handleAdminExportCSV(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Validate JWT token
	username, err := s.validateJWTToken(r)
	if err != nil {
		s.sendJSONError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	user, err := s.db.GetUserByUsername(username)
	if err != nil || user == nil {
		s.sendJSONError(w, "User not found", http.StatusNotFound)
		return
	}

	// Parse URL: /admin-api/export/{collectionId}
	path := strings.TrimPrefix(r.URL.Path, "/admin-api/export/")
	collectionID, err := strconv.Atoi(path)
	if err != nil {
		s.sendJSONError(w, "Invalid collection ID", http.StatusBadRequest)
		return
	}

	// Get collection and validate it exists
	collection, err := s.db.GetCollectionByID(collectionID)
	if err != nil {
		s.sendJSONError(w, "Failed to get collection", http.StatusInternalServerError)
		return
	}
	if collection == nil {
		s.sendJSONError(w, "Collection not found", http.StatusNotFound)
		return
	}

	// Get collection fields
	fields, err := s.db.GetCollectionFields(collectionID)
	if err != nil {
		s.sendJSONError(w, "Failed to get collection fields", http.StatusInternalServerError)
		return
	}

	// Get items for the collection
	statusFilter := r.URL.Query().Get("status")
	items, err := s.db.GetItemsByCollection(collectionID)
	if err != nil {
		s.sendJSONError(w, "Failed to get items", http.StatusInternalServerError)
		return
	}

	// Set CSV headers
	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s-export.csv\"", collection.Slug))

	// Create CSV writer
	csvWriter := csv.NewWriter(w)
	defer csvWriter.Flush()

	// Build header row
	headers := []string{"_id", "_slug", "_status", "_created_at", "_updated_at"}
	for _, field := range fields {
		headers = append(headers, field.Name)
	}

	if err := csvWriter.Write(headers); err != nil {
		log.Printf("Error writing CSV headers: %v", err)
		return
	}

	// Write data rows
	for _, item := range items {
		// Apply status filter if specified
		if statusFilter != "" && item.Status != statusFilter {
			continue
		}

		row := []string{
			strconv.Itoa(item.ID),
			item.Slug.String,
			item.Status,
			item.CreatedAt.Format(time.RFC3339),
			item.UpdatedAt.Format(time.RFC3339),
		}

		// Parse JSON data
		var data map[string]interface{}
		if err := json.Unmarshal([]byte(item.Data), &data); err != nil {
			log.Printf("Error parsing item data for ID %d: %v", item.ID, err)
			// Add empty values for fields if we can't parse data
			for range fields {
				row = append(row, "")
			}
		} else {
			// Add field values in the same order as headers
			for _, field := range fields {
				value := ""
				if fieldValue, exists := data[field.Name]; exists && fieldValue != nil {
					// Convert value to string based on type
					switch field.Type {
					case "boolean":
						if boolVal, ok := fieldValue.(bool); ok {
							value = strconv.FormatBool(boolVal)
						}
					case "number":
						switch v := fieldValue.(type) {
						case float64:
							value = strconv.FormatFloat(v, 'f', -1, 64)
						case int:
							value = strconv.Itoa(v)
						}
					case "date":
						if dateStr, ok := fieldValue.(string); ok {
							value = dateStr
						}
					default:
						// For text, markdown, email, url, textarea - treat as string
						if strVal, ok := fieldValue.(string); ok {
							value = strVal
						}
					}
				}
				row = append(row, value)
			}
		}

		if err := csvWriter.Write(row); err != nil {
			log.Printf("Error writing CSV row: %v", err)
			return
		}
	}
}

// CSV Import handler
func (s *Server) handleAdminImportCSV(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Validate JWT token
	username, err := s.validateJWTToken(r)
	if err != nil {
		s.sendJSONError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	user, err := s.db.GetUserByUsername(username)
	if err != nil || user == nil {
		s.sendJSONError(w, "User not found", http.StatusNotFound)
		return
	}

	// Parse URL: /admin-api/import/{collectionId}
	path := strings.TrimPrefix(r.URL.Path, "/admin-api/import/")
	collectionID, err := strconv.Atoi(path)
	if err != nil {
		s.sendJSONError(w, "Invalid collection ID", http.StatusBadRequest)
		return
	}

	// Get collection and validate it exists
	collection, err := s.db.GetCollectionByID(collectionID)
	if err != nil {
		s.sendJSONError(w, "Failed to get collection", http.StatusInternalServerError)
		return
	}
	if collection == nil {
		s.sendJSONError(w, "Collection not found", http.StatusNotFound)
		return
	}

	// Get collection fields
	fields, err := s.db.GetCollectionFields(collectionID)
	if err != nil {
		s.sendJSONError(w, "Failed to get collection fields", http.StatusInternalServerError)
		return
	}

	// Parse multipart form
	err = r.ParseMultipartForm(10 << 20) // 10 MB max
	if err != nil {
		s.sendJSONError(w, "Failed to parse form data", http.StatusBadRequest)
		return
	}

	// Get the file from form data
	file, _, err := r.FormFile("file")
	if err != nil {
		s.sendJSONError(w, "Failed to get file from form", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Get import mode (create_only or upsert)
	importMode := r.FormValue("mode")
	if importMode == "" {
		importMode = "create_only"
	}

	// Parse CSV
	csvReader := csv.NewReader(file)
	csvReader.FieldsPerRecord = -1 // Allow variable number of fields

	// Read headers
	headers, err := csvReader.Read()
	if err != nil {
		s.sendJSONError(w, "Failed to read CSV headers", http.StatusBadRequest)
		return
	}

	// Create field map for quick lookup
	fieldMap := make(map[string]*CollectionField)
	for i := range fields {
		fieldMap[fields[i].Name] = &fields[i]
	}

	// Process CSV rows
	var successCount, errorCount, skippedCount int
	var errors []string
	rowNumber := 1

	for {
		rowNumber++
		record, err := csvReader.Read()
		if err != nil {
			if err.Error() == "EOF" {
				break
			}
			errors = append(errors, fmt.Sprintf("Row %d: Failed to read - %v", rowNumber, err))
			errorCount++
			continue
		}

		// Create data map for item
		itemData := make(map[string]interface{})
		var itemID int
		var itemSlug, itemStatus string

		// Process each column
		for i, header := range headers {
			if i >= len(record) {
				break
			}
			value := record[i]

			// Handle special columns
			if header == "_id" {
				if value != "" {
					itemID, _ = strconv.Atoi(value)
				}
			} else if header == "_slug" {
				itemSlug = value
			} else if header == "_status" {
				itemStatus = value
				if itemStatus == "" {
					itemStatus = "draft"
				}
			} else if strings.HasPrefix(header, "_") {
				// Skip other meta columns
				continue
			} else {
				// Handle field data
				if field, exists := fieldMap[header]; exists {
					// Convert value based on field type
					var convertedValue interface{}

					if value == "" && !field.Required {
						// Skip empty non-required fields
						continue
					}

					switch field.Type {
					case "boolean":
						convertedValue = value == "true" || value == "1" || value == "yes" || value == "on"
					case "number":
						if value != "" {
							if floatVal, err := strconv.ParseFloat(value, 64); err == nil {
								convertedValue = floatVal
							} else {
								errors = append(errors, fmt.Sprintf("Row %d: Invalid number for field '%s'", rowNumber, header))
								continue
							}
						}
					case "date":
						// Keep as string, frontend handles date parsing
						convertedValue = value
					default:
						// text, textarea, markdown, email, url - all strings
						convertedValue = value
					}

					// Validate required fields
					if field.Required && value == "" {
						errors = append(errors, fmt.Sprintf("Row %d: Required field '%s' is empty", rowNumber, header))
						errorCount++
						continue
					}

					itemData[header] = convertedValue
				}
			}
		}

		// Check if we should skip or update existing items
		if importMode == "create_only" && itemID > 0 {
			// Check if item exists
			existingItem, _ := s.db.GetItem(itemID)
			if existingItem != nil {
				skippedCount++
				continue
			}
		}

		// Convert data to JSON
		dataJSON, err := json.Marshal(itemData)
		if err != nil {
			errors = append(errors, fmt.Sprintf("Row %d: Failed to encode data", rowNumber))
			errorCount++
			continue
		}

		// Create or update item
		if importMode == "upsert" && itemID > 0 {
			// Update existing item
			err = s.db.UpdateItem(itemID, itemSlug, string(dataJSON), itemStatus)
			if err != nil {
				errors = append(errors, fmt.Sprintf("Row %d: Failed to update item - %v", rowNumber, err))
				errorCount++
			} else {
				successCount++
			}
		} else {
			// Create new item
			_, err = s.db.CreateItem(collectionID, itemSlug, string(dataJSON), itemStatus, user.ID)
			if err != nil {
				errors = append(errors, fmt.Sprintf("Row %d: Failed to create item - %v", rowNumber, err))
				errorCount++
			} else {
				successCount++
			}
		}
	}

	// Return import results
	response := map[string]interface{}{
		"success":       successCount,
		"errors":        errorCount,
		"skipped":       skippedCount,
		"totalRows":     rowNumber - 1,
		"errorMessages": errors,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

