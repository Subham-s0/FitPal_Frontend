import React, { useState } from 'react';
import { 
  Check, 
  Sparkles,
  Edit,
  DollarSign
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

// Mock Data matching Pricing.tsx
const initialPlans = [
  { 
    id: 1, 
    name: "Basic", 
    price: 999, 
    period: "/month",
    description: "Perfect for beginners starting their fitness journey",
    features: [
      "Access to 50+ gyms",
      "Basic workout plans",
      "QR check-in",
      "Progress tracking",
      "Email support",
    ],
    popular: false
  },
  { 
    id: 2, 
    name: "Pro", 
    price: 1999, 
    period: "/month",
    description: "Most popular choice for serious fitness enthusiasts",
    features: [
      "Access to 300+ gyms",
      "AI-powered personalized plans",
      "QR check-in + priority access",
      "Advanced analytics dashboard",
      "Personal trainer sessions (2/month)",
      "24/7 priority support",
    ],
    popular: true
  },
  { 
    id: 3, 
    name: "Elite", 
    price: 3999, 
    period: "/month",
    description: "Ultimate experience with premium benefits",
    features: [
      "Access to ALL 500+ gyms",
      "Unlimited AI workout plans",
      "VIP gym access & amenities",
      "Unlimited trainer sessions",
      "Nutrition coaching",
      "Dedicated account manager",
      "Free guest passes",
    ],
    popular: false
  },
];

const ManagePlans = () => {
  const [plans, setPlans] = useState(initialPlans);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [newPrice, setNewPrice] = useState("");

  const handleEditClick = (plan: any) => {
    setSelectedPlan(plan);
    setNewPrice(plan.price.toString());
    setIsEditOpen(true);
  };

  const handleSavePrice = () => {
    if (selectedPlan && newPrice) {
      setPlans(plans.map(p => {
        if (p.id === selectedPlan.id) {
          return { ...p, price: parseInt(newPrice) };
        }
        return p;
      }));
      setIsEditOpen(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Manage <span className="text-gradient-fire">Subscription Plans</span></h2>
        <p className="text-gray-400 text-sm">Update pricing and view plan details</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {plans.map((plan, index) => (
          <div
            key={plan.id}
            className={`relative p-8 rounded-3xl transition-all duration-500 hover:-translate-y-2 ${
              plan.popular
                ? "bg-gradient-to-b from-primary/20 to-card border-2 border-primary"
                : "bg-card border border-border/50 hover:border-primary/30"
            }`}
          >
            {/* Popular Badge */}
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-fire flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
                <span className="text-sm font-semibold text-primary-foreground">Most Popular</span>
              </div>
            )}

            {/* Plan Info */}
            <div className="mb-8">
              <h3 className="text-2xl font-bold mb-2 text-white">{plan.name}</h3>
              <p className="text-sm text-muted-foreground mb-6">{plan.description}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-sm text-muted-foreground">NPR</span>
                <span className="text-4xl font-black text-gradient-fire">{plan.price.toLocaleString()}</span>
                <span className="text-muted-foreground">{plan.period}</span>
              </div>
            </div>

            {/* Features */}
            <ul className="space-y-4 mb-8">
              {plan.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="h-3 w-3 text-primary" />
                  </div>
                  <span className="text-sm text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>

            <Button 
              variant={plan.popular ? "fire" : "fireOutline"}
              size="lg"
              className="w-full"
              onClick={() => handleEditClick(plan)}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Pricing
            </Button>
          </div>
        ))}
      </div>

      {/* Edit Price Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-[#111] border-white/10 text-white sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Update Pricing</DialogTitle>
            <DialogDescription className="text-gray-400">
              Set the new monthly price for the <span className="text-white font-bold">{selectedPlan?.name}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="price" className="text-gray-400">Monthly Price (Rs.)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input 
                  id="price" 
                  type="number" 
                  value={newPrice} 
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="pl-9 bg-white/5 border-white/10 focus:border-orange-600 font-mono text-lg" 
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditOpen(false)} className="text-gray-400 hover:text-white hover:bg-white/10">Cancel</Button>
            <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white" onClick={handleSavePrice}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManagePlans;
