"use client";

import React from 'react';

const EnvCheck = () => {
  const checkEnvironment = () => {
    console.log('=== Environment Check ===');
    console.log('NEXT_PUBLIC_VAPI_WEB_TOKEN:', process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN ? 'Set' : 'Not Set');
    console.log('NEXT_PUBLIC_VAPI_WORKFLOW_ID:', process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID ? 'Set' : 'Not Set');
    
    if (process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN) {
      console.log('Token preview:', process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN.substring(0, 10) + '...');
    }
    
    console.log('All VAPI env vars:', Object.keys(process.env).filter(key => key.includes('VAPI')));
    console.log('========================');
  };

  React.useEffect(() => {
    checkEnvironment();
  }, []);

  return (
    <div className="p-4 rounded mb-4">
      <h4 className="font-bold mb-2">Environment Status</h4>
      <div className="space-y-2 text-sm">
        <div>
          <span className="font-medium">VAPI Token: </span>
          <span className={process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN ? 'text-green-600' : 'text-red-600'}>
            {process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN ? '✓ Set' : '✗ Not Set'}
          </span>
        </div>
        <div>
          <span className="font-medium">Workflow ID: </span>
          <span className={process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID ? 'text-green-600' : 'text-red-600'}>
            {process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID ? '✓ Set' : '✗ Not Set'}
          </span>
        </div>
        <button 
          onClick={checkEnvironment}
          className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-xs"
        >
          Check Console
        </button>
      </div>
    </div>
  );
};

export default EnvCheck;