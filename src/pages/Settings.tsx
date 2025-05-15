
import { useState } from 'react';
import Layout from '../components/layout/Layout';
import PracticeTab from '@/components/settings/PracticeTab';
import BillingTab from '@/components/settings/BillingTab';
import TemplatesTab from '@/components/settings/TemplatesTab';
import SecurityTab from '@/components/settings/SecurityTab';
import LicensesTab from '@/components/settings/LicensesTab';

const SettingsTabs = {
  PRACTICE: 'practice',
  BILLING: 'billing',
  TEMPLATES: 'templates',
  SECURITY: 'security',
  LICENSES: 'licenses'
};

const Settings = () => {
  const [activeTab, setActiveTab] = useState(SettingsTabs.PRACTICE);
  
  return (
    <Layout>
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="flex border-b">
          <button 
            className={`settings-tab ${activeTab === SettingsTabs.PRACTICE ? 'active' : ''}`}
            onClick={() => setActiveTab(SettingsTabs.PRACTICE)}
          >
            Practice
          </button>
          <button 
            className={`settings-tab ${activeTab === SettingsTabs.BILLING ? 'active' : ''}`}
            onClick={() => setActiveTab(SettingsTabs.BILLING)}
          >
            Billing
          </button>
          <button 
            className={`settings-tab ${activeTab === SettingsTabs.TEMPLATES ? 'active' : ''}`}
            onClick={() => setActiveTab(SettingsTabs.TEMPLATES)}
          >
            Templates
          </button>
          <button 
            className={`settings-tab ${activeTab === SettingsTabs.SECURITY ? 'active' : ''}`}
            onClick={() => setActiveTab(SettingsTabs.SECURITY)}
          >
            Security
          </button>
          <button 
            className={`settings-tab ${activeTab === SettingsTabs.LICENSES ? 'active' : ''}`}
            onClick={() => setActiveTab(SettingsTabs.LICENSES)}
          >
            Licenses
          </button>
        </div>
        
        {activeTab === SettingsTabs.PRACTICE && <PracticeTab />}
        {activeTab === SettingsTabs.BILLING && <BillingTab />}
        {activeTab === SettingsTabs.TEMPLATES && <TemplatesTab />}
        {activeTab === SettingsTabs.SECURITY && <SecurityTab />}
        {activeTab === SettingsTabs.LICENSES && <LicensesTab />}
      </div>
    </Layout>
  );
};

export default Settings;
