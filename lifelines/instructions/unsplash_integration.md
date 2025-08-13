# Unsplash API Integration Guide

## Overview
This guide provides a complete implementation for integrating Unsplash API to replace the WordPress Instant Images functionality. Users can search and select images from Unsplash for their LifeLines.

## Setup & Configuration

### Environment Variables
```env
UNSPLASH_ACCESS_KEY=your_unsplash_access_key_here
UNSPLASH_SECRET_KEY=your_unsplash_secret_key_here
```

### Install Dependencies
```bash
npm install unsplash-js
```

### API Service Setup
```typescript
// lib/unsplash.ts
import { createApi } from 'unsplash-js';

export const unsplash = createApi({
  accessKey: process.env.UNSPLASH_ACCESS_KEY!,
});

export type UnsplashImage = {
  id: string;
  urls: {
    small: string;
    regular: string;
    full: string;
  };
  alt_description: string | null;
  user: {
    name: string;
    username: string;
  };
  links: {
    download_location: string;
  };
};
```

## API Endpoints

### Search Images Endpoint
```typescript
// pages/api/unsplash/search.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { unsplash } from '@/lib/unsplash';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { query, page = 1, per_page = 12 } = req.query;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ message: 'Search query is required' });
  }

  try {
    const result = await unsplash.search.getPhotos({
      query,
      page: Number(page),
      perPage: Math.min(Number(per_page), 30), // Unsplash max is 30
      orientation: 'landscape', // Good for LifeLine cover images
    });

    if (result.errors) {
      return res.status(400).json({ 
        message: 'Unsplash API error',
        errors: result.errors 
      });
    }

    const images = result.response?.results.map((photo) => ({
      id: photo.id,
      urls: {
        small: photo.urls.small,
        regular: photo.urls.regular,
        full: photo.urls.full,
      },
      alt_description: photo.alt_description,
      user: {
        name: photo.user.name,
        username: photo.user.username,
      },
      links: {
        download_location: photo.links.download_location,
      },
    }));

    res.status(200).json({
      images: images || [],
      total: result.response?.total || 0,
      total_pages: result.response?.total_pages || 0,
      page: Number(page),
    });
  } catch (error) {
    console.error('Unsplash search error:', error);
    res.status(500).json({ message: 'Failed to search images' });
  }
}
```

### Download Tracking Endpoint
```typescript
// pages/api/unsplash/download.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { unsplash } from '@/lib/unsplash';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { downloadLocation } = req.body;

  if (!downloadLocation) {
    return res.status(400).json({ message: 'Download location is required' });
  }

  try {
    // Trigger download tracking (required by Unsplash API guidelines)
    await unsplash.photos.trackDownload({
      downloadLocation,
    });

    res.status(200).json({ message: 'Download tracked successfully' });
  } catch (error) {
    console.error('Download tracking error:', error);
    res.status(500).json({ message: 'Failed to track download' });
  }
}
```

## React Components

