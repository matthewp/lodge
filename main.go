package main

import (
	"fmt"
	"log"
	"os"
	"path/filepath"

	flag "github.com/spf13/pflag"
)

// Version information set at build time
var version = "dev"

func main() {
	var adminUser string
	var adminPassword string
	var dataDir string
	var showVersion bool

	flag.StringVarP(&adminUser, "admin-user", "u", "", "Admin username for initial setup")
	flag.StringVarP(&adminPassword, "admin-password", "p", "", "Admin password for initial setup")
	flag.StringVarP(&dataDir, "data-dir", "d", ".", "Directory where database will be stored")
	flag.BoolVarP(&showVersion, "version", "v", false, "Show version information")

	// Custom usage function
	flag.Usage = func() {
		fmt.Println("Lodge CMS")
		fmt.Println()
		fmt.Println("Usage:")
		fmt.Println("  lodge --admin-user <username> --admin-password <password>")
		fmt.Println("  lodge -u <username> -p <password>")
		fmt.Println("  ADMIN_USER=<username> ADMIN_PASSWORD=<password> lodge")
		fmt.Println()
		fmt.Println("Flags:")
		flag.PrintDefaults()
		fmt.Println()
		fmt.Println("Environment Variables:")
		fmt.Println("  ADMIN_USER      Admin username (fallback for --admin-user)")
		fmt.Println("  ADMIN_PASSWORD  Admin password (fallback for --admin-password)")
	}

	flag.Parse()

	// Handle version flag
	if showVersion {
		fmt.Println(version)
		os.Exit(0)
	}

	// Check environment variables as fallback
	if adminUser == "" {
		adminUser = os.Getenv("ADMIN_USER")
	}
	if adminPassword == "" {
		adminPassword = os.Getenv("ADMIN_PASSWORD")
	}

	if adminUser == "" || adminPassword == "" {
		fmt.Println("Error: Admin user and password are required")
		fmt.Println()
		fmt.Println("Provide them via:")
		fmt.Println("  Command line: --admin-user <username> --admin-password <password>")
		fmt.Println("  Environment:  ADMIN_USER=<username> ADMIN_PASSWORD=<password>")
		fmt.Println()
		flag.Usage()
		os.Exit(1)
	}

	// Ensure data directory exists
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		log.Fatal("Failed to create data directory:", err)
	}

	// Initialize database
	dbPath := filepath.Join(dataDir, "lodge.db")
	db, err := NewDatabase(dbPath)
	if err != nil {
		log.Fatal("Failed to initialize database:", err)
	}
	defer db.Close()

	// Check if admin user exists and validate credentials
	existingUser, err := db.GetUserByUsername(adminUser)
	if err != nil {
		log.Fatal("Failed to check for existing user:", err)
	}

	if existingUser == nil {
		// Create admin user if it doesn't exist
		if err := db.CreateUser(adminUser, adminPassword, "", "admin"); err != nil {
			log.Fatal("Failed to create admin user:", err)
		}
		log.Printf("Created admin user: %s", adminUser)
	} else {
		// Verify the provided password matches the existing user
		if err := db.VerifyUserPassword(adminUser, adminPassword); err != nil {
			log.Fatalf("Admin user '%s' exists but password doesn't match. Please provide the correct password or use a different username.", adminUser)
		}
		log.Printf("Admin user '%s' authenticated successfully", adminUser)
	}

	// Start esbuild watch in development mode
	if isDevelopmentMode() {
		if err := startEsbuildWatch(); err != nil {
			log.Printf("Warning: Failed to start esbuild watch: %v", err)
		}
	}

	server := NewServer(adminUser, adminPassword, db)
	if err := server.Start(); err != nil {
		log.Fatal(err)
	}
}

func isDevelopmentMode() bool {
	// Check if ui/src directory exists (only present in development)
	if _, err := os.Stat("ui/src"); err == nil {
		return true
	}
	// Fallback: check if running with `go run`
	exe, err := os.Executable()
	if err != nil {
		return false
	}
	return filepath.Base(exe) == "main"
}