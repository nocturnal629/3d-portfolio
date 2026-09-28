import type { MetadataRoute } from 'next';
import { profile } from '@/data/profile';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: profile.site,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
  ];
}
