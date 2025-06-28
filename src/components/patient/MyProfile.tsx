
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Save, Edit } from 'lucide-react';
import { Form } from '@/components/ui/form';
import FormFieldWrapper from '@/components/ui/FormFieldWrapper';

interface TimeZoneOption {
  value: string;
  label: string;
}

interface MyProfileProps {
  clientData: any | null;
  loading: boolean;
  isEditing: boolean;
  setIsEditing: (isEditing: boolean) => void;
  form: any;
  isSaving: boolean;
  handleSaveProfile: () => Promise<void>;
  handleCancelEdit: () => void;
  genderOptions: string[];
  genderIdentityOptions: string[];
  stateOptions: string[];
  timeZoneOptions: TimeZoneOption[];
}

const MyProfile: React.FC<MyProfileProps> = ({
  clientData,
  loading,
  isEditing,
  setIsEditing,
  form,
  isSaving,
  handleSaveProfile,
  handleCancelEdit,
  genderOptions,
  genderIdentityOptions,
  stateOptions,
  timeZoneOptions
}) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-2xl">
            {loading ? 'Loading...' :
            clientData ? `${clientData.client_first_name || ''} ${clientData.client_last_name || ''}` : 'Profile'}
          </CardTitle>
          <CardDescription>
            {loading ? 'Loading...' : clientData?.client_email || 'Your personal information'}
          </CardDescription>
        </div>
        {isEditing ? (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
              onClick={handleCancelEdit}
              disabled={isSaving}
              type="button"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              className="flex items-center gap-1"
              onClick={handleSaveProfile}
              disabled={isSaving}
              type="button"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
            onClick={() => setIsEditing(true)}
            type="button"
          >
            <Edit className="h-4 w-4" />
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="mt-6">
          <h3 className="text-xl font-semibold mb-4">Personal Information</h3>

          {loading ? (
            <div className="flex justify-center py-8">
              <p>Loading your profile data...</p>
            </div>
          ) : (
            <Form {...form}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormFieldWrapper
                  control={form.control}
                  name="firstName"
                  label="First Name"
                  readOnly={true}
                />

                <FormFieldWrapper
                  control={form.control}
                  name="lastName"
                  label="Last Name"
                  readOnly={true}
                />

                <FormFieldWrapper
                  control={form.control}
                  name="preferredName"
                  label="Preferred Name"
                  readOnly={!isEditing}
                />

                <FormFieldWrapper
                  control={form.control}
                  name="email"
                  label="Email"
                  type="email"
                  readOnly={true}
                />

                <FormFieldWrapper
                  control={form.control}
                  name="phone"
                  label="Phone"
                  type="tel"
                  readOnly={!isEditing}
                />

                <FormFieldWrapper
                  control={form.control}
                  name="dateOfBirth"
                  label="Date of Birth"
                  readOnly={true}
                />

                <FormFieldWrapper
                  control={form.control}
                  name="age"
                  label="Age"
                  readOnly={true}
                />

                {/* Address fields */}
                <FormFieldWrapper
                  control={form.control}
                  name="address"
                  label="Street Address"
                  readOnly={!isEditing}
                />

                <FormFieldWrapper
                  control={form.control}
                  name="city"
                  label="City"
                  readOnly={!isEditing}
                />

                <FormFieldWrapper
                  control={form.control}
                  name="state"
                  label="State"
                  type="select"
                  options={stateOptions}
                  readOnly={!isEditing}
                />

                <FormFieldWrapper
                  control={form.control}
                  name="zipCode"
                  label="ZIP Code"
                  readOnly={!isEditing}
                />

                <FormFieldWrapper
                  control={form.control}
                  name="gender"
                  label="Gender"
                  type="select"
                  options={genderOptions}
                  readOnly={!isEditing}
                />

                <FormFieldWrapper
                  control={form.control}
                  name="genderIdentity"
                  label="Gender Identity"
                  type="select"
                  options={genderIdentityOptions}
                  readOnly={!isEditing}
                />

                <FormFieldWrapper
                  control={form.control}
                  name="timeZone"
                  label="Time Zone"
                  type="select"
                  options={timeZoneOptions}
                  readOnly={!isEditing}
                />
              </div>
            </Form>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MyProfile;
