#!/bin/sh
# Fix ownership on the Fly.io mounted volume before the app starts.
# The volume is initialised as root:root; the app runs as liftiq.
chown -R liftiq:liftiq /data
exec su-exec liftiq node src/server.js
