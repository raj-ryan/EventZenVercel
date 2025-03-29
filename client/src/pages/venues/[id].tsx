import { useEffect, useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function VenueDetailPage() {
  const [match, params] = useRoute('/venues/:id');
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { data: venue, isLoading: isVenueLoading } = useQuery({
    queryKey: ['/api/venues', params?.id],
    queryFn: async () => {
      try {
        if (!params?.id) throw new Error('Venue ID is required');
        const response = await apiRequest('GET', `/api/venues/${params.id}`);
        return response;
      } catch (error) {
        console.error('Error fetching venue:', error);
        setError(error instanceof Error ? error.message : 'Failed to load venue');
        throw error;
      }
    },
    enabled: Boolean(params?.id),
    retry: 2,
  });

  useEffect(() => {
    if (!isVenueLoading) {
      setIsLoading(false);
    }
  }, [isVenueLoading]);

  // Handle loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading venue details...</span>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-red-500 mb-4">Error: {error}</div>
        <button
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
          onClick={() => navigate('/venues')}
        >
          Back to Venues
        </button>
      </div>
    );
  }

  // Handle not found
  if (!venue) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-xl mb-4">Venue not found</div>
        <button
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
          onClick={() => navigate('/venues')}
        >
          Back to Venues
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Venue details content */}
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">{venue.name}</h1>
        {/* Add your venue details UI here */}
      </div>
    </div>
  );
} 