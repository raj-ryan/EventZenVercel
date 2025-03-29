import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Event, Venue } from "@shared/schema";
import { 
  ArrowLeft, 
  Calendar,
  MapPin, 
  Users, 
  DollarSign,
  Clock,
  Tag,
  Share2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import BookEventModal from "./book-event-modal";
import { format } from "date-fns";

// Event detail interface that combines Event and additional UI data
interface EventDetailUI {
  id: number;
  name: string;
  description: string | null;
  date: Date;
  endDate: Date | null;
  venueId: number;
  capacity: number;
  price: number;
  category: string;
  image: string | null;
  createdBy: number;
  status: string;
  isPublished: boolean;
  liveStatus: boolean;
  createdAt: Date;
  updatedAt: Date;
  venue: {
    id: number;
    name: string;
    address: string;
    capacity: number;
    amenities: string[];
  };
  organizer: {
    id: number;
    name: string;
    avatar: string;
  };
  attendees: {
    count: number;
    list: Array<{
      id: number;
      name: string;
      avatar: string;
    }>;
  };
}

export default function EventDetail() {
  const params = useParams<{ id: string }>();
  const [_, navigate] = useLocation();
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [eventDetail, setEventDetail] = useState<EventDetailUI | null>(null);
  
  // Fetch event data
  const { data: event, isLoading: eventLoading, error: eventError } = useQuery<Event>({
    queryKey: ['/events', params?.id],
    queryFn: async () => {
      console.log(`Fetching event with ID: ${params?.id}`);
      try {
        // Use direct fetch to ensure proper API routing
        const response = await fetch(`/api/events/${params?.id}`, {
          headers: {
            'Accept': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch event: ${response.status}`);
        }
        
        // Check content type
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.error('Non-JSON response received:', contentType);
          throw new Error('Server returned non-JSON response');
        }
        
        const data = await response.json();
        console.log('Event data received:', data);
        return data;
      } catch (error) {
        console.error('Error fetching event:', error);
        throw error;
      }
    },
    retry: 1
  });

  // Fetch venue data if event has a venueId
  const { data: venue, isLoading: venueLoading, error: venueError } = useQuery<Venue>({
    queryKey: ['/venues', event?.venueId],
    queryFn: async () => {
      try {
        // Use direct fetch to ensure proper API routing
        const response = await fetch(`/api/venues/${event?.venueId}`, {
          headers: {
            'Accept': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch venue: ${response.status}`);
        }
        
        // Check content type
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.error('Non-JSON response received:', contentType);
          throw new Error('Server returned non-JSON response');
        }
        
        const data = await response.json();
        console.log('Venue data received:', data);
        return data;
      } catch (error) {
        console.error('Error fetching venue:', error);
        throw error;
      }
    },
    enabled: !!event?.venueId,
    retry: 1
  });

  // Combine event and venue data
  useEffect(() => {
    if (event) {
      // Transform the data to match the EventDetailUI interface
      const eventDetail: EventDetailUI = {
        ...event,
        venue: venue ? {
          id: venue.id,
          name: venue.name,
          address: venue.address || "",
          capacity: venue.capacity,
          amenities: venue.amenities ? 
            (Array.isArray(venue.amenities) ? venue.amenities as string[] : []) : 
            []
        } : {
          id: event.venueId,
          name: "Loading venue...",
          address: "",
          capacity: 0,
          amenities: []
        },
        organizer: {
          id: event.createdBy,
          name: "Event Organizer",
          avatar: "O"
        },
        attendees: {
          count: 0,
          list: []
        }
      };
      setEventDetail(eventDetail);
    }
  }, [event, venue]);
  
  // Function to get default image based on category
  const getDefaultEventImage = (category?: string) => {
    switch (category?.toLowerCase()) {
      case "technology":
        return "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2070&auto=format&fit=crop";
      case "wedding":
        return "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=2069&auto=format&fit=crop";
      case "music":
        return "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?q=80&w=2070&auto=format&fit=crop";
      case "charity":
        return "https://images.unsplash.com/photo-1519751138087-5bf79df62d5b?q=80&w=2070&auto=format&fit=crop";
      default:
        return "https://images.unsplash.com/photo-1523580494863-6f3031224c94?q=80&w=2070&auto=format&fit=crop";
    }
  };

  const isLoading = eventLoading || venueLoading;
  const error = eventError || venueError;
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (error || !event) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500">Error loading event</h1>
          <p className="mt-2">Unable to load event details. Please try again later.</p>
          <Button 
            variant="outline" 
            className="mt-4" 
            onClick={() => navigate("/events")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Events
          </Button>
        </div>
      </div>
    );
  }
  
  // Wait until eventDetail is populated
  if (!eventDetail) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const formatDateRange = () => {
    const start = format(new Date(eventDetail.date), "PPP");
    
    if (eventDetail.endDate) {
      const end = format(new Date(eventDetail.endDate), "PPP");
      return `${start} - ${end}`;
    }
    
    return start;
  };
  
  const formatTimeRange = () => {
    const start = format(new Date(eventDetail.date), "h:mm a");
    
    if (eventDetail.endDate) {
      const end = format(new Date(eventDetail.endDate), "h:mm a");
      return `${start} - ${end}`;
    }
    
    return `${start} onward`;
  };
  
  const getStatusColor = () => {
    switch (eventDetail.status) {
      case 'upcoming':
        return 'bg-blue-100 text-blue-800';
      case 'ongoing':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Back button */}
      <div className="mb-6">
        <Button variant="outline" onClick={() => navigate("/events")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Events
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2">
          {/* Event image */}
          <div className="rounded-xl overflow-hidden mb-6">
            <AspectRatio ratio={16 / 9}>
              <img 
                src={eventDetail.image} 
                alt={eventDetail.name} 
                className="object-cover w-full h-full"
              />
            </AspectRatio>
          </div>
          
          {/* Event header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold">{eventDetail.name}</h1>
              <Badge className={getStatusColor()}>
                {eventDetail.status.charAt(0).toUpperCase() + eventDetail.status.slice(1)}
              </Badge>
            </div>
            
            <div className="flex items-center mt-2">
              <Tag className="h-4 w-4 mr-1" />
              <span className="text-muted-foreground">{eventDetail.category}</span>
            </div>
          </div>
          
          {/* Event organizer */}
          <div className="flex items-center mb-6">
            <Avatar className="h-10 w-10 mr-2">
              <AvatarFallback>{eventDetail.organizer.avatar}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">Organized by</p>
              <p className="font-semibold">{eventDetail.organizer.name}</p>
            </div>
          </div>
          
          {/* Event details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  Date & Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>{formatDateRange()}</p>
                <p className="text-muted-foreground">{formatTimeRange()}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                  Location
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>{eventDetail.venue.name}</p>
                <p className="text-muted-foreground">{eventDetail.venue.address}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Attendance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>{eventDetail.attendees.count} / {eventDetail.capacity} attending</p>
                <p className="text-muted-foreground">
                  {Math.round((eventDetail.attendees.count / eventDetail.capacity) * 100)}% filled
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Price
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>${eventDetail.price.toFixed(2)} per ticket</p>
                <p className="text-muted-foreground">
                  {eventDetail.price === 0 ? 'Free event' : 'Paid event'}
                </p>
              </CardContent>
            </Card>
          </div>
          
          {/* Event description */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>About this event</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-line">{eventDetail.description}</p>
            </CardContent>
          </Card>
          
          {/* Venue information */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Venue Information</CardTitle>
              <CardDescription>{eventDetail.venue.name}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">{eventDetail.venue.address}</p>
              <div className="mb-4">
                <h4 className="font-medium mb-2">Amenities</h4>
                <div className="flex flex-wrap gap-2">
                  {eventDetail.venue.amenities.map((amenity: string, index: number) => (
                    <Badge key={index} variant="outline">
                      {amenity}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Capacity</h4>
                <p>This venue can accommodate up to {eventDetail.venue.capacity} people.</p>
              </div>
            </CardContent>
          </Card>
          
          {/* Attendees */}
          <Card>
            <CardHeader>
              <CardTitle>Attendees</CardTitle>
              <CardDescription>{eventDetail.attendees.count} people are attending</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {eventDetail.attendees.list.map((attendee: any) => (
                  <div key={attendee.id} className="flex items-center">
                    <Avatar className="h-8 w-8 mr-2">
                      <AvatarFallback>{attendee.avatar}</AvatarFallback>
                    </Avatar>
                    <span>{attendee.name}</span>
                  </div>
                ))}
                {eventDetail.attendees.count > eventDetail.attendees.list.length && (
                  <div className="text-muted-foreground ml-2">
                    +{eventDetail.attendees.count - eventDetail.attendees.list.length} more
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <Card>
              <CardHeader>
                <CardTitle>Booking Information</CardTitle>
                <CardDescription>Secure your spot at this event</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Price:</span>
                    <span className="font-bold">
                      {eventDetail.price === 0 ? 'Free' : `$${eventDetail.price.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Available spots:</span>
                    <span className="font-bold">
                      {eventDetail.capacity - eventDetail.attendees.count}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Event date:</span>
                    <span className="font-bold">
                      {format(new Date(eventDetail.date), "MMM d, yyyy")}
                    </span>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex flex-col gap-2">
                    <Button 
                      size="lg" 
                      className="w-full"
                      onClick={() => setIsBookModalOpen(true)}
                      disabled={eventDetail.status === 'cancelled' || eventDetail.status === 'completed'}
                    >
                      Book Now
                    </Button>
                    
                    <Button variant="outline" size="lg" className="w-full">
                      <Share2 className="h-4 w-4 mr-2" />
                      Share Event
                    </Button>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="text-sm text-muted-foreground">
                <p>
                  {eventDetail.status === 'upcoming' 
                    ? `Booking closes 24 hours before the event`
                    : eventDetail.status === 'cancelled' 
                      ? 'This event has been cancelled'
                      : eventDetail.status === 'completed'
                        ? 'This event has ended'
                        : 'Book now while spots are available!'}
                </p>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Booking Modal */}
      <BookEventModal 
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        event={eventDetail}
      />
    </div>
  );
}