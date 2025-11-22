// src/components/DetailedCarbonSurvey.tsx
'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from './ui/separator';

type SurveyData = Record<string, any>;

interface Props {
  onSubmit: (data: SurveyData) => void;
}

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h2 className="text-xl font-semibold text-primary mt-6 mb-3 pb-2 border-b-2 border-primary/20">{children}</h2>
);

const Question = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="space-y-2 mb-4">
        <Label className="font-medium text-base">{label}</Label>
        {children}
    </div>
);

export function DetailedCarbonSurvey({ onSubmit }: Props) {
  const [data, setData] = useState<SurveyData>({});

  const handleChange = (section: string, key: string, value: any) => {
    setData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  const handleCheckboxChange = (section: string, key: string, item: string, checked: boolean) => {
    const current = data[section]?.[key] || [];
    const newItems = checked ? [...current, item] : current.filter((i: string) => i !== item);
    handleChange(section, key, newItems);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-3xl font-bold">Detailed Carbon Footprint Questionnaire</CardTitle>
        <CardDescription>Your answers will help us provide personalized feedback. Please be as accurate as possible.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Section 1: Food and Diet */}
          <div>
            <SectionTitle>1. Food and Diet</SectionTitle>
            <Question label="1. What is your primary diet type?">
              <RadioGroup onValueChange={(v) => handleChange('food', 'primary_diet', v)} value={data.food?.primary_diet}>
                {['Vegan', 'Vegetarian', 'Pescatarian', 'Flexitarian', 'Regular (meat daily)'].map(opt => (
                  <div key={opt} className="flex items-center space-x-2">
                    <RadioGroupItem value={opt} id={`diet-${opt}`} />
                    <Label htmlFor={`diet-${opt}`}>{opt}</Label>
                  </div>
                ))}
              </RadioGroup>
            </Question>
            <Question label="2. How many meat-based meals do you eat per week?"><Input type="number" onChange={(e) => handleChange('food', 'meat_meals_per_week', e.target.value)} /></Question>
            <Question label="3. How often do you consume dairy products? (e.g., daily, few times a week)"><Input onChange={(e) => handleChange('food', 'dairy_consumption', e.target.value)} /></Question>
            <Question label="4. How many servings of fruits/vegetables per day?"><Input type="number" onChange={(e) => handleChange('food', 'fruit_veg_servings', e.target.value)} /></Question>
            <Question label="5. How frequently do you eat processed or packaged foods?"><Input onChange={(e) => handleChange('food', 'processed_foods', e.target.value)} /></Question>
            <Question label="6. Do you usually buy local or imported foods?"><Input placeholder="e.g., mostly local, 50/50, mostly imported" onChange={(e) => handleChange('food', 'local_vs_imported', e.target.value)} /></Question>
            <Question label="7. How often do you eat at restaurants or order delivery?"><Input placeholder="e.g., 3 times a week" onChange={(e) => handleChange('food', 'restaurant_frequency', e.target.value)} /></Question>
            <Question label="8. When grocery shopping, which apply to you?">
                <div className="space-y-2">
                    {['Prefer organic products', 'Avoid plastic packaging', 'Buy in bulk'].map(opt => (
                        <div key={opt} className="flex items-center space-x-2">
                            <Checkbox id={`shop-${opt}`} onCheckedChange={(c) => handleCheckboxChange('food', 'shopping_habits', opt, !!c)} />
                            <Label htmlFor={`shop-${opt}`}>{opt}</Label>
                        </div>
                    ))}
                </div>
            </Question>
            <Question label="9. Do you waste food regularly? How many portions/week?"><Input onChange={(e) => handleChange('food', 'food_waste', e.target.value)} /></Question>
            <Question label="10. What did you eat today?"><Textarea placeholder="A brief summary..." onChange={(e) => handleChange('food', 'eaten_today', e.target.value)} /></Question>
          </div>

          <Separator />

          {/* Section 2: Transportation & Mobility */}
          <div>
            <SectionTitle>2. Transportation & Mobility</SectionTitle>
            <Question label="1. What is your primary transportation mode?">
              <RadioGroup onValueChange={(v) => handleChange('transport', 'primary_mode', v)} value={data.transport?.primary_mode}>
                {['Car', 'Public transport', 'Bike', 'Walking', 'Ride share', 'E-scooter'].map(opt => (
                  <div key={opt} className="flex items-center space-x-2">
                    <RadioGroupItem value={opt} id={`trans-${opt}`} />
                    <Label htmlFor={`trans-${opt}`}>{opt}</Label>
                  </div>
                ))}
              </RadioGroup>
            </Question>
            {data.transport?.primary_mode === 'Car' && (
                <div className="ml-6 mt-4 space-y-4 p-4 border rounded-md bg-muted/50">
                    <Question label="Car Type:"><Input placeholder="Petrol / Diesel / Hybrid / Electric" onChange={(e) => handleChange('transport', 'car_type', e.target.value)} /></Question>
                    <Question label="Fuel efficiency (e.g., L/100km or MPG):"><Input onChange={(e) => handleChange('transport', 'car_efficiency', e.target.value)} /></Question>
                    <Question label="Weekly km driven:"><Input type="number" onChange={(e) => handleChange('transport', 'car_weekly_km', e.target.value)} /></Question>
                </div>
            )}
            <Question label="3. Daily commute length (one way, in km)?"><Input type="number" onChange={(e) => handleChange('transport', 'commute_length_km', e.target.value)} /></Question>
            <Question label="4. How often do you use public transportation?"><Input placeholder="e.g., daily, never, for long trips" onChange={(e) => handleChange('transport', 'public_transport_frequency', e.target.value)} /></Question>
            <Question label="5. Flights taken in last 12 months (domestic/short-haul/long-haul)?"><Input placeholder="e.g., 2 domestic, 1 long-haul" onChange={(e) => handleChange('transport', 'flights_last_year', e.target.value)} /></Question>
            <Question label="6. How often do you use ride-hailing services?"><Input onChange={(e) => handleChange('transport', an'ride_hailing_frequency', e.target.value)} /></Question>
            <Question label="7. Do you idle your car frequently? (e.g., waiting with engine on)"><Input placeholder="Yes/No/Sometimes" onChange={(e) => handleChange('transport', 'car_idling', e.target.value)} /></Question>
            <Question label="8. How often do you walk or cycle instead of driving?"><Input onChange={(e) => handleChange('transport', 'walk_cycle_frequency', e.target.value)} /></Question>
            <Question label="9. Do you usually carry passengers?"><Input placeholder="Yes/No, and how many on average" onChange={(e) => handleChange('transport', 'carpooling_frequency', e.target.value)} /></Question>
            <Question label="10. GPS question: How long was your last trip and what was your average speed?"><Input placeholder="e.g., 30 minutes, 50 km/h" onChange={(e) => handleChange('transport', 'last_trip_gps', e.target.value)} /></Question>
          </div>
          
          <Separator />

           {/* Section 3: Home Energy Usage */}
          <div>
            <SectionTitle>3. Home Energy Usage</SectionTitle>
            <Question label="1. Home type:"><Input placeholder="Apartment / Villa / Shared house / Dorm" onChange={(e) => handleChange('energy', 'home_type', e.target.value)} /></Question>
            <Question label="2. People living in home:"><Input type="number" onChange={(e) => handleChange('energy', 'home_occupants', e.target.value)} /></Question>
            <Question label="3. Monthly electricity use (kWh):"><Input type="number" placeholder="If you know it" onChange={(e) => handleChange('energy', 'monthly_kwh', e.target.value)} /></Question>
            <Question label="4. Heating type:"><Input placeholder="Natural gas / Electricity / Oil / None" onChange={(e) => handleChange('energy', 'heating_type', e.target.value)} /></Question>
            <Question label="5. Do you have air conditioning?"><Input placeholder="Yes/No" onChange={(e) => handleChange('energy', 'has_ac', e.target.value)} /></Question>
            <Question label="6. AC daily usage duration (hours):"><Input type="number" onChange={(e) => handleChange('energy', 'ac_daily_hours', e.target.value)} /></Question>
            <Question label="7. Water heating type:"><Input placeholder="Electric / Gas / Solar" onChange={(e) => handleChange('energy', 'water_heater_type', e.target.value)} /></Question>
            <Question label="8. Do you use renewable energy?"><Input placeholder="e.g., Solar panels, green electricity plan" onChange={(e) => handleChange('energy', 'renewable_energy', e.target.value)} /></Question>
            <Question label="9. Do you use energy-efficient appliances?"><Input placeholder="Yes, some, no" onChange={(e) => handleChange('energy', 'efficient_appliances', e.target.value)} /></Question>
            <Question label="10. How often do you leave lights/electronics on?"><Input placeholder="Rarely, sometimes, often" onChange={(e) => handleChange('energy', 'lights_on_frequency', e.target.value)} /></Question>
            <Question label="11. Do you use a smart thermostat or monitoring system?"><Input placeholder="Yes/No" onChange={(e) => handleChange('energy', 'smart_thermostat', e.target.value)} /></Question>
          </div>

          <Separator />

          {/* Section 4: Shopping & Consumption */}
          <div>
            <SectionTitle>4. Shopping & Consumption</SectionTitle>
            <Question label="1. How often do you buy new clothes monthly?"><Input placeholder="e.g., 0, 1-2 items, 5+ items" onChange={(e) => handleChange('shopping', 'clothes_monthly', e.target.value)} /></Question>
            <Question label="2. Clothing type:"><Input placeholder="Fast fashion / Sustainable / Second-hand" onChange={(e) => handleChange('shopping', 'clothing_type', e.target.value)} /></Question>
            <Question label="3. Electronics purchased in past year?"><Input placeholder="e.g., Phone, laptop" onChange={(e) => handleChange('shopping', 'electronics_purchased', e.target.value)} /></Question>
            <Question label="4. Do you recycle e-waste?"><Input placeholder="Yes/No/Where?" onChange={(e) => handleChange('shopping', 'ewaste_recycling', e.target.value)} /></Question>
            <Question label="5. How often do you buy household items?"><Input onChange={(e) => handleChange('shopping', 'household_items_frequency', e.target.value)} /></Question>
            <Question label="6. % Online vs in-store shopping:"><Input placeholder="e.g., 80% online" onChange={(e) => handleChange('shopping', 'online_vs_instore', e.target.value)} /></Question>
            <Question label="7. Do you check environmental ratings before buying?"><Input placeholder="Always, sometimes, never" onChange={(e) => handleChange('shopping', 'check_ratings', e.target.value)} /></Question>
            <Question label="8. Weekly waste (in trash bags)?"><Input type="number" onChange={(e) => handleChange('shopping', 'weekly_waste_bags', e.target.value)} /></Question>
             <Question label="9. Which materials do you recycle?">
                 <div className="space-y-2">
                    {['Plastic', 'Paper', 'Glass', 'Metal', 'Food waste'].map(opt => (
                        <div key={opt} className="flex items-center space-x-2">
                            <Checkbox id={`recycle-${opt}`} onCheckedChange={(c) => handleCheckboxChange('shopping', 'recycling_habits', opt, !!c)} />
                            <Label htmlFor={`recycle-${opt}`}>{opt}</Label>
                        </div>
                    ))}
                 </div>
            </Question>
            <Question label="10. Do you use reusable bags, bottles, containers?"><Input placeholder="Yes, trying to, no" onChange={(e) => handleChange('shopping', 'reusables_usage', e.target.value)} /></Question>
          </div>

          <Separator />

          {/* Section 5: Water Usage */}
          <div>
              <SectionTitle>5. Water Usage</SectionTitle>
              <Question label="1. Average shower duration (minutes):"><Input type="number" onChange={(e) => handleChange('water', 'shower_duration_minutes', e.target.value)} /></Question>
              <Question label="2. Water-saving taps or showerheads?"><Input placeholder="Yes/No" onChange={(e) => handleChange('water', 'water_saving_fixtures', e.target.value)} /></Question>
              <Question label="3. Full or half-load washing/dishwasher?"><Input placeholder="Always full, mostly half" onChange={(e) => handleChange('water', 'laundry_load_size', e.target.value)} /></Question>
              <Question label="4. Do you water garden/plants regularly?"><Input placeholder="Yes/No, how often" onChange={(e) => handleChange('water', 'garden_watering', e.target.value)} /></Question>
          </div>

          <Separator />

          {/* Section 6: Lifestyle */}
          <div>
              <SectionTitle>6. Lifestyle & Time-Based Carbon Measurement</SectionTitle>
              <Question label="1. Weekly hours driving:"><Input type="number" onChange={(e) => handleChange('lifestyle', 'weekly_driving_hours', e.target.value)} /></Question>
              <Question label="2. Hours cooking per day:"><Input type="number" onChange={(e) => handleChange('lifestyle', 'daily_cooking_hours', e.target.value)} /></Question>
              <Question label="3. Daily AC run time (hours):"><Input type="number" onChange={(e) => handleChange('lifestyle', 'daily_ac_hours', e.target.value)} /></Question>
              <Question label="4. Use frequency of energy-intensive appliances (dryer, oven, water heater):"><Input placeholder="e.g., Dryer twice a week" onChange={(e) => handleChange('lifestyle', 'appliance_frequency', e.target.value)} /></Question>
              <Question label="5. Daily device/gaming time (hours):"><Input type="number" onChange={(e) => handleChange('lifestyle', 'daily_device_hours', e.target.value)} /></Question>
              <Question label="6. Laundry loads per week:"><Input type="number" onChange={(e) => handleChange('lifestyle', 'laundry_loads_week', e.target.value)} /></Question>
          </div>

        </form>
      </CardContent>
      <CardFooter>
        <Button type="submit" onClick={handleSubmit} size="lg" className="w-full">
          Calculate My Footprint
        </Button>
      </CardFooter>
    </Card>
  );
}
