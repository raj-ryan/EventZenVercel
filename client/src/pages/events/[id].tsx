import { useEffect, useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function EventDetailPage() {
  const [match, params] = useRoute('/events/:id');
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // First, check if API is available
  const { data: pingData, isError: isPingError } = useQuery({
    queryKey: ['ping'],
    queryFn: async () => {
      try {
        return await apiRequest('GET', '/ping');
      } catch (error) {
        console.error('API ping failed:', error);
        setError('Could not connect to server');
        throw error;
      }
    },
    retry: 1,
  });

  // Then fetch event data if API is available
  const { data: event, isLoading: isEventLoading } = useQuery({
    queryKey: ['/api/events', params?.id],
    queryFn: async () => {
      try {
        if (!params?.id) throw new Error('Event ID is required');
        const response = await apiRequest('GET', `/api/events/${params.id}`);
        return response;
      } catch (error) {
        console.error('Error fetching event:', error);
        setError(error instanceof Error ? error.message : 'Failed to load event');
        throw error;
      }
    },
    enabled: Boolean(params?.id && !isPingError),
    retry: 2,
  });

  useEffect(() => {
    if (!isEventLoading) {
      setIsLoading(false);
    }
  }, [isEventLoading]);

  // Handle loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading event details...</span>
      </div>
    );
  }

  // Handle API connection error
  if (isPingError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-red-500 mb-4">Error: Could not connect to server</div>
        <p className="text-gray-600 mb-4">Please try again later</p>
        <button
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
          onClick={() => navigate('/events')}
        >
          Back to Events
        </button>
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
          onClick={() => navigate('/events')}
        >
          Back to Events
        </button>
      </div>
    );
  }

  // Handle not found
  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-xl mb-4">Event not found</div>
        <button
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
          onClick={() => navigate('/events')}
        >
          Back to Events
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Event details content */}
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">{event.name}</h1>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="grid gap-4">
            <div>
              <h2 className="text-lg font-semibold">Description</h2>
              <p className="text-gray-600">{event.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h2 className="text-lg font-semibold">Date</h2>
                <p className="text-gray-600">
                  {new Date(event.date).toLocaleDateString()}
                </p>
              </div>
              <div>
                <h2 className="text-lg font-semibold">Price</h2>
                <p className="text-gray-600">${event.price}</p>
              </div>
              <div>
                <h2 className="text-lg font-semibold">Capacity</h2>
                <p className="text-gray-600">{event.capacity}</p>
              </div>
              <div>
                <h2 className="text-lg font-semibold">Status</h2>
                <p className="text-gray-600">{event.status}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 