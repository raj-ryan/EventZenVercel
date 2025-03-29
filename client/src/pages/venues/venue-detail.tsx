import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Venue } from "@shared/schema";
import { 
  ChevronsLeft, 
  Users, 
  MapPin, 
  DollarSign, 
  Loader2, 
  Calendar, 
  Tag,
  Coffee,
  Wifi
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import BookVenueModal from "./book-venue-modal";

export default function VenueDetail() {
  const params = useParams();
  const [_, navigate] = useLocation();
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Check for admin status
  useEffect(() => {
    const storedRole = localStorage.getItem("userRole");
    if (storedRole === "admin") {
      setIsAdmin(true);
    }
  }, []);
  
  // Fetch venue details
  const { 
    data: venue, 
    isLoading, 
    error 
  } = useQuery<Venue>({
    queryKey: ['/venues', params?.id],
    queryFn: async () => {
      console.log('Fetching venue with ID:', params?.id);
      try {
        // Use direct fetch to ensure proper API routing
        const response = await fetch(`/api/venues/${params?.id}`, {
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
    enabled: !!params?.id,
    retry: 2
  });
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (error || !venue) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h2 className="text-2xl font-bold mb-2">Error Loading Venue</h2>
        <p className="text-muted-foreground mb-4">We couldn't load the venue details</p>
        <Button onClick={() => navigate("/venues")}>Back to Venues</Button>
      </div>
    );
  }
  
  // Format amenities for display
  const amenities: string[] = venue.amenities ? 
    (Array.isArray(venue.amenities) ? venue.amenities as string[] : []) : 
    [];
  
  // Get amenity icon
  const getAmenityIcon = (amenity: string): React.ReactNode => {
    switch (amenity.trim().toLowerCase()) {
      case 'wifi':
        return <Wifi className="h-4 w-4 mr-1" />;
      case 'coffee':
      case 'refreshments':
        return <Coffee className="h-4 w-4 mr-1" />;
      default:
        return <Tag className="h-4 w-4 mr-1" />;
    }
  };
  
  return (
    <div className="flex flex-col items-center min-h-screen p-4">
      <div className="w-full max-w-6xl">
        <div className="flex justify-between items-center mb-6">
          <Button variant="ghost" onClick={() => navigate("/venues")}>
            <ChevronsLeft className="mr-2 h-4 w-4" />
            Back to Venues
          </Button>
          {!isAdmin && (
            <Button onClick={() => setIsBookingModalOpen(true)}>
              <Calendar className="mr-2 h-4 w-4" />
              Book This Venue
            </Button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Card>
              {venue.image && (
                <div className="h-64 overflow-hidden">
                  <img
                    src={venue.image}
                    alt={venue.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-3xl">{venue.name}</CardTitle>
                <CardDescription className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  {venue.address}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Description</h3>
                    <p className="text-muted-foreground">
                      {venue.description || "No description available."}
                    </p>
                  </div>
                  
                  {amenities.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Amenities</h3>
                      <div className="flex flex-wrap gap-2">
                        {amenities.map((amenity: string, index: number) => (
                          <Badge 
                            key={index} 
                            variant="secondary"
                            className="flex items-center px-3 py-1"
                          >
                            {getAmenityIcon(amenity)}
                            {amenity.trim()}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Venue Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-muted-foreground">
                      <Users className="h-5 w-5 mr-2" />
                      Capacity
                    </div>
                    <span className="font-medium">{venue.capacity} people</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-muted-foreground">
                      <DollarSign className="h-5 w-5 mr-2" />
                      Price per hour
                    </div>
                    <span className="font-medium">${venue.price}</span>
                  </div>
                  
                  {!isAdmin && (
                    <Button 
                      className="w-full mt-4" 
                      onClick={() => setIsBookingModalOpen(true)}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      Book Now
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Booking Modal */}
      {venue && (
        <BookVenueModal
          venue={venue}
          isOpen={isBookingModalOpen}
          onClose={() => setIsBookingModalOpen(false)}
        />
      )}
    </div>
  );
}