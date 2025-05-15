
import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

const ClientHistoryTemplate: React.FC = () => {
  const [selectedValue1, setSelectedValue1] = useState("");
  const [selectedValue2, setSelectedValue2] = useState("");

  const handleChange1 = (value: string) => {
    setSelectedValue1(value);
  };

  const handleChange2 = (value: string) => {
    setSelectedValue2(value);
  };

  return (
    <Card className="w-full">
      <CardContent className="space-y-4 p-6">
        <div className="space-y-4">
          <Select
            value={selectedValue1}
            onValueChange={handleChange1}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="option1">Option 1</SelectItem>
              <SelectItem value="option2">Option 2</SelectItem>
              <SelectItem value="option3">Option 3</SelectItem>
            </SelectContent>
          </Select>
          
          <Select
            value={selectedValue2}
            onValueChange={handleChange2}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select another option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="optionA">Option A</SelectItem>
              <SelectItem value="optionB">Option B</SelectItem>
              <SelectItem value="optionC">Option C</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClientHistoryTemplate;
