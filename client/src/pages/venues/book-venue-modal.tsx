import React, { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { insertVenueBookingSchema, Venue } from '@shared/schema';
import { Loader2, CalendarIcon, Clock } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

// Form schema with validation
const formSchema = z.object({
  bookingDate: z.date({
    required_error: "Please select a date for your booking.",
  }).min(new Date(), {
    message: "Booking date cannot be in the past",
  }),
  bookingDuration: z.number({
    required_error: "Please select booking duration",
  }).int().min(1, {
    message: "Booking must be at least 1 hour",
  }).max(12, {
    message: "Booking cannot exceed 12 hours",
  }),
  attendeeCount: z.number({
    required_error: "Please enter number of attendees",
  }).int().min(1, {
    message: "Must have at least 1 attendee",
  }),
});

type FormValues = z.infer<typeof formSchema>;

interface BookVenueModalProps {
  venue: Venue;
  isOpen: boolean;
  onClose: () => void;
}

export default function BookVenueModal({ venue, isOpen, onClose }: BookVenueModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      bookingDuration: 1,
      attendeeCount: 1,
    },
  });
  
  // Booking mutation
  const bookingMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      // Calculate total amount based on venue price and duration
      const totalAmount = venue.price * data.bookingDuration;
      
      // Need to ensure we're passing the venueId as a number
      const venueId = typeof venue.id === 'number' ? venue.id : parseInt(String(venue.id));
      
      console.log('Venue data:', {
        id: venue.id,
        name: venue.name,
        price: venue.price,
        parsedId: venueId
      }); // Debug log
      
      if (isNaN(venueId)) {
        throw new Error('Invalid venue ID');
      }
      
      const bookingData = {
        venueId,
        bookingDate: data.bookingDate.toISOString(),
        bookingDuration: data.bookingDuration,
        attendeeCount: data.attendeeCount,
        totalAmount,
        // Explicitly set eventId to null for venue bookings
        eventId: null
      };
      
      console.log('Venue booking data being sent:', bookingData);
      const response = await apiRequest('POST', '/bookings', bookingData);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/venues', venue.id] });
      
      toast({
        title: "Venue Booked!",
        description: "Your venue booking has been confirmed.",
      });
      
      onClose();
      form.reset();
    },
    onError: (error) => {
      console.error('Booking error:', error); // Debug log
      toast({
        title: "Booking Failed",
        description: error instanceof Error ? error.message : "Could not complete your booking",
        variant: "destructive",
      });
    }
  });
  
  // Handle form submission
  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      await bookingMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Generate hours for selection
  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Book {venue.name}</DialogTitle>
          <DialogDescription>
            Fill out the details below to book this venue.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="bookingDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Booking Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Select a date</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date() || date > new Date(new Date().setMonth(new Date().getMonth() + 6))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      Select a date up to 6 months in advance.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="bookingDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (hours)</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={field.value.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select hours" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {hours.map((hour) => (
                            <SelectItem key={hour} value={hour.toString()}>
                              {hour} {hour === 1 ? 'hour' : 'hours'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="attendeeCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of People</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={venue.capacity}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Max: {venue.capacity}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="pt-2">
                <Label>Booking Summary</Label>
                <div className="bg-secondary p-3 rounded-md mt-1">
                  <p className="text-sm mb-1">Price: ${venue.price}/hour</p>
                  <p className="text-sm mb-1">
                    Duration: {form.watch('bookingDuration') || 1} {form.watch('bookingDuration') === 1 ? 'hour' : 'hours'}
                  </p>
                  <p className="text-sm font-semibold mt-2">
                    Total: ${(venue.price * (form.watch('bookingDuration') || 1)).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Booking...
                  </>
                ) : (
                  "Book Venue"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}