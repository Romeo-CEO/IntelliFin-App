import { Suspense } from 'react';
import { LoginForm } from '../../../components/auth/LoginForm';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">IntelliFin</h1>
          <p className="mt-2 text-sm text-gray-600">
            Financial Management for Zambian SMEs
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Suspense fallback={
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        }>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
