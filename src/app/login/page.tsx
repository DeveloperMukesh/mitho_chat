
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from "lucide-react";

const MithoChatLogo = () => (
    <div className="flex items-center gap-2">
      <svg
        role="img"
        aria-label="Mitho Chat logo"
        className="h-8 w-8 text-primary"
        viewBox="0 0 256 256"
        xmlns="http://www.w3.org/2000/svg"
        fill="currentColor"
      >
        <path d="M164.7,40.15a112.1,112.1,0,0,0-144.57,36.1,12,12,0,0,0,16.5,17.4A88.11,88.11,0,0,1,128,64a87.48,87.48,0,0,1,34.8-7.5,12,12,0,0,0,1.9-23.85Z" />
        <path d="M224,128a96,96,0,0,1-91.4,95.89,12,12,0,0,0,2.83-23.86A72,72,0,0,0,136,68.9a12,12,0,1,0-23.84-2.8A96.11,96.11,0,0,1,32,128,95.42,95.42,0,0,1,55.88,51.84a12,12,0,1,0-17.4-16.5A120,120,0,0,0,128,248a120.13,120.13,0,0,0,120-112,12,12,0,0,0-24,0Z" />
      </svg>
      <h1 className="font-headline text-2xl font-bold tracking-tight text-foreground">
        Mitho Chat
      </h1>
    </div>
  );

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px" {...props}>
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C39.904,36.36,44,30.659,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
    </svg>
);


const loginSchema = z.object({
    email: z.string().email({ message: "Please enter a valid email address." }),
    password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

type LoginFormValues = z.infer<typeof loginSchema>;


export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSignUp, setIsSignUp] = React.useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  React.useEffect(() => {
    if (!loading && user) {
      router.push("/");
    }
  }, [user, loading, router]);


  const handleEmailAuth = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    try {
        if (isSignUp) {
            const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
            await sendEmailVerification(userCredential.user);
            toast({
                title: "Verification Email Sent!",
                description: "Please check your inbox to verify your email address.",
            });
            // The user is technically logged in, so they will be redirected by the useEffect
        } else {
            await signInWithEmailAndPassword(auth, data.email, data.password);
        }
        // The useEffect will handle the redirect
    } catch (error: any) {
        console.error("Error with email auth:", error);
        toast({
            title: isSignUp ? "Sign-up Failed" : "Sign-in Failed",
            description: error.message,
            variant: "destructive",
        });
    } finally {
        setIsSubmitting(false);
    }
  }


  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // The useEffect above will handle the redirect
    } catch (error) {
      console.error("Error signing in with Google: ", error);
      toast({
        title: "Sign-in Failed",
        description: "Could not sign in with Google. Please try again.",
        variant: "destructive",
      });
    } finally {
        setIsSubmitting(false);
    }
  };

  if (loading || (!loading && user)) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
          <MithoChatLogo />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
                <MithoChatLogo />
            </div>
          <CardTitle className="font-headline">{isSignUp ? 'Create an Account' : 'Welcome Back!'}</CardTitle>
          <CardDescription>{isSignUp ? 'Enter your details to get started.' : 'Sign in to continue to Mitho Chat.'}</CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleEmailAuth)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                    <Input type="email" placeholder="you@example.com" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Password</FormLabel>
                                <FormControl>
                                    <Input type="password" placeholder="••••••••" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isSignUp ? 'Sign Up' : 'Sign In'}
                    </Button>
                </form>
            </Form>

            <div className="mt-4 text-center text-sm">
                {isSignUp ? (
                    <>
                        Already have an account?{' '}
                        <Button variant="link" className="p-0 h-auto" onClick={() => setIsSignUp(false)}>
                            Sign In
                        </Button>
                    </>
                ) : (
                    <>
                        Don't have an account?{' '}
                        <Button variant="link" className="p-0 h-auto" onClick={() => setIsSignUp(true)}>
                            Sign Up
                        </Button>
                    </>
                )}
            </div>

            <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                    <Separator />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                        Or continue with
                    </span>
                </div>
            </div>
           
            <Button
                onClick={handleGoogleSignIn}
                variant="outline"
                className="w-full"
                disabled={isSubmitting}
            >
              <GoogleIcon className="mr-2" />
              {isSubmitting ? 'Signing in...' : 'Continue with Google'}
            </Button>
          
        </CardContent>
      </Card>
    </div>
  );
}

    