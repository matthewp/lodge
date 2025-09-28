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

# Create the package
pkg create -M pkg-manifest.ucl -p freebsd-package/pkg-plist -r $STAGEDIR -o .

# Create repository metadata
mkdir -p repo
mv lodge-*.pkg repo/
pkg repo repo/

echo "Package created: lodge-$VERSION.pkg"
echo "Repository metadata created in repo/"