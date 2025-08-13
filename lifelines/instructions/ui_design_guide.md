# UI/UX Design Guide & Component Specifications

## Color Palette (Exact Match to Current Site)

### Primary Colors
- **Primary Blue**: `#1f346d` (Navigation, headers, primary buttons)
- **Secondary Teal**: `#019e7c` (Accent elements, success states)
- **Background**: `#f3f4f6` (Page backgrounds)

### Neutral Colors
- **White**: `#ffffff` (Card backgrounds, form fields)
- **Light Gray**: `#f9fafb` (Secondary backgrounds)
- **Border Gray**: `#e5e7eb` (Borders, dividers)
- **Text Gray**: `#374151` (Secondary text)
- **Dark Text**: `#111827` (Primary text)

### Status Colors
- **Success**: `#16a34a` (Approved, joined)
- **Warning**: `#f59e0b` (Pending, submitted)
- **Error**: `#dc2626` (Rejected, errors)
- **Info**: `#2563eb` (Information, links)

## Typography

### Font Stack
```css
/* Primary Font - Libre Franklin */
font-family: "Libre Franklin", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;

/* Secondary Font - Libre Baskerville */
font-family: "Libre Baskerville", Georgia, serif;
```

### Font Sizes & Weights
- **H1**: 2.25rem (36px), font-weight: 700
- **H2**: 1.875rem (30px), font-weight: 600
- **H3**: 1.5rem (24px), font-weight: 600
- **H4**: 1.25rem (20px), font-weight: 500
- **Body**: 1rem (16px), font-weight: 400
- **Small**: 0.875rem (14px), font-weight: 400

## Layout Components

### Header/Navigation
```css
/* Header styling to match current */
.header {
  background: #1f346d;
  color: white;
  height: 80px;
  position: sticky;
  top: 0;
  z-index: 50;
}

.nav-menu {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.nav-link {
  color: white;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;
}

.nav-link:hover {
  color: #019e7c;
}
```

### Dashboard Cards
```css
.dashboard-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.dashboard-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f346d;
}
```

### Form Elements
```css
.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 16px;
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #1f346d;
  box-shadow: 0 0 0 3px rgba(31, 52, 109, 0.1);
}

.form-button {
  background: #1f346d;
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.form-button:hover {
  background: #2d4a85;
}

.form-button.secondary {
  background: #019e7c;
}

.form-button.secondary:hover {
  background: #0d7f68;
}
```

## Page-Specific Layouts

### Homepage Layout
- Hero section with church branding
- LifeLines grid/list view
- Search and filter functionality
- Call-to-action for joining/leading groups

### Dashboard Layouts
```css
/* Leader Dashboard */
.leader-dashboard {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  padding: 24px;
}

/* Formation Dashboard */
.formation-dashboard {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.formation-tabs {
  display: flex;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 24px;
}

.formation-tab {
  padding: 12px 24px;
  background: transparent;
  border: none;
  font-weight: 500;
  cursor: pointer;
  border-bottom: 2px solid transparent;
}

.formation-tab.active {
  color: #1f346d;
  border-bottom-color: #1f346d;
}
```

### Status Badges & Indicators
```css
.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.status-badge.submitted {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.approved {
  background: #dcfce7;
  color: #166534;
}

.status-badge.full {
  background: #fecaca;
  color: #dc2626;
}

.status-badge.undecided {
  background: #e5e7eb;
  color: #6b7280;
}

.status-badge.joined {
  background: #dcfce7;
  color: #166534;
}
```

## Interactive Components

### Voting Buttons (Formation Dashboard)
```css
.voting-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.vote-button {
  padding: 8px 16px;
  border: 1px solid #e5e7eb;
  background: white;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.vote-button:hover {
  border-color: #1f346d;
  color: #1f346d;
}

.vote-button.active {
  background: #1f346d;
  color: white;
  border-color: #1f346d;
}
```

### Data Tables
```css
.data-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.data-table th {
  background: #f9fafb;
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
}

.data-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
  color: #6b7280;
}

.data-table tr:hover {
  background: #f9fafb;
}
```

### Modal Dialogs
```css
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  padding: 24px;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f346d;
}
```

## Responsive Design

### Breakpoints
- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

### Mobile Adaptations
```css
@media (max-width: 640px) {
  .leader-dashboard {
    grid-template-columns: 1fr;
    gap: 16px;
    padding: 16px;
  }
  
  .formation-tabs {
    flex-direction: column;
    gap: 0;
  }
  
  .voting-buttons {
    justify-content: stretch;
  }
  
  .vote-button {
    flex: 1;
    text-align: center;
  }
}
```

## Component States & Interactions

### Loading States
```css
.loading-spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid #e5e7eb;
  border-top: 2px solid #1f346d;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

### Error States
```css
.error-message {
  background: #fef2f2;
  color: #dc2626;
  padding: 12px 16px;
  border-radius: 6px;
  border: 1px solid #fecaca;
  font-size: 0.875rem;
}

.success-message {
  background: #f0fdf4;
  color: #166534;
  padding: 12px 16px;
  border-radius: 6px;
  border: 1px solid #bbf7d0;
  font-size: 0.875rem;
}
```

## Accessibility Requirements

### Focus States
```css
.focusable:focus {
  outline: 2px solid #1f346d;
  outline-offset: 2px;
}
```

### Screen Reader Support
- All form inputs have proper labels
- Status changes announced via aria-live regions
- Keyboard navigation support
- Alt text for all images
- Semantic HTML structure

## Animation Guidelines
- Subtle transitions (0.2s ease)
- Loading indicators for async operations
- Smooth state changes
- No motion for users who prefer reduced motion
