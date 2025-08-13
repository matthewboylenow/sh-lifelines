# LifeLines Next.js Setup Instructions

## Prerequisites for GitHub Codespaces

### 1. Initialize Node.js Project
```bash
npm init -y
```

### 2. Core Next.js Dependencies
```bash
npm install next@latest react@latest react-dom@latest
npm install typescript @types/node @types/react @types/react-dom
npm install tailwindcss postcss autoprefixer
npm install @tailwindcss/forms @tailwindcss/typography
```

### 3. Database & ORM
```bash
npm install prisma @prisma/client
npm install bcryptjs jsonwebtoken
npm install @types/bcryptjs @types/jsonwebtoken
```

### 4. Authentication & Security
```bash
npm install next-auth
npm install @next-auth/prisma-adapter
npm install iron-session
```

### 5. Form Handling & Validation
```bash
npm install react-hook-form @hookform/resolvers
npm install zod
npm install @radix-ui/react-select @radix-ui/react-checkbox
npm install @radix-ui/react-radio-group @radix-ui/react-tabs
```

### 6. UI Components & Styling
```bash
npm install class-variance-authority clsx tailwind-merge
npm install lucide-react
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu
npm install @radix-ui/react-toast @radix-ui/react-alert-dialog
```

### 7. File Handling & Storage
```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
npm install multer @types/multer
```

### 8. Email & Notifications
```bash
npm install @sendgrid/mail
npm install nodemailer @types/nodemailer
```

### 9. External APIs
```bash
npm install axios
npm install unsplash-js
```

### 10. Development Tools
```bash
npm install -D eslint eslint-config-next
npm install -D prettier eslint-config-prettier
npm install -D @types/uuid uuid
```

### 11. Initialize Configurations

#### Tailwind CSS
```bash
npx tailwindcss init -p
```

#### Prisma
```bash
npx prisma init
```

### 12. Environment Variables Template (.env.local)
```
DATABASE_URL="postgresql://..."
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"
UNSPLASH_ACCESS_KEY="your-unsplash-key"
AWS_ACCESS_KEY_ID="your-aws-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret"
AWS_S3_BUCKET_NAME="your-bucket-name"
SENDGRID_API_KEY="your-sendgrid-key"
```

## After Installing Dependencies

1. Install Claude Code following the official documentation
2. Upload the documentation files provided separately
3. Begin with the database schema setup
4. Proceed with authentication system
5. Build core functionality components

## Project Structure Preview
```
lifelines-nextjs/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── types/
│   └── utils/
├── public/
├── docs/
└── package.json
```
