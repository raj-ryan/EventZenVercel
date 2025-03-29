import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

// Props for the component
interface BookEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: any; // This would ideally be strongly typed to match your event schema
}

export default function BookEventModal({ isOpen, onClose, event }: BookEventModalProps) {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState("credit_card");
  const [isBookingComplete, setIsBookingComplete] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  
  // Booking mutation
  const bookingMutation = useMutation({
    mutationFn: async (bookingData: any) => {
      // Ensure eventId is a number
      const eventId = typeof event.id === 'string' ? parseInt(event.id) : event.id;
      
      const totalAmount = event.price * quantity;
      
      const finalBookingData = {
        eventId: eventId,
        ticketCount: quantity,
        paymentMethod,
        status: "pending",
        paymentStatus: "pending",
        bookingDate: new Date().toISOString(),
        totalAmount: totalAmount,
        // Make sure venueId is explicitly null to ensure it appears in event bookings
        venueId: null
      };
      
      console.log("Submitting booking with data:", finalBookingData);
      
      // Use direct API path to ensure server routing
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(finalBookingData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Booking error response:', errorText);
        throw new Error(`Booking failed: ${response.status} ${errorText}`);
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      // Invalidate the relevant queries
      queryClient.invalidateQueries({ queryKey: ['/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/events', event.id] });
      
      setIsProcessingPayment(false);
      setIsBookingComplete(true);
      
      toast({
        title: "Booking successful!",
        description: `You've booked ${quantity} ticket${quantity > 1 ? 's' : ''} for ${event.name}`,
      });
    },
    onError: (error) => {
      setIsProcessingPayment(false);
      console.error("Booking error:", error);
      
      toast({
        title: "Booking failed",
        description: "There was an error processing your booking. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsProcessingPayment(true);
    
    // Ensure eventId is a number
    const eventId = typeof event.id === 'string' ? parseInt(event.id) : event.id;
    
    const bookingData = {
      eventId: eventId,
      ticketCount: quantity,
      paymentMethod,
      status: "pending",
      paymentStatus: "pending",
      bookingDate: new Date().toISOString(),
      // Make sure venueId is explicitly null to ensure it appears in event bookings, not venue bookings
      venueId: null
    };
    
    console.log("Submitting booking with data:", bookingData);
    bookingMutation.mutate(bookingData);
  };
  
  // Handle closing the modal (reset state)
  const handleClose = () => {
    if (!isProcessingPayment) {
      onClose();
      
      // Reset the form state if modal is closed
      setTimeout(() => {
        setQuantity(1);
        setPaymentMethod("credit_card");
        setIsBookingComplete(false);
      }, 300);
    }
  };
  
  // Navigate to bookings page after successful booking
  const viewBookings = () => {
    onClose();
    navigate("/bookings");
  };
  
  // Calculate total cost
  const totalCost = event?.price * quantity;
  
  // Check if soldOut or event is not upcoming
  const isSoldOut = event ? (event.capacity - event.attendees.count) === 0 : false;
  const isBookable = event ? event.status === 'upcoming' : false;
  
  // Render the booking confirmation content
  const renderBookingConfirmation = () => (
    <div className="flex flex-col items-center text-center py-6">
      <CheckCircle2 className="h-16 w-16 text-green-500 mb-6" />
      <h3 className="text-2xl font-bold mb-2">Booking Confirmed!</h3>
      <p className="text-muted-foreground mb-6">
        Thank you for booking tickets to {event?.name}. We've sent a confirmation email with all the details.
      </p>
      <div className="grid grid-cols-2 gap-4 w-full mb-8">
        <div className="text-left">
          <p className="text-sm font-medium text-muted-foreground">Event</p>
          <p className="font-semibold">{event?.name}</p>
        </div>
        <div className="text-left">
          <p className="text-sm font-medium text-muted-foreground">Date</p>
          <p className="font-semibold">{format(new Date(event?.date), "PPP")}</p>
        </div>
        <div className="text-left">
          <p className="text-sm font-medium text-muted-foreground">Location</p>
          <p className="font-semibold">{event?.venue.name}</p>
        </div>
        <div className="text-left">
          <p className="text-sm font-medium text-muted-foreground">Tickets</p>
          <p className="font-semibold">{quantity} x ${event?.price.toFixed(2)}</p>
        </div>
      </div>
      <Button onClick={viewBookings}>View My Bookings</Button>
    </div>
  );
  
  // Render the booking form content
  const renderBookingForm = () => (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4 py-4">
        {!isBookable && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded flex items-start mb-4">
            <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">This event is no longer available for booking</p>
              <p className="text-sm">The event has {event?.status === 'completed' ? 'already ended' : 
                event?.status === 'cancelled' ? 'been cancelled' : 'started'}.</p>
            </div>
          </div>
        )}
        
        {isSoldOut && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded flex items-start mb-4">
            <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Sold Out</p>
              <p className="text-sm">This event has reached its maximum capacity.</p>
            </div>
          </div>
        )}
        
        <div className="space-y-2">
          <Label htmlFor="event-name">Event</Label>
          <Input id="event-name" value={event?.name} disabled />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="event-date">Date</Label>
            <Input 
              id="event-date" 
              value={event?.date ? format(new Date(event.date), "PPP") : ""} 
              disabled 
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="event-price">Price</Label>
            <Input 
              id="event-price" 
              value={`$${event?.price.toFixed(2)} per ticket`} 
              disabled 
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="ticket-quantity">Number of Tickets</Label>
          <div className="flex flex-row h-10 w-32 rounded-md border border-input overflow-hidden">
            <button 
              type="button"
              className="px-3 text-lg font-medium hover:bg-muted transition-colors"
              onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
              disabled={isSoldOut || !isBookable}
            >
              -
            </button>
            <div className="flex-1 flex items-center justify-center font-medium">
              {quantity}
            </div>
            <button 
              type="button"
              className="px-3 text-lg font-medium hover:bg-muted transition-colors"
              onClick={() => setQuantity(prev => Math.min(event?.capacity - event?.attendees.count || 10, prev + 1))}
              disabled={isSoldOut || !isBookable}
            >
              +
            </button>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="payment-method">Payment Method</Label>
          <Select 
            defaultValue={paymentMethod} 
            onValueChange={setPaymentMethod}
            disabled={isSoldOut || !isBookable}
          >
            <SelectTrigger id="payment-method">
              <SelectValue placeholder="Select payment method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="credit_card">Credit Card</SelectItem>
              <SelectItem value="paypal">PayPal</SelectItem>
              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="pt-2">
          <div className="flex justify-between font-medium">
            <span>Total:</span>
            <span>${totalCost.toFixed(2)}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            All prices include taxes and fees
          </p>
        </div>
      </div>
      
      <DialogFooter>
        <Button 
          variant="outline" 
          onClick={handleClose}
          disabled={isProcessingPayment}
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={quantity < 1 || isSoldOut || !isBookable || isProcessingPayment}
        >
          {isProcessingPayment ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            'Confirm Booking'
          )}
        </Button>
      </DialogFooter>
    </form>
  );
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isBookingComplete ? 'Booking Confirmed' : 'Book Event'}
          </DialogTitle>
          <DialogDescription>
            {isBookingComplete 
              ? 'Your booking has been confirmed. See details below.'
              : 'Complete the form below to book your tickets.'}
          </DialogDescription>
        </DialogHeader>
        
        {isBookingComplete 
          ? renderBookingConfirmation() 
          : renderBookingForm()}
      </DialogContent>
    </Dialog>
  );
}