#!/bin/sh

# Build Debian/APT repository structure for Lodge CMS
# This script creates a proper APT repository that can be hosted on GitHub Pages

set -e

# Get version from environment or git tag
VERSION=${VERSION:-$(git describe --tags --abbrev=0 2>/dev/null | sed 's/^v//' || echo "0.0.1")}

echo "Building Debian repository for Lodge ${VERSION}..."

# Clean up any existing repo structure
rm -rf debian-repo
mkdir -p debian-repo/pool/main/l/lodge
mkdir -p debian-repo/dists/stable/main/binary-amd64

# Copy the .deb file to pool
cp lodge_${VERSION}_amd64.deb debian-repo/pool/main/l/lodge/

# Generate Packages file
cd debian-repo
dpkg-scanpackages pool/ > dists/stable/main/binary-amd64/Packages
gzip -c dists/stable/main/binary-amd64/Packages > dists/stable/main/binary-amd64/Packages.gz

# Create Release file for component
cat > dists/stable/main/binary-amd64/Release <<EOF
Archive: stable
Version: ${VERSION}
Component: main
Origin: Lodge CMS
Label: Lodge CMS
Architecture: amd64
EOF

# Create main Release file
cat > dists/stable/Release <<EOF
Origin: Lodge CMS
Label: Lodge CMS
Suite: stable
Version: ${VERSION}
Codename: stable
Date: $(date -R)
Architectures: amd64
Components: main
Description: Lodge CMS Debian Repository
EOF

# Add checksums to Release file
echo "MD5Sum:" >> dists/stable/Release
(cd dists/stable && \
  for file in main/binary-amd64/Packages*; do
    size=$(stat -c%s "$file")
    md5=$(md5sum "$file" | awk '{print $1}')
    echo " ${md5} ${size} ${file}" >> Release
  done
)

echo "SHA256:" >> dists/stable/Release
(cd dists/stable && \
  for file in main/binary-amd64/Packages*; do
    size=$(stat -c%s "$file")
    sha256=$(sha256sum "$file" | awk '{print $1}')
    echo " ${sha256} ${size} ${file}" >> Release
  done
)

cd ..

echo "Debian repository structure created in debian-repo/"
echo ""
echo "Users can add this repository with:"
echo "  echo 'deb https://matthewp.github.io/lodge/debian/ stable main' | sudo tee /etc/apt/sources.list.d/lodge.list"
echo "  sudo apt update"
echo "  sudo apt install lodge"