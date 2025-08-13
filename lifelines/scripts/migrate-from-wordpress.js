#!/usr/bin/env node

/**
 * WordPress Migration Script for LifeLines
 * 
 * This script helps migrate data from WordPress to the new Next.js application.
 * 
 * Usage:
 *   node scripts/migrate-from-wordpress.js [type] [file]
 * 
 * Types: users, lifelines, inquiries, all
 * File: JSON file exported from WordPress
 * 
 * Examples:
 *   node scripts/migrate-from-wordpress.js users wp-users.json
 *   node scripts/migrate-from-wordpress.js lifelines wp-lifelines.json
 *   node scripts/migrate-from-wordpress.js all wp-export.json
 */

const fs = require('fs')
const path = require('path')

// Configuration
const API_BASE_URL = process.env.APP_URL || 'http://localhost:3000'

async function makeRequest(endpoint, data) {
  const fetch = (await import('node-fetch')).default
  
  const response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // In a real implementation, you'd need to authenticate as admin
      // 'Authorization': `Bearer ${process.env.ADMIN_TOKEN}`
    },
    body: JSON.stringify(data)
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`API Error: ${response.status} - ${error}`)
  }

  return await response.json()
}

async function migrateUsers(filePath) {
  console.log('🔄 Migrating users from WordPress...')
  
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  const users = data.users || data
  
  console.log(`Found ${users.length} users to migrate`)
  
  const result = await makeRequest('/migration/wordpress/users', { users })
  
  console.log('✅ User migration completed:')
  console.log(`  Imported: ${result.data.imported}`)
  console.log(`  Skipped: ${result.data.skipped}`)
  console.log(`  Errors: ${result.data.errors}`)
  
  if (result.data.details.length > 0) {
    console.log('\nDetails:')
    result.data.details.forEach(detail => {
      const icon = detail.status === 'imported' ? '✅' : 
                   detail.status === 'skipped' ? '⏭️' : '❌'
      console.log(`  ${icon} ${detail.email}: ${detail.message}`)
    })
  }
}

async function migrateLifeLines(filePath) {
  console.log('🔄 Migrating LifeLines from WordPress...')
  
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  const lifelines = data.lifelines || data
  
  console.log(`Found ${lifelines.length} LifeLines to migrate`)
  
  const result = await makeRequest('/migration/wordpress/lifelines', { lifelines })
  
  console.log('✅ LifeLine migration completed:')
  console.log(`  Imported: ${result.data.imported}`)
  console.log(`  Skipped: ${result.data.skipped}`)
  console.log(`  Errors: ${result.data.errors}`)
  
  if (result.data.details.length > 0) {
    console.log('\nDetails:')
    result.data.details.forEach(detail => {
      const icon = detail.status === 'imported' ? '✅' : 
                   detail.status === 'skipped' ? '⏭️' : '❌'
      console.log(`  ${icon} ${detail.title}: ${detail.message}`)
    })
  }
}

async function migrateInquiries(filePath) {
  console.log('🔄 Migrating inquiries from WordPress...')
  
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  const inquiries = data.inquiries || data
  
  console.log(`Found ${inquiries.length} inquiries to migrate`)
  
  const result = await makeRequest('/migration/wordpress/inquiries', { inquiries })
  
  console.log('✅ Inquiry migration completed:')
  console.log(`  Imported: ${result.data.imported}`)
  console.log(`  Skipped: ${result.data.skipped}`)
  console.log(`  Errors: ${result.data.errors}`)
  
  if (result.data.details.length > 0) {
    console.log('\nDetails:')
    result.data.details.forEach(detail => {
      const icon = detail.status === 'imported' ? '✅' : 
                   detail.status === 'skipped' ? '⏭️' : '❌'
      console.log(`  ${icon} ${detail.name}: ${detail.message}`)
    })
  }
}

async function migrateAll(filePath) {
  console.log('🔄 Migrating all data from WordPress...')
  
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  
  // Migrate in order: users first, then lifelines, then inquiries
  if (data.users) {
    await migrateUsers(filePath)
    console.log('')
  }
  
  if (data.lifelines) {
    await migrateLifeLines(filePath)
    console.log('')
  }
  
  if (data.inquiries) {
    await migrateInquiries(filePath)
  }
  
  console.log('🎉 All migrations completed!')
}

function showUsage() {
  console.log(`
WordPress Migration Script for LifeLines

Usage:
  node scripts/migrate-from-wordpress.js [type] [file]

Types:
  users      - Migrate WordPress users
  lifelines  - Migrate LifeLine posts
  inquiries  - Migrate inquiries/contact forms
  all        - Migrate everything from a combined export

Examples:
  node scripts/migrate-from-wordpress.js users wp-users.json
  node scripts/migrate-from-wordpress.js lifelines wp-lifelines.json
  node scripts/migrate-from-wordpress.js all wp-export.json

Environment Variables:
  APP_URL - Base URL of the application (default: http://localhost:3000)

Note: Make sure your Next.js application is running and you have admin access.
  `)
}

// Main function
async function main() {
  const args = process.argv.slice(2)
  
  if (args.length !== 2) {
    showUsage()
    process.exit(1)
  }
  
  const [type, filePath] = args
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`)
    process.exit(1)
  }
  
  try {
    switch (type) {
      case 'users':
        await migrateUsers(filePath)
        break
      case 'lifelines':
        await migrateLifeLines(filePath)
        break
      case 'inquiries':
        await migrateInquiries(filePath)
        break
      case 'all':
        await migrateAll(filePath)
        break
      default:
        console.error(`❌ Unknown migration type: ${type}`)
        showUsage()
        process.exit(1)
    }
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}