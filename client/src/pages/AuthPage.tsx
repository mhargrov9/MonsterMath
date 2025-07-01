import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const authMutation = useMutation({
    mutationFn: (credentials: any) => {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      return apiRequest(endpoint, {
        method: 'POST',
        data: credentials,
      });
    },
    onSuccess: async (response, variables) => {
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error.message || 'An error occurred');
      }

      toast({
        title: isLogin ? 'Login Successful' : 'Registration Successful',
        description: isLogin ? 'Welcome back!' : 'Please log in to continue.',
      });
      
      if(isLogin) {
        // Invalidate the user query to trigger a re-fetch and update the auth state
        await queryClient.invalidateQueries({ queryKey: ['/api/v1/auth/user'] });
      } else {
        // If registration is successful, switch to the login view
        setIsLogin(true);
        setUsername(variables.username);
        setEmail('');
        setPassword('');
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Authentication Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const credentials = isLogin ? { username, password } : { username, email, password };
    authMutation.mutate(credentials);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      <Card className="w-[350px] bg-gray-800 border-gray-700">
        <CardHeader className="text-center">
          <CardTitle>{isLogin ? 'Welcome Back!' : 'Create an Account'}</CardTitle>
          <CardDescription>
            {isLogin ? 'Log in to access your monsters.' : 'Join the Monster Academy.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <Input 
                  id="username" 
                  placeholder="Your username" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required 
                />
              </div>
              {!isLogin && (
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email"
                    placeholder="Your email address" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              )}
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="Your password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button className="w-full mt-6" type="submit" disabled={authMutation.isPending}>
              {authMutation.isPending ? 'Processing...' : (isLogin ? 'Log In' : 'Register')}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}
            <Button variant="link" onClick={() => setIsLogin(!isLogin)} className="ml-1">
              {isLogin ? 'Register' : 'Log In'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}