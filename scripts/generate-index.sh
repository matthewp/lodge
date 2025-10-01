#!/bin/bash

# Generate index.html for package repository
# Usage: ./generate-index.sh <output-dir>

OUTPUT_DIR=${1:-gh-pages}

cat > "$OUTPUT_DIR/index.html" <<'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Lodge CMS Package Repository</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1 { color: #333; }
        h2 { color: #555; margin-top: 30px; }
        pre { background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto; }
        code { background: #f5f5f5; padding: 2px 5px; border-radius: 3px; }
    </style>
</head>
<body>
    <h1>Lodge CMS Package Repository</h1>
    <p>Official package repository for Lodge CMS, a simple headless CMS.</p>

    <h2>Debian/Ubuntu Installation</h2>
    <pre><code># Add the repository
echo "deb https://matthewp.github.io/lodge/debian/ stable main" | sudo tee /etc/apt/sources.list.d/lodge.list

# Update and install
sudo apt update
sudo apt install lodge</code></pre>

    <h2>FreeBSD Installation</h2>
    <pre><code># Add the repository
sudo mkdir -p /usr/local/etc/pkg/repos
cat > /usr/local/etc/pkg/repos/lodge.conf <<LODGE
lodge: {
  url: "https://matthewp.github.io/lodge/freebsd/",
  enabled: yes
}
LODGE

# Update and install
sudo pkg update
sudo pkg install lodge</code></pre>

    <h2>Manual Downloads</h2>
    <p>You can also download packages directly from the <a href="https://github.com/matthewp/lodge/releases">GitHub Releases</a> page.</p>
</body>
</html>
EOF

echo "Generated index.html in $OUTPUT_DIR/"