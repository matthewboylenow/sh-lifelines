# WordPress to Next.js Migration Guide

This guide explains how to migrate data from your WordPress LifeLines site to the new Next.js application.

## Overview

The migration process involves three main steps:
1. **Export data** from WordPress database
2. **Validate and prepare** the exported data
3. **Import data** into the new Next.js application

## Prerequisites

- Admin access to the new LifeLines application
- Access to the WordPress database (for data export)
- Node.js installed (for running migration scripts)

## Step 1: Export Data from WordPress

### Option A: Using SQL Queries (Recommended)

Connect to your WordPress MySQL database and run these queries to export data:

#### Export Users
```sql
SELECT 
  u.user_login,
  u.user_email,
  u.display_name,
  u.user_registered,
  GROUP_CONCAT(DISTINCT r.meta_value) as roles,
  GROUP_CONCAT(DISTINCT CONCAT(m.meta_key, ':', m.meta_value) SEPARATOR '|') as meta
FROM wp_users u
LEFT JOIN wp_usermeta r ON u.ID = r.user_id AND r.meta_key = 'wp_capabilities'
LEFT JOIN wp_usermeta m ON u.ID = m.user_id AND m.meta_key NOT IN ('wp_capabilities', 'wp_user_level')
WHERE u.user_status = 0
GROUP BY u.ID
ORDER BY u.user_registered DESC;
```

Save results as JSON in this format:
```json
{
  "users": [
    {
      "user_login": "john.doe",
      "user_email": "john.doe@example.com",
      "display_name": "John Doe",
      "user_registered": "2023-01-01 00:00:00",
      "roles": ["lifeline_leader"],
      "meta": {
        "phone": "555-123-4567",
        "bio": "Experienced group leader"
      }
    }
  ]
}
```

#### Export LifeLines
```sql
SELECT 
  p.ID,
  p.post_title,
  p.post_content,
  p.post_status,
  p.post_date,
  GROUP_CONCAT(DISTINCT CONCAT(pm.meta_key, ':', pm.meta_value) SEPARATOR '|') as meta,
  leader.meta_value as leader_email,
  groupleader.meta_value as group_leader
FROM wp_posts p
LEFT JOIN wp_postmeta pm ON p.ID = pm.post_id
LEFT JOIN wp_postmeta leader ON p.ID = leader.post_id AND leader.meta_key = 'leader_email'
LEFT JOIN wp_postmeta groupleader ON p.ID = groupleader.post_id AND groupleader.meta_key = 'group_leader'
WHERE p.post_type = 'lifeline'
AND p.post_status IN ('publish', 'draft', 'private')
GROUP BY p.ID
ORDER BY p.post_date DESC;
```

#### Export Inquiries
```sql
SELECT 
  i.ID,
  i.person_name,
  i.person_email,
  i.person_phone,
  i.message,
  i.lifeline_id,
  l.post_title as lifeline_title,
  i.status,
  i.date_created,
  GROUP_CONCAT(DISTINCT CONCAT(im.meta_key, ':', im.meta_value) SEPARATOR '|') as meta
FROM wp_lifeline_inquiries i
LEFT JOIN wp_posts l ON i.lifeline_id = l.ID
LEFT JOIN wp_lifeline_inquiry_meta im ON i.ID = im.inquiry_id
GROUP BY i.ID
ORDER BY i.date_created DESC;
```

### Option B: WordPress Plugin

Create a simple WordPress plugin to export data as JSON:

```php
<?php
/*
Plugin Name: LifeLines Data Exporter
Description: Export LifeLines data for migration to Next.js
Version: 1.0
*/

add_action('admin_menu', function() {
    add_management_page(
        'LifeLines Export',
        'LifeLines Export', 
        'manage_options',
        'lifelines-export',
        'lifelines_export_page'
    );
});

function lifelines_export_page() {
    if (isset($_GET['export'])) {
        $type = $_GET['export'];
        $data = [];
        
        switch ($type) {
            case 'users':
                $data = export_users();
                break;
            case 'lifelines':
                $data = export_lifelines();
                break;
            case 'inquiries':
                $data = export_inquiries();
                break;
        }
        
        header('Content-Type: application/json');
        header('Content-Disposition: attachment; filename="lifelines-' . $type . '.json"');
        echo json_encode($data, JSON_PRETTY_PRINT);
        exit;
    }
    
    // Show export interface
    echo '<h1>LifeLines Data Export</h1>';
    echo '<p><a href="?page=lifelines-export&export=users" class="button">Export Users</a></p>';
    echo '<p><a href="?page=lifelines-export&export=lifelines" class="button">Export LifeLines</a></p>';
    echo '<p><a href="?page=lifelines-export&export=inquiries" class="button">Export Inquiries</a></p>';
}
```

