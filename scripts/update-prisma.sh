#!/bin/bash

# This script updates the Prisma client after schema changes
echo "🔄 Generating Prisma client with new schema..."
npx prisma generate

echo "✅ Prisma client generated successfully!"
echo "🔄 To apply database changes, run:"
echo "npx prisma db push"
echo "or"
echo "npx prisma migrate deploy"
