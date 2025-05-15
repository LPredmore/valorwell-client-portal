import React, { useEffect, useState } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { checkRequiredDocumentsCompletion } from '@/utils/documentAssignmentUtils';
import { useUser } from '@/context/UserContext';
import { useNavigate } from 'react-router-dom';

const PatientDashboard = () => {
  const { userId } = useUser();
  const navigate = useNavigate();
  const [documentsCompleted, setDocumentsCompleted] = useState(true);
  const [missingDocuments, setMissingDocuments] = useState<string[]>([]);

  useEffect(() => {
    // Check for required document completion
    if (userId) {
      checkRequiredDocumentsCompletion(userId).then(result => {
        setDocumentsCompleted(result.allCompleted);
        setMissingDocuments(result.missingDocuments);
      });
    }
  }, [userId]);

  const handleGoToDocuments = () => {
    navigate('/patient-documents');
  };

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Patient Dashboard</h1>
        </div>

        {!documentsCompleted && missingDocuments.length > 0 && (
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4">
                <h2 className="text-lg font-medium text-amber-800">Document Action Required</h2>
                <p className="text-amber-700">
                  Please complete the following required documents:
                </p>
                <ul className="list-disc pl-5 text-amber-700">
                  {missingDocuments.map((doc, index) => (
                    <li key={index}>{doc}</li>
                  ))}
                </ul>
                <div className="flex justify-end">
                  <button
                    onClick={handleGoToDocuments}
                    className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700"
                  >
                    Go to Documents
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Add other dashboard components here */}
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Welcome to Your Dashboard</h2>
            <p className="text-gray-600 max-w-md">
              From here, you can manage your appointments, view your documents, and connect with your care team.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default PatientDashboard;
