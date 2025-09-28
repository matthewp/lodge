#!/bin/sh

set -e

# Get version from environment or default
VERSION=${VERSION:-"0.0.0"}

echo "Building FreeBSD package for version $VERSION"

# Create staging directory
STAGEDIR=$(pwd)/stage
rm -rf $STAGEDIR
mkdir -p $STAGEDIR/usr/local/bin

# Copy binary to staging
cp lodge-freebsd-amd64 $STAGEDIR/usr/local/bin/lodge
chmod +x $STAGEDIR/usr/local/bin/lodge

# Create manifest with version
sed "s/%%VERSION%%/$VERSION/g" freebsd-package/pkg-manifest.ucl > pkg-manifest.ucl

# Create repository structure first
rm -rf repo
mkdir -p repo/All

# Create the package directly in the All directory
pkg create -M pkg-manifest.ucl -p freebsd-package/pkg-plist -r $STAGEDIR -o repo/All/

# Create repository metadata from the parent directory
cd repo
pkg repo .
cd ..

echo "Package created: lodge-$VERSION.pkg"
echo "Repository metadata created in repo/"