## Step 2: Validate Data

Before importing, validate your exported data:

```bash
# Check if the JSON files are valid
node -e "JSON.parse(require('fs').readFileSync('wp-users.json', 'utf8')); console.log('Users JSON is valid')"
node -e "JSON.parse(require('fs').readFileSync('wp-lifelines.json', 'utf8')); console.log('LifeLines JSON is valid')"
node -e "JSON.parse(require('fs').readFileSync('wp-inquiries.json', 'utf8')); console.log('Inquiries JSON is valid')"
```

## Step 3: Import Data

### Using the Migration Script

1. **Start your Next.js application**:
   ```bash
   npm run dev
   # or for production
   npm run build && npm start
   ```

2. **Run the migration script**:
   ```bash
   # Import users first
   node scripts/migrate-from-wordpress.js users wp-users.json
   
   # Then import LifeLines
   node scripts/migrate-from-wordpress.js lifelines wp-lifelines.json
   
   # Finally import inquiries
   node scripts/migrate-from-wordpress.js inquiries wp-inquiries.json
   
   # Or import everything at once
   node scripts/migrate-from-wordpress.js all wp-export.json
   ```

### Using API Endpoints Directly

You can also use the REST API endpoints directly:

```bash
# Import users
curl -X POST http://localhost:3000/api/migration/wordpress/users \
  -H "Content-Type: application/json" \
  -d @wp-users.json

# Import LifeLines  
curl -X POST http://localhost:3000/api/migration/wordpress/lifelines \
  -H "Content-Type: application/json" \
  -d @wp-lifelines.json

# Import inquiries
curl -X POST http://localhost:3000/api/migration/wordpress/inquiries \
  -H "Content-Type: application/json" \
  -d @wp-inquiries.json
```

## Data Mapping

### User Roles
- `administrator` → `ADMIN`
- `lifeline_leader` or `editor` → `LIFELINE_LEADER`
- `formation_support` or `contributor` → `FORMATION_SUPPORT_TEAM`
- All others → `MEMBER`

### LifeLine Status
- `publish` → `PUBLISHED`
- `draft` → `DRAFT`
- `private` → `ARCHIVED`

### Group Types
- `social` → `SOCIAL`
- `activity` → `ACTIVITY`  
- `scripture_based` → `SCRIPTURE_BASED`
- `sunday_based` → `SUNDAY_BASED`

## Post-Migration Tasks

1. **Review imported data** in the admin dashboard
2. **Verify user accounts** and send password reset links
3. **Update LifeLine images** and descriptions as needed
4. **Test functionality** with imported data
5. **Set up redirects** from old WordPress URLs

## Troubleshooting

### Common Issues

1. **User already exists**: Existing users are skipped, check the details in the migration output

2. **LifeLine without leader**: LifeLines are imported but not assigned to a leader if the leader email doesn't match an imported user

3. **Missing Inquiries**: Inquiries require the associated LifeLine to exist first

4. **Permission errors**: Make sure you're running the migration as an admin user

### Rollback

If you need to rollback the migration:

```sql
-- Clear imported data (BE CAREFUL!)
DELETE FROM users WHERE created_at > '2024-01-01';  -- Adjust date
DELETE FROM lifelines WHERE created_at > '2024-01-01';
DELETE FROM inquiries WHERE created_at > '2024-01-01';
```

## Support

If you encounter issues during migration:

1. Check the application logs for detailed error messages
2. Verify your data format matches the expected schema
3. Ensure all required fields are present
4. Contact the development team with specific error messages

## Security Notes

- **Temporary passwords** are generated for imported users
- **Email notifications** should be sent to all imported users
- **Review user permissions** after import
- **Backup your database** before running migrations