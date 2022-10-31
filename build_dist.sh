#!/bin/sh
set -x
echo 'build dist ... ' $@
rm -Rf dist_$@-$npm_package_version.zip
cd dist
zip -r ../dist_$@-$npm_package_version.zip *