
import NewLayout from '@/components/layout/NewLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const PatientDashboard = () => {
  const navigate = useNavigate();
  
  // Mock data
  const nextAppointment = {
    date: '2025-05-20',
    time: '2:00 PM',
    provider: 'Dr. Emma Johnson'
  };
  
  const unreadMessages = 3;
  const documentsToComplete = 2;

  return (
    <NewLayout>
      <div className="container mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold mb-8">Patient Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Upcoming Appointment */}
          <Card>
            <CardHeader>
              <CardTitle>Next Appointment</CardTitle>
              <CardDescription>Your upcoming therapy session</CardDescription>
            </CardHeader>
            <CardContent>
              {nextAppointment ? (
                <div>
                  <p className="font-semibold">{new Date(nextAppointment.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                  <p className="text-gray-600">{nextAppointment.time} with {nextAppointment.provider}</p>
                  <div className="mt-4">
                    <Button className="w-full">Join Session</Button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-gray-600">No upcoming appointments</p>
                  <div className="mt-4">
                    <Button className="w-full">Schedule Session</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Messages */}
          <Card>
            <CardHeader>
              <CardTitle>Messages</CardTitle>
              <CardDescription>Communication with your provider</CardDescription>
            </CardHeader>
            <CardContent>
              {unreadMessages > 0 ? (
                <div>
                  <p>You have <span className="font-semibold text-blue-600">{unreadMessages} unread messages</span></p>
                  <div className="mt-4">
                    <Button className="w-full" onClick={() => navigate('/messages')}>View Messages</Button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-gray-600">No new messages</p>
                  <div className="mt-4">
                    <Button className="w-full" onClick={() => navigate('/messages')}>Send Message</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Documents */}
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>Forms and documents to review</CardDescription>
            </CardHeader>
            <CardContent>
              {documentsToComplete > 0 ? (
                <div>
                  <p>You have <span className="font-semibold text-amber-600">{documentsToComplete} documents</span> to complete</p>
                  <div className="mt-4">
                    <Button className="w-full" onClick={() => navigate('/patient-documents')}>View Documents</Button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-gray-600">No pending documents</p>
                  <div className="mt-4">
                    <Button className="w-full" onClick={() => navigate('/patient-documents')}>View Documents</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Care Plan</CardTitle>
              <CardDescription>Treatment plan and progress</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p>Your personalized treatment plan is designed to help you manage anxiety and improve mood regulation.</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Practice daily mindfulness meditation (10 minutes)</li>
                  <li>Complete weekly anxiety tracking journal</li>
                  <li>Implement CBT techniques for negative thoughts</li>
                </ul>
                <Button variant="outline" className="w-full mt-2">View Full Plan</Button>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Resources</CardTitle>
              <CardDescription>Helpful materials and exercises</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <h3 className="font-medium">Anxiety Management Worksheet</h3>
                  <p className="text-sm text-gray-600">Tools for managing daily anxiety triggers</p>
                  <Button variant="link" className="p-0 h-auto text-blue-600">Download</Button>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <h3 className="font-medium">Sleep Hygiene Guide</h3>
                  <p className="text-sm text-gray-600">Improve your sleep quality and habits</p>
                  <Button variant="link" className="p-0 h-auto text-blue-600">Download</Button>
                </div>
                <Button variant="outline" className="w-full">View All Resources</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </NewLayout>
  );
};

export default PatientDashboard;
