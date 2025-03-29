import React, { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { CalendarIcon, Save, Loader2, ArrowLeft } from 'lucide-react';

// ShadCN UI components
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

// Define the form schema with validation
const eventFormSchema = z.object({
  name: z.string().min(3, 'Event name must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  date: z.date({
    required_error: 'Event date is required',
  }),
  endDate: z.date().optional().nullable(),
  venueId: z.number({
    required_error: 'Please select a venue',
  }),
  capacity: z.number({
    required_error: 'Capacity is required',
  }).min(1, 'Capacity must be at least 1'),
  price: z.number({
    required_error: 'Price is required',
  }).min(0, 'Price cannot be negative'),
  image: z.string().url('Please enter a valid URL').nullable().optional(),
  status: z.enum(['upcoming', 'ongoing', 'completed', 'cancelled'], {
    required_error: 'Please select a status',
  }),
});

type EventFormValues = z.infer<typeof eventFormSchema>;

// Define venue interface
interface Venue {
  id: number;
  name: string;
  city: string;
  capacity: number;
  address?: string;
  price?: number;
}

export default function EventForm() {
  const [match, params] = useRoute('/events/edit/:id');
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [venues, setVenues] = useState<Venue[]>([]);
  
  // Determine if this is edit mode based on the route
  const isEditMode = Boolean(match && params?.id);
  
  // Define default form values
  const defaultValues: Partial<EventFormValues> = {
    name: '',
    description: '',
    capacity: 100,
    price: 0,
    status: 'upcoming',
    venueId: undefined,
    image: '',
    date: undefined,
    endDate: null,
  };
  
  // Initialize form
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues,
  });
  
  // Fetch event data if in edit mode
  const { data: eventData, isLoading: isLoadingEvent } = useQuery({
    queryKey: ['/api/events', params?.id],
    queryFn: async () => {
      if (!isEditMode) return null;
      const response = await apiRequest('GET', `/api/events/${params!.id}`);
      const data = await response.json();
      return data;
    },
    enabled: isEditMode ? true : false,
  });
  
  // Reset form when event data is loaded
  useEffect(() => {
    if (eventData) {
      // Reset form with loaded data
      form.reset({
        name: eventData.name,
        description: eventData.description,
        date: new Date(eventData.date),
        endDate: eventData.endDate ? new Date(eventData.endDate) : null,
        venueId: eventData.venueId,
        capacity: eventData.capacity,
        price: eventData.price,
        image: eventData.image,
        status: eventData.status as any,
      });
    }
  }, [eventData, form]);
  
  // Fetch venues using React Query instead of useEffect
  const { data: venues = [], isLoading: isVenuesLoading, error: venuesError } = useQuery({
    queryKey: ['/api/venues'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/venues');
        console.log('Fetched venues:', response);
        return Array.isArray(response) ? response : [];
      } catch (error) {
        console.error('Error fetching venues:', error);
        toast({
          title: 'Error',
          description: 'Could not load venues. Please try again.',
          variant: 'destructive',
        });
        throw error;
      }
    },
    retry: 2,
  });
  
  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: async (eventData: EventFormValues) => {
      const response = await apiRequest('POST', '/api/events', eventData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      toast({
        title: 'Event Created',
        description: 'Your event has been successfully created.',
      });
      navigate('/events');
    },
    onError: (error) => {
      console.error('Error creating event:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Could not create event',
        variant: 'destructive',
      });
    },
  });
  
  // Update event mutation
  const updateEventMutation = useMutation({
    mutationFn: async (eventData: EventFormValues) => {
      const response = await apiRequest('PUT', `/api/events/${params!.id}`, eventData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/events', params?.id] });
      toast({
        title: 'Event Updated',
        description: 'Your event has been successfully updated.',
      });
      navigate('/events');
    },
    onError: (error) => {
      console.error('Error updating event:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Could not update event',
        variant: 'destructive',
      });
    },
  });
  
  // Form submission handler
  const onSubmit = async (values: EventFormValues) => {
    setIsSubmitting(true);
    try {
      if (isEditMode) {
        await updateEventMutation.mutateAsync(values);
      } else {
        // Add console logs for debugging
        console.log('Submitting event data:', values);
        const result = await createEventMutation.mutateAsync(values);
        console.log('Event creation result:', result);
        
        // Only navigate after successful creation
        if (result) {
          // Invalidate and refetch events query
          await queryClient.invalidateQueries({ queryKey: ['/api/events'] });
          
          toast({
            title: 'Event Created',
            description: 'Your event has been successfully created.',
          });
          
          // Navigate after successful creation
          setTimeout(() => {
            navigate('/events');
          }, 100);
        }
      }
    } catch (error) {
      console.error('Form submission error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Could not create/update event',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Show loading state while fetching event data
  if (isEditMode && isLoadingEvent) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEditMode ? 'Edit Event' : 'Create New Event'}
          </h1>
          <p className="text-muted-foreground">
            {isEditMode
              ? 'Update the details of your existing event'
              : 'Fill out the form below to create a new event'}
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/events')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Events
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Event Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Annual Tech Conference 2025"
                    value={field.value || ''}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    ref={field.ref}
                    name={field.name}
                  />
                </FormControl>
                <FormDescription>
                  Choose a clear, descriptive name for your event.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Provide a detailed description of your event."
                    className="min-h-32"
                    value={field.value || ''}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    ref={field.ref}
                    name={field.name}
                  />
                </FormControl>
                <FormDescription>
                  Describe your event, including what attendees can expect.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Event Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    The start date of your event.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>End Date (Optional)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick an end date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={field.onChange}
                        initialFocus
                        disabled={(date) => {
                          const startDate = form.getValues("date");
                          return startDate ? date < startDate : false;
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    If your event spans multiple days, select an end date.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <FormField
              control={form.control}
              name="venueId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Venue</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    defaultValue={field.value?.toString()}
                    disabled={isVenuesLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={isVenuesLoading ? "Loading venues..." : "Select a venue"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isVenuesLoading ? (
                        <SelectItem value="" disabled>
                          <div className="flex items-center">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Loading venues...
                          </div>
                        </SelectItem>
                      ) : venues.length > 0 ? (
                        venues.map((venue) => (
                          <SelectItem key={venue.id} value={venue.id.toString()}>
                            {venue.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="" disabled>
                          No venues available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {venuesError && (
                    <div className="text-red-500 text-sm mt-1">
                      Failed to load venues. Please try refreshing the page.
                    </div>
                  )}
                  <FormDescription>
                    Choose where the event will be held.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="capacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Capacity</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      placeholder="100"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Maximum number of attendees.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price ($)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="50.00"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Ticket price per person (0 for free events).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="image"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Image URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://example.com/event-image.jpg"
                      value={field.value || ''}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      ref={field.ref}
                      name={field.name}
                    />
                  </FormControl>
                  <FormDescription>
                    Provide a URL for the event image. Recommended size: 1200x600px.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="ongoing">Ongoing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Current status of the event.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/events")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {isEditMode ? "Update Event" : "Create Event"}
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}