### Image Search Modal Component
```typescript
// components/ImageSearchModal.tsx
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Download, User } from 'lucide-react';

interface UnsplashImage {
  id: string;
  urls: {
    small: string;
    regular: string;
  };
  alt_description: string | null;
  user: {
    name: string;
    username: string;
  };
  links: {
    download_location: string;
  };
}

interface ImageSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (imageUrl: string, alt: string, attribution: string) => void;
}

export default function ImageSearchModal({ 
  isOpen, 
  onClose, 
  onSelectImage 
}: ImageSearchModalProps) {
  const [query, setQuery] = useState('');
  const [images, setImages] = useState<UnsplashImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const searchImages = async (searchQuery: string, pageNum = 1) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/unsplash/search?query=${encodeURIComponent(searchQuery)}&page=${pageNum}`
      );
      const data = await response.json();

      if (response.ok) {
        if (pageNum === 1) {
          setImages(data.images);
        } else {
          setImages(prev => [...prev, ...data.images]);
        }
        setHasMore(pageNum < data.total_pages);
        setPage(pageNum);
      } else {
        console.error('Search failed:', data.message);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectImage = async (image: UnsplashImage) => {
    try {
      // Track download for Unsplash attribution requirements
      await fetch('/api/unsplash/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          downloadLocation: image.links.download_location,
        }),
      });

      const attribution = `Photo by ${image.user.name} on Unsplash`;
      onSelectImage(image.urls.regular, image.alt_description || '', attribution);
      onClose();
    } catch (error) {
      console.error('Failed to select image:', error);
    }
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      searchImages(query, page + 1);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Choose an Image</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search Input */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search for images (e.g., community, church, group)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    searchImages(query, 1);
                  }
                }}
                className="pl-10"
              />
            </div>
            <Button onClick={() => searchImages(query, 1)} disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </div>

          {/* Image Grid */}
          <div className="grid grid-cols-3 md:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
            {images.map((image) => (
              <div
                key={image.id}
                className="relative group cursor-pointer rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                onClick={() => handleSelectImage(image)}
              >
                <img
                  src={image.urls.small}
                  alt={image.alt_description || 'Unsplash image'}
                  className="w-full h-24 object-cover"
                />
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center">
                  <Download className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                
                {/* Attribution */}
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span className="truncate">{image.user.name}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Load More */}
          {hasMore && images.length > 0 && (
            <div className="text-center">
              <Button onClick={loadMore} disabled={loading} variant="outline">
                {loading ? 'Loading...' : 'Load More'}
              </Button>
            </div>
          )}

          {/* Unsplash Attribution */}
          <div className="text-xs text-gray-500 text-center border-t pt-2">
            Photos provided by{' '}
            <a
              href="https://unsplash.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Unsplash
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### Image Selection Component for LifeLine Form
```typescript
// components/ImageSelector.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Image, Search, X } from 'lucide-react';
import ImageSearchModal from './ImageSearchModal';

interface ImageSelectorProps {
  value?: string;
  onChange: (imageUrl: string, alt: string, attribution: string) => void;
  className?: string;
}

export default function ImageSelector({ value, onChange, className }: ImageSelectorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(value || '');
  const [imageAlt, setImageAlt] = useState('');
  const [attribution, setAttribution] = useState('');

  const handleSelectImage = (imageUrl: string, alt: string, attr: string) => {
    setSelectedImage(imageUrl);
    setImageAlt(alt);
    setAttribution(attr);
    onChange(imageUrl, alt, attr);
  };

  const handleRemoveImage = () => {
    setSelectedImage('');
    setImageAlt('');
    setAttribution('');
    onChange('', '', '');
  };

  return (
    <div className={className}>
      {selectedImage ? (
        <div className="relative group">
          <img
            src={selectedImage}
            alt={imageAlt}
            className="w-full h-48 object-cover rounded-lg border border-gray-200"
          />
          
          {/* Remove Button */}
          <button
            type="button"
            onClick={handleRemoveImage}
            className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
          
          {/* Attribution */}
          {attribution && (
            <div className="text-xs text-gray-500 mt-1">{attribution}</div>
          )}
          
          {/* Change Image Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="mt-2"
          >
            <Search className="w-4 h-4 mr-2" />
            Change Image
          </Button>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
          <Image className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">Add an image to your LifeLine</p>
          <Button
            type="button"
            onClick={() => setIsModalOpen(true)}
            variant="outline"
          >
            <Search className="w-4 h-4 mr-2" />
            Search Images
          </Button>
        </div>
      )}

      <ImageSearchModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectImage={handleSelectImage}
      />
    </div>
  );
}
```

## Integration with LifeLine Form

### Usage in LifeLine Creation/Edit Form
```typescript
// In your LifeLine form component
import ImageSelector from '@/components/ImageSelector';

// Inside your form
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    LifeLine Image
  </label>
  <ImageSelector
    value={formData.imageUrl}
    onChange={(imageUrl, alt, attribution) => {
      setFormData(prev => ({
        ...prev,
        imageUrl,
        imageAlt: alt,
        imageAttribution: attribution,
      }));
    }}
  />
</div>
```

## Database Schema Updates

### Add Image Fields to LifeLine Model
```prisma
model LifeLine {
  // ... existing fields
  imageUrl          String?
  imageAlt          String?
  imageAttribution  String?  // For Unsplash attribution
}
```

## Best Practices & Guidelines

### Unsplash API Compliance
1. **Always track downloads** when a user selects an image
2. **Provide attribution** to the photographer
3. **Respect rate limits** (50 requests per hour for demo, 5000 for production)
4. **Use appropriate image sizes** based on context

### User Experience
1. **Provide search suggestions** for church-related terms
2. **Show loading states** during searches
3. **Implement infinite scroll** or pagination for large result sets
4. **Cache search results** to improve performance
5. **Provide fallback options** if Unsplash is unavailable

### Error Handling
```typescript
// Error handling in search component
const handleSearchError = (error: any) => {
  console.error('Unsplash search failed:', error);
  
  // Show user-friendly error message
  setError('Unable to search images. Please try again later.');
  
  // Optionally provide fallback to manual URL input
  setShowManualInput(true);
};
```

### Caching Strategy
```typescript
// lib/imageCache.ts
const imageCache = new Map();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

export const getCachedSearch = (query: string, page: number) => {
  const key = `${query}-${page}`;
  const cached = imageCache.get(key);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  
  return null;
};

export const setCachedSearch = (query: string, page: number, data: any) => {
  const key = `${query}-${page}`;
  imageCache.set(key, {
    data,
    timestamp: Date.now(),
  });
};
```

## Alternative Fallback Options

### Manual URL Input Component
```typescript
// components/ManualImageInput.tsx
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface ManualImageInputProps {
  onImageAdd: (url: string) => void;
}

export default function ManualImageInput({ onImageAdd }: ManualImageInputProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const validateAndAddImage = async () => {
    if (!url.trim()) return;
    
    setLoading(true);
    try {
      // Validate image URL
      const img = new Image();
      img.onload = () => {
        onImageAdd(url);
        setUrl('');
        setLoading(false);
      };
      img.onerror = () => {
        alert('Invalid image URL. Please check the URL and try again.');
        setLoading(false);
      };
      img.src = url;
    } catch (error) {
      alert('Failed to validate image URL.');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Or enter image URL manually
      </label>
      <div className="flex gap-2">
        <Input
          type="url"
          placeholder="https://example.com/image.jpg"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && validateAndAddImage()}
        />
        <Button onClick={validateAndAddImage} disabled={loading}>
          {loading ? 'Validating...' : 'Add'}
        </Button>
      </div>
    </div>
  );
}
```

### Default Image Placeholder System
```typescript
// lib/defaultImages.ts
export const DEFAULT_LIFELINE_IMAGES = [
  {
    url: '/images/defaults/community-1.jpg',
    alt: 'Community gathering',
    category: 'community'
  },
  {
    url: '/images/defaults/bible-study-1.jpg',
    alt: 'Bible study group',
    category: 'bible-study'
  },
  {
    url: '/images/defaults/fellowship-1.jpg',
    alt: 'Fellowship meal',
    category: 'fellowship'
  },
  // Add more default images
];

export const getDefaultImageByCategory = (category?: string) => {
  if (!category) {
    return DEFAULT_LIFELINE_IMAGES[0];
  }
  
  return DEFAULT_LIFELINE_IMAGES.find(img => img.category === category) 
    || DEFAULT_LIFELINE_IMAGES[0];
};
```

## Performance Optimizations

### Image Optimization
```typescript
// components/OptimizedImage.tsx
import Image from 'next/image';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
}

export default function OptimizedImage({ 
  src, 
  alt, 
  className,
  width = 400,
  height = 300 
}: OptimizedImageProps) {
  // Use Next.js Image component for optimization
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAQIAAxEhkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R+Rq3bNkvTZGz9PfFnTFJsJKSrKm7dBqqhCKKuwmxunLVF8eqmpXJSixPU0cV4+ccuRn2Q3HnycOBPdp46vT5vNhMN7W1s9dPLdC7QQ8A8c8jUKsHBNQDFNbUQdTMa4fBt3vL8+z3hvb6DJOmHbH+xhZi1+HmGjKgw7DduwsL7B5ZvB9VTIapGt7WE1BYM7vPJN8MlCzZQLrNjB3kznQQ=="
      priority={false}
    />
  );
}
```

### Lazy Loading for Image Grid
```typescript
// Use Intersection Observer for lazy loading
import { useEffect, useRef, useState } from 'react';

export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  { threshold = 0, root = null, rootMargin = '0%' }: IntersectionObserverInit = {}
) {
  const [entry, setEntry] = useState<IntersectionObserverEntry>();

  const updateEntry = ([entry]: IntersectionObserverEntry[]): void => {
    setEntry(entry);
  };

  useEffect(() => {
    const node = elementRef?.current;
    const hasIOSupport = !!window.IntersectionObserver;

    if (!hasIOSupport || !node) return;

    const observerParams = { threshold, root, rootMargin };
    const observer = new IntersectionObserver(updateEntry, observerParams);

    observer.observe(node);

    return () => observer.disconnect();
  }, [elementRef?.current, JSON.stringify(threshold), root, rootMargin]);

  return entry;
}
```

## Security Considerations

### URL Validation
```typescript
// utils/imageValidation.ts
const ALLOWED_DOMAINS = [
  'images.unsplash.com',
  'unsplash.com',
  // Add your own domain for default images
  'your-domain.com'
];

export const isValidImageUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    return ALLOWED_DOMAINS.some(domain => 
      parsedUrl.hostname === domain || 
      parsedUrl.hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
};

export const sanitizeImageUrl = (url: string): string => {
  if (!isValidImageUrl(url)) {
    throw new Error('Invalid image URL domain');
  }
  
  // Remove any query parameters that aren't needed
  const parsedUrl = new URL(url);
  const allowedParams = ['w', 'h', 'fit', 'crop', 'auto', 'q'];
  
  [...parsedUrl.searchParams.keys()].forEach(key => {
    if (!allowedParams.includes(key)) {
      parsedUrl.searchParams.delete(key);
    }
  });
  
  return parsedUrl.toString();
};
```

## Testing

### Unit Tests for Unsplash Integration
```typescript
// __tests__/unsplash.test.ts
import { searchUnsplashImages } from '../lib/unsplash';

describe('Unsplash Integration', () => {
  it('should search for images successfully', async () => {
    const results = await searchUnsplashImages('church', 1, 12);
    
    expect(results).toHaveProperty('images');
    expect(results).toHaveProperty('total');
    expect(Array.isArray(results.images)).toBe(true);
  });

  it('should handle search errors gracefully', async () => {
    // Mock API failure
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('API Error'));
    
    const results = await searchUnsplashImages('test', 1, 12);
    expect(results.images).toEqual([]);
  });
});
```

## Usage Examples

### Popular Search Terms for Churches
```typescript
export const SUGGESTED_SEARCH_TERMS = [
  'community',
  'fellowship',
  'bible study',
  'prayer',
  'worship',
  'family',
  'together',
  'hands',
  'cross',
  'church',
  'faith',
  'hope',
  'love',
  'unity',
  'ministry'
];
```

### Integration with Form Validation
```typescript
// In your LifeLine form validation schema
import { z } from 'zod';

const lifeLineSchema = z.object({
  // ... other fields
  imageUrl: z.string().url().optional(),
  imageAlt: z.string().optional(),
  imageAttribution: z.string().optional(),
});
```

This comprehensive Unsplash integration will provide your users with a seamless image selection experience similar to the WordPress Instant Images plugin, while maintaining proper attribution and compliance with Unsplash's API guidelines.